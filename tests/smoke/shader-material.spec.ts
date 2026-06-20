import { expect, test, type Page } from '@playwright/test';

interface ShaderCompileSmokeResult {
  compileAsyncUsed: boolean;
  fragmentShaderPath: string;
  materialId: string;
  materialName: string;
  ok: boolean;
  programCount: number | null;
  vertexShaderPath: string;
}

interface DissolveShaderSmokeResult extends ShaderCompileSmokeResult {
  dissolvedPixel: readonly [number, number, number, number];
  pixelDelta: number;
  runtimeParameterOk: boolean;
  visiblePixel: readonly [number, number, number, number];
}

interface ShaderGlobalsSmokeResult extends ShaderCompileSmokeResult {
  baselinePixel: readonly [number, number, number, number];
  globalUpdateOk: boolean;
  memory: {
    geometries: number;
    textures: number;
  };
  timePixel: readonly [number, number, number, number];
  timePixelDelta: number;
  viewportPixel: readonly [number, number, number, number];
  viewportPixelDelta: number;
}

interface ShaderLifecycleResourceSmokeResult {
  finalProgramCount: number | null;
  finalRuntimeBindingCount: number;
  iterations: number;
  maxRuntimeBindingCount: number;
  memoryAfterDispose: {
    geometries: number;
    textures: number;
  };
  memoryAfterWarmup: {
    geometries: number;
    textures: number;
  };
  ok: boolean;
  programGrowthAfterWarmup: number | null;
  warmProgramCount: number | null;
}

interface PostProcessVignetteSmokeResult {
  centerPixel: readonly [number, number, number, number];
  cornerPixel: readonly [number, number, number, number];
  edgeDarkeningDelta: number;
  memory: {
    geometries: number;
    textures: number;
  };
  ok: boolean;
  programCount: number | null;
}

test('S0 debug ShaderMaterial compiles in Chromium', async ({ page }) => {
  const browserErrors = collectBrowserErrors(page);

  await page.goto('/');
  const result = await page.evaluate(async (): Promise<ShaderCompileSmokeResult> => {
    const fixtureUrl = '/tests/smoke/shaderCompileFixture.ts';
    const fixture = (await import(/* @vite-ignore */ fixtureUrl)) as {
      compileDebugUvGradientMaterial: () => Promise<ShaderCompileSmokeResult>;
    };

    return fixture.compileDebugUvGradientMaterial();
  });

  expect(result).toMatchObject({
    compileAsyncUsed: true,
    fragmentShaderPath: 'src/shaders/materials/debug/debug-uv-gradient.frag.glsl',
    materialId: 'debug.uv-gradient',
    materialName: 'material:debug.uv-gradient',
    ok: true,
    vertexShaderPath: 'src/shaders/materials/debug/debug-uv-gradient.vert.glsl',
  });
  expect(result.programCount ?? 0).toBeGreaterThan(0);
  expect(browserErrors).toEqual([]);
});

test('production gate dissolve ShaderMaterial compiles and changes pixels', async ({ page }) => {
  const browserErrors = collectBrowserErrors(page);

  await page.goto('/');
  const result = await page.evaluate(async (): Promise<DissolveShaderSmokeResult> => {
    const fixtureUrl = '/tests/smoke/shaderCompileFixture.ts';
    const fixture = (await import(/* @vite-ignore */ fixtureUrl)) as {
      compileGateDissolveMaterial: () => Promise<DissolveShaderSmokeResult>;
    };

    return fixture.compileGateDissolveMaterial();
  });

  expect(result).toMatchObject({
    compileAsyncUsed: true,
    fragmentShaderPath: 'src/shaders/materials/story/gate-dissolve.frag.glsl',
    materialId: 'story.gate-dissolve',
    materialName: 'material:story.gate-dissolve',
    ok: true,
    runtimeParameterOk: true,
    vertexShaderPath: 'src/shaders/materials/story/gate-dissolve.vert.glsl',
  });
  expect(result.programCount ?? 0).toBeGreaterThan(0);
  expect(result.visiblePixel[3]).toBe(255);
  expect(result.pixelDelta).toBeGreaterThan(20);
  expect(browserErrors).toEqual([]);
});

test('debug ShaderMaterial responds to shader globals in Chromium', async ({ page }) => {
  const browserErrors = collectBrowserErrors(page);

  await page.goto('/');
  const result = await page.evaluate(async (): Promise<ShaderGlobalsSmokeResult> => {
    const fixtureUrl = '/tests/smoke/shaderCompileFixture.ts';
    const fixture = (await import(/* @vite-ignore */ fixtureUrl)) as {
      renderDebugUvGradientWithShaderGlobals: () => Promise<ShaderGlobalsSmokeResult>;
    };

    return fixture.renderDebugUvGradientWithShaderGlobals();
  });

  expect(result).toMatchObject({
    compileAsyncUsed: true,
    fragmentShaderPath: 'src/shaders/materials/debug/debug-uv-gradient.frag.glsl',
    globalUpdateOk: true,
    materialId: 'debug.uv-gradient',
    materialName: 'material:debug.uv-gradient',
    ok: true,
    vertexShaderPath: 'src/shaders/materials/debug/debug-uv-gradient.vert.glsl',
  });
  expect(result.programCount ?? 0).toBeGreaterThan(0);
  expect(result.memory.geometries).toBeGreaterThan(0);
  expect(result.timePixelDelta).toBeGreaterThan(8);
  expect(result.viewportPixelDelta).toBeGreaterThan(8);
  expect(result.baselinePixel[3]).toBe(255);
  expect(result.timePixel[3]).toBe(255);
  expect(result.viewportPixel[3]).toBe(255);
  expect(browserErrors).toEqual([]);
});

test('shader material lifecycle counters stay bounded in Chromium', async ({ page }) => {
  const browserErrors = collectBrowserErrors(page);

  await page.goto('/');
  const result = await page.evaluate(async (): Promise<ShaderLifecycleResourceSmokeResult> => {
    const fixtureUrl = '/tests/smoke/shaderCompileFixture.ts';
    const fixture = (await import(/* @vite-ignore */ fixtureUrl)) as {
      runShaderMaterialLifecycleResourceSmoke: () => ShaderLifecycleResourceSmokeResult;
    };

    return fixture.runShaderMaterialLifecycleResourceSmoke();
  });

  expect(result).toMatchObject({
    finalRuntimeBindingCount: 0,
    iterations: 18,
    maxRuntimeBindingCount: 1,
    ok: true,
  });
  expect(result.warmProgramCount ?? 0).toBeGreaterThan(0);
  expect(result.finalProgramCount ?? 0).toBeGreaterThan(0);
  expect(result.programGrowthAfterWarmup ?? 0).toBeLessThanOrEqual(1);
  expect(result.memoryAfterDispose.geometries).toBeLessThanOrEqual(
    result.memoryAfterWarmup.geometries + 1,
  );
  expect(result.memoryAfterDispose.textures).toBeLessThanOrEqual(
    result.memoryAfterWarmup.textures + 1,
  );
  expect(browserErrors).toEqual([]);
});

test('postprocess vignette pass changes edge pixels in Chromium', async ({ page }) => {
  const browserErrors = collectBrowserErrors(page);

  await page.goto('/');
  const result = await page.evaluate(async (): Promise<PostProcessVignetteSmokeResult> => {
    const fixtureUrl = '/tests/smoke/shaderCompileFixture.ts';
    const fixture = (await import(/* @vite-ignore */ fixtureUrl)) as {
      renderPostProcessVignetteSmoke: () => PostProcessVignetteSmokeResult;
    };

    return fixture.renderPostProcessVignetteSmoke();
  });

  expect(result.ok).toBe(true);
  expect(result.edgeDarkeningDelta).toBeGreaterThan(20);
  expect(result.centerPixel[3]).toBe(255);
  expect(result.cornerPixel[3]).toBe(255);
  expect(result.programCount ?? 0).toBeGreaterThan(0);
  expect(result.memory.geometries).toBeGreaterThan(0);
  expect(browserErrors).toEqual([]);
});

function collectBrowserErrors(page: Page): string[] {
  const browserErrors: string[] = [];

  page.on('console', (message) => {
    if (message.type() === 'error') {
      browserErrors.push(message.text());
    }
  });
  page.on('pageerror', (error) => {
    browserErrors.push(error.message);
  });

  return browserErrors;
}
