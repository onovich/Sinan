import type { MaterialParameterValue } from './MaterialParameter';

export interface MaterialTarget {
  entityId: string;
  slot: string;
}

export interface MaterialRuntimeError {
  code: string;
  message: string;
  materialId?: string;
  parameter?: string;
  target?: MaterialTarget;
  cause?: unknown;
}

export interface MaterialRuntimeResult {
  ok: boolean;
  errors: readonly MaterialRuntimeError[];
}

export interface MaterialRuntime {
  applyMaterial(
    target: MaterialTarget,
    materialId: string,
    parameters?: Readonly<Record<string, MaterialParameterValue>>,
  ): MaterialRuntimeResult;

  setParameter(
    target: MaterialTarget,
    parameter: string,
    value: MaterialParameterValue,
  ): MaterialRuntimeResult;

  getParameter(target: MaterialTarget, parameter: string): MaterialParameterValue | undefined;

  resetParameter(target: MaterialTarget, parameter: string): MaterialRuntimeResult;

  disposeEntityMaterials(entityId: string): void;
}
