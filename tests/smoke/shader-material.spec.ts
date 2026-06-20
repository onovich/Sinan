import { expect, test, type Page } from '@playwright/test';

interface ShaderCompileSmokeResult {
  compileAsyncUsed: boolean;
  fragmentShaderPath: string;
  materialId: string;
  materialName: string;
  ok: boolean;
  programCount: number | null;
  runtimeContext: string;
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

interface HologramScanlineShaderSmokeResult extends ShaderCompileSmokeResult {
  visiblePixel: readonly [number, number, number, number];
}

interface ShaderMaterialVisualRegressionSmokeResult {
  fixtureCount: number;
  issues: readonly string[];
  ok: boolean;
}

interface PostProcessVisualRegressionSmokeResult {
  fixtureCount: number;
  issues: readonly string[];
  ok: boolean;
}

interface ShaderFallbackDiagnosticsSmokeResult {
  diagnosticMessages: readonly string[];
  fallbackMaterialName: string;
  fallbackPixel: readonly [number, number, number, number];
  fallbackVisible: boolean;
  ok: boolean;
}

interface LowEndShaderBaselineSmokeResult {
  budget: {
    maxDurationMs: number;
    maxGeometries: number;
    maxProgramCount: number;
    maxTextures: number;
  };
  durationMs: number;
  edgeDarkeningDelta: number;
  gatePixel: readonly [number, number, number, number];
  hologramPixel: readonly [number, number, number, number];
  memory: {
    geometries: number;
    textures: number;
  };
  ok: boolean;
  pixelRatio: number;
  programCount: number | null;
  viewport: {
    height: number;
    width: number;
  };
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
  effectId: string;
  memory: {
    geometries: number;
    textures: number;
  };
  ok: boolean;
  passSourcePath: string;
  programCount: number | null;
  runtimeContext: string;
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
    runtimeContext: 'smoke.shader.compile',
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
    runtimeContext: 'smoke.shader.compile',
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
    runtimeContext: 'smoke.shader.compile',
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

test('production hologram scanline ShaderMaterial compiles in Chromium', async ({ page }) => {
  const browserErrors = collectBrowserErrors(page);

  await page.goto('/');
  const result = await page.evaluate(async (): Promise<HologramScanlineShaderSmokeResult> => {
    const fixtureUrl = '/tests/smoke/shaderCompileFixture.ts';
    const fixture = (await import(/* @vite-ignore */ fixtureUrl)) as {
      compileHologramScanlineMaterial: () => Promise<HologramScanlineShaderSmokeResult>;
    };

    return fixture.compileHologramScanlineMaterial();
  });

  expect(result).toMatchObject({
    compileAsyncUsed: true,
    fragmentShaderPath: 'src/shaders/materials/story/hologram-scanline.frag.glsl',
    materialId: 'story.hologram-scanline',
    materialName: 'material:story.hologram-scanline',
    ok: true,
    runtimeContext: 'smoke.shader.compile',
    vertexShaderPath: 'src/shaders/materials/story/hologram-scanline.vert.glsl',
  });
  expect(result.programCount ?? 0).toBeGreaterThan(0);
  expect(result.visiblePixel[3]).toBe(255);
  expect(browserErrors).toEqual([]);
});

test('production shader materials match deterministic visual baselines', async ({ page }) => {
  const browserErrors = collectBrowserErrors(page);

  await page.goto('/');
  const result = await page.evaluate(
    async (): Promise<ShaderMaterialVisualRegressionSmokeResult> => {
      const fixtureUrl = '/tests/smoke/shaderCompileFixture.ts';
      const fixture = (await import(/* @vite-ignore */ fixtureUrl)) as {
        renderProductionMaterialVisualRegression: () => Promise<ShaderMaterialVisualRegressionSmokeResult>;
      };

      return fixture.renderProductionMaterialVisualRegression();
    },
  );

  expect(result.fixtureCount).toBe(3);
  expect(result.issues).toEqual([]);
  expect(result.ok).toBe(true);
  expect(browserErrors).toEqual([]);
});

test('shader fallback path renders visibly and reports structured diagnostics', async ({
  page,
}) => {
  const browserErrors = collectBrowserErrors(page);

  await page.goto('/');
  const result = await page.evaluate(async (): Promise<ShaderFallbackDiagnosticsSmokeResult> => {
    const fixtureUrl = '/tests/smoke/shaderCompileFixture.ts';
    const fixture = (await import(/* @vite-ignore */ fixtureUrl)) as {
      renderShaderFallbackDiagnosticsSmoke: () => ShaderFallbackDiagnosticsSmokeResult;
    };

    return fixture.renderShaderFallbackDiagnosticsSmoke();
  });

  expect(result.ok).toBe(true);
  expect(result.fallbackMaterialName).toBe('material:fallback-error');
  expect(result.fallbackVisible).toBe(true);
  expect(result.fallbackPixel[0]).toBeGreaterThan(200);
  expect(result.fallbackPixel[1]).toBeLessThan(80);
  expect(result.fallbackPixel[2]).toBeGreaterThan(200);
  expect(result.diagnosticMessages).toHaveLength(1);
  expect(result.diagnosticMessages[0]).toContain(
    '[smoke.shader.fallback] material:story.missing code=missing_material stage=factory',
  );
  expect(result.diagnosticMessages[0]).toContain('entity=missing_shader_panel slot=main');
  expect(result.diagnosticMessages[0]).toContain(
    'message="Missing material definition "story.missing"."',
  );
  expect(browserErrors).toEqual([]);
});

test('low-end shader baseline stays within local Chromium budgets', async ({ page }) => {
  const browserErrors = collectBrowserErrors(page);

  await page.goto('/');
  const result = await page.evaluate(async (): Promise<LowEndShaderBaselineSmokeResult> => {
    const fixtureUrl = '/tests/smoke/shaderCompileFixture.ts';
    const fixture = (await import(/* @vite-ignore */ fixtureUrl)) as {
      runLowEndShaderBaselineSmoke: () => Promise<LowEndShaderBaselineSmokeResult>;
    };

    return fixture.runLowEndShaderBaselineSmoke();
  });

  expect(result.ok).toBe(true);
  expect(result.viewport).toEqual({ width: 360, height: 640 });
  expect(result.pixelRatio).toBe(1);
  expect(result.gatePixel[3]).toBe(255);
  expect(result.hologramPixel[3]).toBe(255);
  expect(result.edgeDarkeningDelta).toBeGreaterThan(20);
  expect(result.durationMs).toBeLessThanOrEqual(result.budget.maxDurationMs);
  expect(result.programCount ?? 0).toBeLessThanOrEqual(result.budget.maxProgramCount);
  expect(result.memory.geometries).toBeLessThanOrEqual(result.budget.maxGeometries);
  expect(result.memory.textures).toBeLessThanOrEqual(result.budget.maxTextures);
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
  expect(result.effectId).toBe('cinematic.vignette');
  expect(result.passSourcePath).toBe('src/runtime/three/ThreePostProcessRuntime.ts');
  expect(result.runtimeContext).toBe('smoke.postprocess.render');
  expect(result.edgeDarkeningDelta).toBeGreaterThan(20);
  expect(result.centerPixel[3]).toBe(255);
  expect(result.cornerPixel[3]).toBe(255);
  expect(result.programCount ?? 0).toBeGreaterThan(0);
  expect(result.memory.geometries).toBeGreaterThan(0);
  expect(browserErrors).toEqual([]);
});

test('postprocess vignette matches deterministic visual baselines', async ({ page }) => {
  const browserErrors = collectBrowserErrors(page);

  await page.goto('/');
  const result = await page.evaluate(async (): Promise<PostProcessVisualRegressionSmokeResult> => {
    const fixtureUrl = '/tests/smoke/shaderCompileFixture.ts';
    const fixture = (await import(/* @vite-ignore */ fixtureUrl)) as {
      renderPostProcessVisualRegression: () => PostProcessVisualRegressionSmokeResult;
    };

    return fixture.renderPostProcessVisualRegression();
  });

  expect(result.fixtureCount).toBe(2);
  expect(result.issues).toEqual([]);
  expect(result.ok).toBe(true);
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
