import * as THREE from 'three';

import {
  DEBUG_UV_GRADIENT_MATERIAL_ID,
  STORY_GATE_DISSOLVE_MATERIAL_ID,
  createDefaultMaterialRegistry,
  type MaterialParameterValue,
  type MaterialRegistry,
  type MaterialRuntime,
  type MaterialRuntimeError,
  type MaterialRuntimeResult,
  type MaterialTarget,
} from '../../materials';
import { FALLBACK_MATERIAL_NAME } from './createFallbackMaterial';
import { ThreeMaterialFactory } from './ThreeMaterialFactory';

interface ThreeMaterialRuntimeOptions {
  materialFactory?: ThreeMaterialFactory;
  materialRegistry?: MaterialRegistry;
}

interface EntityObjectBinding {
  object: THREE.Object3D;
  originalMaterials: Map<THREE.Mesh, THREE.Material | THREE.Material[]>;
}

interface ThreeMaterialBinding {
  material: THREE.Material;
  materialId: string;
  parameters: Map<string, MaterialParameterValue>;
  target: MaterialTarget;
}

type MaterialMesh = THREE.Mesh & {
  material: THREE.Material | THREE.Material[];
};

export class ThreeMaterialRuntime implements MaterialRuntime {
  private readonly materialRegistry: MaterialRegistry;
  private readonly materialFactory: ThreeMaterialFactory;
  private readonly entityObjects = new Map<string, EntityObjectBinding>();
  private readonly materialBindings = new Map<string, ThreeMaterialBinding>();

  constructor(options: ThreeMaterialRuntimeOptions = {}) {
    this.materialRegistry = options.materialRegistry ?? createDefaultMaterialRegistry();
    this.materialFactory =
      options.materialFactory ?? new ThreeMaterialFactory(this.materialRegistry);
  }

  bindEntityObject(entityId: string, object: THREE.Object3D): void {
    this.disposeEntityMaterials(entityId);
    this.entityObjects.set(entityId, {
      object,
      originalMaterials: new Map(),
    });
  }

  applyMaterial(
    target: MaterialTarget,
    materialId: string,
    parameters: Readonly<Record<string, MaterialParameterValue>> = {},
  ): MaterialRuntimeResult {
    const targetIssue = this.validateTarget(target);

    if (targetIssue) {
      return toResult([targetIssue]);
    }

    const objectBinding = this.entityObjects.get(target.entityId);

    if (!objectBinding) {
      return toResult([
        {
          code: 'missing_entity_object',
          message: `No Three object is bound for entity "${target.entityId}".`,
          materialId,
          target,
        },
      ]);
    }

    const factoryResult = this.materialFactory.createMaterial({ materialId, parameters });
    const bindingKey = getTargetKey(target);
    const previousBinding = this.materialBindings.get(bindingKey);

    if (previousBinding) {
      disposeOwnedMaterial(previousBinding.material);
    }

    replaceMainSlotMaterial(objectBinding, factoryResult.material);
    this.materialBindings.set(bindingKey, {
      material: factoryResult.material,
      materialId,
      parameters: new Map(
        Object.entries(resolveParameterValues(this.materialRegistry, materialId, parameters)),
      ),
      target,
    });

    return toResult(
      factoryResult.errors.map((error) => ({
        code: error.code,
        message: error.message,
        materialId: error.materialId,
        parameter: error.parameter,
        target,
        cause: error.cause,
      })),
    );
  }

  setParameter(
    target: MaterialTarget,
    parameter: string,
    value: MaterialParameterValue,
  ): MaterialRuntimeResult {
    const targetIssue = this.validateTarget(target);

    if (targetIssue) {
      return toResult([targetIssue]);
    }

    const binding = this.materialBindings.get(getTargetKey(target));

    if (!binding) {
      return toResult([
        {
          code: 'missing_material_binding',
          message: `No material is bound for entity "${target.entityId}" slot "${target.slot}".`,
          parameter,
          target,
        },
      ]);
    }

    const parameterIssues = this.materialRegistry.validateParameters(binding.materialId, {
      [parameter]: value,
    });

    if (parameterIssues.length > 0) {
      return toResult(
        parameterIssues.map((issue) => ({
          code: 'invalid_parameter',
          message: issue.message,
          materialId: binding.materialId,
          parameter,
          target,
        })),
      );
    }

    const applyIssue = applyParameterToMaterial(binding, parameter, value);

    if (applyIssue) {
      return toResult([applyIssue]);
    }

    binding.parameters.set(parameter, value);

    return toResult([]);
  }

  getParameter(target: MaterialTarget, parameter: string): MaterialParameterValue | undefined {
    return this.materialBindings.get(getTargetKey(target))?.parameters.get(parameter);
  }

  resetParameter(target: MaterialTarget, parameter: string): MaterialRuntimeResult {
    const binding = this.materialBindings.get(getTargetKey(target));

    if (!binding) {
      return toResult([
        {
          code: 'missing_material_binding',
          message: `No material is bound for entity "${target.entityId}" slot "${target.slot}".`,
          parameter,
          target,
        },
      ]);
    }

    const definition = this.materialRegistry.get(binding.materialId);
    const defaultValue = definition?.parameters[parameter]?.defaultValue;

    if (defaultValue === undefined) {
      return toResult([
        {
          code: 'unknown_parameter',
          message: `Unknown material parameter "${parameter}" for material "${binding.materialId}".`,
          materialId: binding.materialId,
          parameter,
          target,
        },
      ]);
    }

    return this.setParameter(target, parameter, defaultValue);
  }

  disposeEntityMaterials(entityId: string): void {
    const objectBinding = this.entityObjects.get(entityId);

    for (const [key, binding] of this.materialBindings) {
      if (binding.target.entityId === entityId) {
        disposeOwnedMaterial(binding.material);
        this.materialBindings.delete(key);
      }
    }

    if (objectBinding) {
      for (const [mesh, originalMaterial] of objectBinding.originalMaterials) {
        mesh.material = originalMaterial;
      }
      objectBinding.originalMaterials.clear();
    }

    this.entityObjects.delete(entityId);
  }

  private validateTarget(target: MaterialTarget): MaterialRuntimeError | undefined {
    if (target.slot === 'main') {
      return undefined;
    }

    return {
      code: 'unsupported_slot',
      message: `Unsupported renderable material slot "${target.slot}". Supported slots: main.`,
      target,
    };
  }
}

function replaceMainSlotMaterial(
  objectBinding: EntityObjectBinding,
  material: THREE.Material,
): void {
  for (const mesh of collectMaterialMeshes(objectBinding.object)) {
    if (!objectBinding.originalMaterials.has(mesh)) {
      objectBinding.originalMaterials.set(mesh, mesh.material);
    }

    mesh.material = material;
  }
}

function collectMaterialMeshes(root: THREE.Object3D): MaterialMesh[] {
  const meshes: MaterialMesh[] = [];

  root.traverse((object) => {
    if (object instanceof THREE.Mesh) {
      meshes.push(object as MaterialMesh);
    }
  });

  return meshes;
}

function applyParameterToMaterial(
  binding: ThreeMaterialBinding,
  parameter: string,
  value: MaterialParameterValue,
): MaterialRuntimeError | undefined {
  if (
    binding.materialId !== DEBUG_UV_GRADIENT_MATERIAL_ID &&
    binding.materialId !== STORY_GATE_DISSOLVE_MATERIAL_ID
  ) {
    return {
      code: 'unsupported_material_parameter',
      message: `Material "${binding.materialId}" does not support runtime parameter updates.`,
      materialId: binding.materialId,
      parameter,
      target: binding.target,
    };
  }

  if (!(binding.material instanceof THREE.ShaderMaterial)) {
    return {
      code: 'fallback_material_parameter',
      message: `Cannot set parameter "${parameter}" on fallback material "${FALLBACK_MATERIAL_NAME}".`,
      materialId: binding.materialId,
      parameter,
      target: binding.target,
    };
  }

  switch (parameter) {
    case 'baseColor':
      (binding.material.uniforms.uBaseColor.value as THREE.Color).set(value as string);
      return undefined;
    case 'accentColor':
      (binding.material.uniforms.uAccentColor.value as THREE.Color).set(value as string);
      return undefined;
    case 'strength':
      binding.material.uniforms.uStrength.value = value as number;
      return undefined;
    case 'uvScale':
      (binding.material.uniforms.uUvScale.value as THREE.Vector2).set(
        ...(value as readonly [number, number]),
      );
      return undefined;
    case 'progress':
      binding.material.uniforms.uProgress.value = value as number;
      return undefined;
    case 'edgeWidth':
      binding.material.uniforms.uEdgeWidth.value = value as number;
      return undefined;
    case 'edgeColor':
      (binding.material.uniforms.uEdgeColor.value as THREE.Color).set(value as string);
      return undefined;
    case 'noiseScale':
      binding.material.uniforms.uNoiseScale.value = value as number;
      return undefined;
    default:
      return {
        code: 'unsupported_material_parameter',
        message: `Unknown material parameter "${parameter}" for material "${binding.materialId}".`,
        materialId: binding.materialId,
        parameter,
        target: binding.target,
      };
  }
}

function resolveParameterValues(
  materialRegistry: MaterialRegistry,
  materialId: string,
  parameters: Readonly<Record<string, MaterialParameterValue>>,
): Record<string, MaterialParameterValue> {
  const definition = materialRegistry.get(materialId);

  if (!definition) {
    return { ...parameters };
  }

  return Object.fromEntries(
    Object.entries(definition.parameters).map(([name, parameterDefinition]) => [
      name,
      parameters[name] ?? parameterDefinition.defaultValue,
    ]),
  );
}

function disposeOwnedMaterial(material: THREE.Material): void {
  material.dispose();
}

function getTargetKey(target: MaterialTarget): string {
  return `${target.entityId}:${target.slot}`;
}

function toResult(errors: readonly MaterialRuntimeError[]): MaterialRuntimeResult {
  return {
    ok: errors.length === 0,
    errors,
  };
}
