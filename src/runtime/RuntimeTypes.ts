import type { MaterialParameterValue, ShaderGlobals } from './materials';

export type Vec3 = readonly [number, number, number];
export type Quat = readonly [number, number, number, number];

export interface RuntimeTransform {
  position: Vec3;
  rotation: Quat;
  scale: Vec3;
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
