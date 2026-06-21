import type {
  PickResult,
  RuntimeInitOptions,
  RuntimeSize,
  TransformGizmoCallbacks,
  TransformGizmoMode,
  RuntimeAnimationPlayOptions,
  RuntimeAnimationStopOptions,
  RuntimeAnimationTimeOptions,
  RuntimeCameraPose,
  RuntimeDebugAabb,
  RuntimeLodGroup,
  RuntimeMaterialParameterUpdate,
  RuntimePostProcessEffectUpdate,
  RuntimeShaderGlobals,
  RuntimeRenderEnvironmentStyle,
  RuntimeRenderableMaterialSlots,
  RuntimeRenderStyle,
  RuntimeStyleQualityProfile,
  RuntimeStyleResources,
} from './RuntimeTypes';
import type { ModelHandle, RuntimeObjectHandle } from './RuntimeObjectHandle';
import type { RuntimeTransform } from './RuntimeTypes';

export interface WebRuntime {
  init(options: RuntimeInitOptions): void;
  loadModel(assetId: string, url: string): Promise<ModelHandle>;
  instantiateModel(assetId: string, entityId: string): RuntimeObjectHandle;
  createEmpty(entityId: string): RuntimeObjectHandle;
  destroyObject(entityId: string): void;
  setTransform(entityId: string, transform: RuntimeTransform): void;
  getTransform(entityId: string): RuntimeTransform | null;
  setVisible(entityId: string, visible: boolean): void;
  playAnimation(options: RuntimeAnimationPlayOptions): void;
  stopAnimation(options: RuntimeAnimationStopOptions): void;
  setAnimationTime(options: RuntimeAnimationTimeOptions): void;
  setCameraPose(pose: RuntimeCameraPose): void;
  setDebugAabb(entityId: string, bounds: RuntimeDebugAabb | undefined): void;
  setEntityLodGroup?(entityId: string, group: RuntimeLodGroup | undefined): void;
  setStyleResources?(resources: RuntimeStyleResources): void;
  setRenderStyle?(entityId: string, style: RuntimeRenderStyle | undefined): void;
  setRenderableMaterials?(
    entityId: string,
    materials: RuntimeRenderableMaterialSlots | undefined,
  ): void;
  setMaterialParameter?(update: RuntimeMaterialParameterUpdate): void;
  setShaderGlobals?(globals: RuntimeShaderGlobals): void;
  setPostProcessEffect?(update: RuntimePostProcessEffectUpdate): void;
  setRenderEnvironment?(environment: RuntimeRenderEnvironmentStyle | undefined): void;
  setStyleQualityProfile?(profile: RuntimeStyleQualityProfile): void;
  setSelectedEntity?(entityId: string | undefined): void;
  pick(clientX: number, clientY: number): PickResult | null;
  attachTransformGizmo(entityId: string, callbacks?: TransformGizmoCallbacks): void;
  detachTransformGizmo(): void;
  setTransformGizmoMode(mode: TransformGizmoMode): void;
  update(deltaSeconds: number): void;
  render(): void;
  resize(size: RuntimeSize): void;
  dispose(): void;
}
