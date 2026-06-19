export type { MaterialDefinition } from './MaterialDefinition';
export { isMaterialDefinitionId, validateMaterialDefinition } from './MaterialDefinition';
export {
  BUILT_IN_MATERIAL_DEFINITIONS,
  DEBUG_UV_GRADIENT_MATERIAL_ID,
  createDefaultMaterialRegistry,
  debugUvGradientMaterialDefinition,
} from './BuiltInMaterials';
export { MaterialRegistry, MaterialRegistryError } from './MaterialRegistry';
export type {
  MaterialRuntime,
  MaterialRuntimeError,
  MaterialRuntimeResult,
  MaterialTarget,
} from './MaterialRuntime';
export type {
  MaterialParameterDefinition,
  MaterialParameterTimelineMode,
  MaterialParameterType,
  MaterialParameterValidationOptions,
  MaterialParameterValue,
  MaterialValidationIssue,
  MaterialVec2,
  MaterialVec3,
} from './MaterialParameter';
export {
  MATERIAL_PARAMETER_TYPES,
  isMaterialParameterType,
  isPublicMaterialParameterName,
  validateMaterialParameterDefinition,
  validateMaterialParameterValue,
} from './MaterialParameter';
