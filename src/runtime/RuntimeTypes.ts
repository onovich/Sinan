import type { MaterialParameterValue, ShaderGlobals } from './materials';

export type Vec3 = readonly [number, number, number];
export type Quat = readonly [number, number, number, number];

export interface RuntimeTransform {
  position: Vec3;
  rotation: Quat;
  scale: Vec3;
}

export interface RuntimeSphericalSurfaceFrame {
  position: Vec3;
  normal: Vec3;
  tangent: Vec3;
  bitangent: Vec3;
  rotation: Quat;
}

export type RuntimeSphericalPlacementIssueReason =
  | 'missing_world_projection'
  | 'missing_region'
  | 'invalid_projection';

export interface RuntimeSphericalPlacementIssue {
  entityId: string;
  message: string;
  reason: RuntimeSphericalPlacementIssueReason;
  regionId?: string;
}

export interface RuntimeSphericalPlacement {
  authoredLocalPosition: Vec3;
  authoredLocalYaw: number;
  entityId: string;
  regionId: string;
  surfaceFrame: RuntimeSphericalSurfaceFrame;
  transform: RuntimeTransform;
}

export interface RuntimeSphericalPlacementDiagnostics {
  issueCount: number;
  issues: readonly RuntimeSphericalPlacementIssue[];
  placementCount: number;
  placements: readonly RuntimeSphericalPlacement[];
}

export interface RuntimeSize {
  width: number;
  height: number;
  pixelRatio?: number;
}

export interface RuntimeInitOptions extends RuntimeSize {
  canvas: HTMLCanvasElement;
}

export interface PickResult {
  entityId: string;
  point: Vec3;
  normal?: Vec3;
}

export type TransformGizmoMode = 'translate' | 'rotate' | 'scale';

export interface TransformGizmoEvent {
  entityId: string;
  transform: RuntimeTransform;
}

export interface TransformGizmoCallbacks {
  onChange?: (event: TransformGizmoEvent) => void;
  onCommit?: (event: TransformGizmoEvent) => void;
}

export interface RuntimeAnimationPlayOptions {
  entityId: string;
  clip: string;
  loop?: boolean;
  fadeIn?: number;
  fadeOut?: number;
  timeScale?: number;
}

export interface RuntimeAnimationStopOptions {
  entityId: string;
  clip?: string;
  fadeOut?: number;
}

export interface RuntimeAnimationTimeOptions {
  entityId: string;
  clip: string;
  time: number;
}

export interface RuntimeCameraPose {
  position: Vec3;
  rotation?: Quat;
  lookAt?: Vec3;
  up?: Vec3;
  fov: number;
  near?: number;
  far?: number;
}

export interface RuntimeDebugAabb {
  center: Vec3;
  size: Vec3;
  color?: string;
  visible: boolean;
}

export type RuntimeRenderStyleProfile = 'standard' | 'palette-toon';
export type RuntimeRenderStyleVisibilityMode = 'none' | 'selected' | 'interactable' | 'always';
export type RuntimeRenderStyleFeatureMode = 'inherit' | 'enabled' | 'disabled';
export type RuntimeStyleQualityProfile = 'standard' | 'low-end';
export type RuntimeLodStrategy = 'distance';

export interface RuntimeLodLevel {
  level: number;
  asset: string;
  minDistance: number;
}

export interface RuntimeLodGroup {
  strategy: RuntimeLodStrategy;
  hysteresis: number;
  lowEndBias: number;
  fallbackAsset: string;
  levels: readonly RuntimeLodLevel[];
  enabled?: boolean;
}

export interface RuntimeLodSelectionInput {
  group?: RuntimeLodGroup;
  distance: number;
  currentLevel?: number;
  qualityProfile?: RuntimeStyleQualityProfile;
  availableAssetIds?: ReadonlySet<string>;
}

export interface RuntimeLodDisabledSelection {
  status: 'disabled';
  changed: false;
  fallbackUsed: false;
}

export interface RuntimeLodSelectedLevel {
  status: 'selected';
  level: number;
  asset: string;
  distance: number;
  changed: boolean;
  fallbackUsed: boolean;
}

export type RuntimeLodSelectionResult = RuntimeLodDisabledSelection | RuntimeLodSelectedLevel;

export interface RuntimeLodDiagnostics {
  entityId: string;
  currentLevel: number | undefined;
  currentAsset: string | undefined;
}

export type RuntimeScatterSource =
  | {
      type: 'asset';
      asset: string;
    }
  | {
      type: 'prefab';
      prefab: string;
    };

export interface RuntimeScatterRange {
  min: number;
  max: number;
}

export interface RuntimeScatterPlacement {
  shape: 'box';
  center: Vec3;
  size: Vec3;
}

export type RuntimeScatterAlignment = 'none' | 'y-up';

export interface RuntimeScatterTransformRanges {
  yaw?: RuntimeScatterRange;
  uniformScale?: RuntimeScatterRange;
}

export interface RuntimeScatterQuality {
  lodGroup?: string;
  lowEndCountScale?: number;
}

export interface RuntimeScatterFallback {
  mode: 'skip' | 'placeholder';
  asset?: string;
}

export interface RuntimeScatterGroup {
  id: string;
  source: RuntimeScatterSource;
  count: number;
  seed: string | number;
  placement: RuntimeScatterPlacement;
  alignment?: RuntimeScatterAlignment;
  transform?: RuntimeScatterTransformRanges;
  quality?: RuntimeScatterQuality;
  fallback?: RuntimeScatterFallback;
}

export interface RuntimeScatterInstance {
  id: string;
  groupId: string;
  source: RuntimeScatterSource;
  transform: RuntimeTransform;
}

export interface RuntimeScatterDiagnostics {
  groupId: string;
  instanceCount: number;
  sourceAsset: string;
  fallbackUsed: boolean;
}

export interface RuntimeRenderStyle {
  profile: RuntimeRenderStyleProfile;
  palette?: string;
  tone?: string;
  outline?: RuntimeRenderStyleVisibilityMode;
  highlight?: RuntimeRenderStyleVisibilityMode;
  fog?: RuntimeRenderStyleFeatureMode;
  colorGrade?: RuntimeRenderStyleFeatureMode;
}

export interface RuntimeRenderableMaterialSlot {
  materialId: string;
  parameters?: Readonly<Record<string, MaterialParameterValue>>;
}

export type RuntimeRenderableMaterialSlots = Readonly<
  Record<string, RuntimeRenderableMaterialSlot>
>;

export interface RuntimeMaterialParameterUpdate {
  entityId: string;
  slot: string;
  parameter: string;
  value: MaterialParameterValue;
}

export type RuntimeShaderGlobals = ShaderGlobals;

export interface RuntimePostProcessEffectUpdate {
  effectId: string;
  parameters?: Readonly<Record<string, MaterialParameterValue>>;
}

export interface RuntimePalette {
  id: string;
  tones: Record<string, string>;
}

export interface RuntimeStyleResources {
  palettes: Record<string, RuntimePalette>;
}

export interface RuntimeFogStyle {
  enabled: boolean;
  color?: string;
  near?: number;
  far?: number;
}

export interface RuntimeColorGradeStyle {
  enabled: boolean;
  exposure?: number;
  saturation?: number;
}

export interface RuntimeRenderEnvironmentStyle {
  background?: string;
  ambientLight?: number;
  fog?: RuntimeFogStyle;
  colorGrade?: RuntimeColorGradeStyle;
}
