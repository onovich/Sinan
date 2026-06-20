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
