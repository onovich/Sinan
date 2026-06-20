import type { MaterialParameterValue, ShaderGlobals } from '../../src/runtime/materials';

export type RgbaPixel = readonly [number, number, number, number];

export interface VisualFixtureViewport {
  height: number;
  pixelRatio?: number;
  width: number;
}

export interface VisualFixtureCamera {
  kind: 'orthographic' | 'perspective';
  position: readonly [number, number, number];
  target?: readonly [number, number, number];
}

export interface VisualFixtureGeometry {
  kind: 'plane' | 'box' | 'custom';
  label: string;
}

export interface VisualFixtureTarget {
  id: string;
  kind: 'material' | 'postprocess';
}

export interface VisualSampleBaseline {
  expected: RgbaPixel;
  label: string;
  point: readonly [number, number];
}

export interface VisualFixtureTolerance {
  aggregateDelta?: number;
  channelDelta?: number;
}

export interface VisualFixtureBaseline {
  camera: VisualFixtureCamera;
  geometry: VisualFixtureGeometry;
  id: string;
  parameters?: Readonly<Record<string, MaterialParameterValue>>;
  samples: readonly VisualSampleBaseline[];
  shaderGlobals?: ShaderGlobals;
  target: VisualFixtureTarget;
  tolerance: VisualFixtureTolerance;
  viewport: VisualFixtureViewport;
}

export interface VisualSampleObservation {
  label: string;
  observed: RgbaPixel;
}

export interface VisualFixtureObservation {
  fixtureId: string;
  samples: readonly VisualSampleObservation[];
}

export interface VisualSampleComparison {
  aggregateDelta: number;
  channelDeltas: RgbaPixel;
  expected: RgbaPixel;
  label: string;
  observed?: RgbaPixel;
  ok: boolean;
  tolerance: Required<VisualFixtureTolerance>;
}

export interface VisualFixtureComparison {
  fixtureId: string;
  issues: readonly string[];
  ok: boolean;
  samples: readonly VisualSampleComparison[];
  target: VisualFixtureTarget;
}

export function compareVisualFixture(
  baseline: VisualFixtureBaseline,
  observation: VisualFixtureObservation,
): VisualFixtureComparison {
  const tolerance = normalizeTolerance(baseline.tolerance);
  const observedByLabel = new Map(
    observation.samples.map((sample) => [sample.label, sample.observed] as const),
  );
  const samples = baseline.samples.map((sample) =>
    compareVisualSample(sample, observedByLabel.get(sample.label), tolerance),
  );
  const issues = samples
    .filter((sample) => !sample.ok)
    .map((sample) => formatVisualSampleIssue(baseline, sample));

  if (observation.fixtureId !== baseline.id) {
    issues.unshift(
      `Fixture id mismatch: expected "${baseline.id}" but observed "${observation.fixtureId}".`,
    );
  }

  return {
    fixtureId: baseline.id,
    issues,
    ok: issues.length === 0,
    samples,
    target: baseline.target,
  };
}

export function getPixelAggregateDelta(left: RgbaPixel, right: RgbaPixel): number {
  return left.reduce((total, value, index) => total + Math.abs(value - right[index]), 0);
}

function compareVisualSample(
  sample: VisualSampleBaseline,
  observed: RgbaPixel | undefined,
  tolerance: Required<VisualFixtureTolerance>,
): VisualSampleComparison {
  if (!observed) {
    return {
      aggregateDelta: Number.POSITIVE_INFINITY,
      channelDeltas: [Infinity, Infinity, Infinity, Infinity],
      expected: sample.expected,
      label: sample.label,
      ok: false,
      tolerance,
    };
  }

  const channelDeltas = sample.expected.map((value, index) =>
    Math.abs(value - observed[index]),
  ) as unknown as RgbaPixel;
  const aggregateDelta = getPixelAggregateDelta(sample.expected, observed);
  const channelOk = channelDeltas.every((delta) => delta <= tolerance.channelDelta);
  const aggregateOk = aggregateDelta <= tolerance.aggregateDelta;

  return {
    aggregateDelta,
    channelDeltas,
    expected: sample.expected,
    label: sample.label,
    observed,
    ok: channelOk && aggregateOk,
    tolerance,
  };
}

function normalizeTolerance(tolerance: VisualFixtureTolerance): Required<VisualFixtureTolerance> {
  return {
    aggregateDelta: tolerance.aggregateDelta ?? 0,
    channelDelta: tolerance.channelDelta ?? 0,
  };
}

function formatVisualSampleIssue(
  baseline: VisualFixtureBaseline,
  sample: VisualSampleComparison,
): string {
  if (!sample.observed) {
    return `${baseline.id} ${baseline.target.kind}:${baseline.target.id} sample "${sample.label}" missing observed pixel at tolerance channel=${sample.tolerance.channelDelta} aggregate=${sample.tolerance.aggregateDelta}.`;
  }

  return `${baseline.id} ${baseline.target.kind}:${baseline.target.id} sample "${sample.label}" expected ${formatPixel(sample.expected)} observed ${formatPixel(sample.observed)} channelDelta ${formatPixel(sample.channelDeltas)} aggregateDelta ${sample.aggregateDelta} tolerance channel=${sample.tolerance.channelDelta} aggregate=${sample.tolerance.aggregateDelta}.`;
}

function formatPixel(pixel: RgbaPixel): string {
  return `[${pixel.join(', ')}]`;
}
