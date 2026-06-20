import type * as THREE from 'three';

import {
  DEBUG_UV_GRADIENT_MATERIAL_ID,
  STORY_GATE_DISSOLVE_MATERIAL_ID,
  createDefaultMaterialRegistry,
  type MaterialDefinition,
  type MaterialParameterValue,
  type MaterialRegistry,
  type MaterialValidationIssue,
} from '../../materials';
import { createDebugUvGradientMaterial } from './createDebugUvGradientMaterial';
import { createFallbackMaterial } from './createFallbackMaterial';
import { createGateDissolveMaterial } from './createGateDissolveMaterial';

export type ThreeMaterialFactoryErrorCode =
  | 'missing_material'
  | 'invalid_parameters'
  | 'unsupported_material'
  | 'factory_exception';

export interface ThreeMaterialFactoryError {
  code: ThreeMaterialFactoryErrorCode;
  message: string;
  materialId: string;
  parameter?: string;
  cause?: unknown;
}

export interface ThreeMaterialFactoryInput {
  materialId: string;
  parameters?: Readonly<Record<string, MaterialParameterValue>>;
}

export interface ThreeMaterialFactoryResult {
  material: THREE.Material;
  errors: readonly ThreeMaterialFactoryError[];
  fallbackUsed: boolean;
}

export class ThreeMaterialFactory {
  constructor(
    private readonly materialRegistry: MaterialRegistry = createDefaultMaterialRegistry(),
  ) {}

  createMaterial(input: ThreeMaterialFactoryInput): ThreeMaterialFactoryResult {
    const definition = this.materialRegistry.get(input.materialId);

    if (!definition) {
      return this.createFallbackResult(input.materialId, [
        {
          code: 'missing_material',
          materialId: input.materialId,
          message: `Missing material definition "${input.materialId}".`,
        },
      ]);
    }

    const parameterIssues = this.materialRegistry.validateParameters(
      input.materialId,
      input.parameters,
    );

    if (parameterIssues.length > 0) {
      return this.createFallbackResult(
        input.materialId,
        parameterIssues.map((issue) => toFactoryError(input.materialId, issue)),
      );
    }

    try {
      return {
        material: this.createKnownMaterial(definition, input.parameters ?? {}),
        errors: [],
        fallbackUsed: false,
      };
    } catch (error) {
      return this.createFallbackResult(input.materialId, [
        {
          code: 'factory_exception',
          materialId: input.materialId,
          message: `Failed to create material "${input.materialId}": ${getErrorMessage(error)}`,
          cause: error,
        },
      ]);
    }
  }

  private createKnownMaterial(
    definition: MaterialDefinition,
    parameters: Readonly<Record<string, MaterialParameterValue>>,
  ): THREE.Material {
    const values = resolveMaterialParameterValues(definition, parameters);

    if (definition.id === DEBUG_UV_GRADIENT_MATERIAL_ID) {
      return createDebugUvGradientMaterial({
        baseColor: requireString(values.baseColor, 'baseColor'),
        accentColor: requireString(values.accentColor, 'accentColor'),
        strength: requireNumber(values.strength, 'strength'),
        uvScale: requireVec2(values.uvScale, 'uvScale'),
      });
    }

    if (definition.id === STORY_GATE_DISSOLVE_MATERIAL_ID) {
      return createGateDissolveMaterial({
        progress: requireNumber(values.progress, 'progress'),
        edgeWidth: requireNumber(values.edgeWidth, 'edgeWidth'),
        edgeColor: requireString(values.edgeColor, 'edgeColor'),
        baseColor: requireString(values.baseColor, 'baseColor'),
        noiseScale: requireNumber(values.noiseScale, 'noiseScale'),
      });
    }

    throw new Error(`Unsupported Three material definition "${definition.id}".`);
  }

  private createFallbackResult(
    materialId: string,
    errors: readonly ThreeMaterialFactoryError[],
  ): ThreeMaterialFactoryResult {
    return {
      material: createFallbackMaterial(),
      errors:
        errors.length > 0
          ? errors
          : [
              {
                code: 'unsupported_material',
                materialId,
                message: `Unsupported material "${materialId}".`,
              },
            ],
      fallbackUsed: true,
    };
  }
}

function resolveMaterialParameterValues(
  definition: MaterialDefinition,
  parameters: Readonly<Record<string, MaterialParameterValue>>,
): Record<string, MaterialParameterValue> {
  return Object.fromEntries(
    Object.entries(definition.parameters).map(([name, parameterDefinition]) => [
      name,
      parameters[name] ?? parameterDefinition.defaultValue,
    ]),
  );
}

function toFactoryError(
  materialId: string,
  issue: MaterialValidationIssue,
): ThreeMaterialFactoryError {
  return {
    code: issue.message.startsWith('Missing material definition')
      ? 'missing_material'
      : 'invalid_parameters',
    materialId,
    parameter: issue.path.startsWith('parameters.')
      ? issue.path.slice('parameters.'.length)
      : undefined,
    message: issue.message,
  };
}

function requireString(value: MaterialParameterValue, parameter: string): string {
  if (typeof value !== 'string') {
    throw new Error(`Expected "${parameter}" to be a string.`);
  }

  return value;
}

function requireNumber(value: MaterialParameterValue, parameter: string): number {
  if (typeof value !== 'number') {
    throw new Error(`Expected "${parameter}" to be a number.`);
  }

  return value;
}

function requireVec2(value: MaterialParameterValue, parameter: string): readonly [number, number] {
  if (!Array.isArray(value) || value.length !== 2) {
    throw new Error(`Expected "${parameter}" to be a vec2.`);
  }

  return [value[0], value[1]];
}

function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }

  return String(error);
}
