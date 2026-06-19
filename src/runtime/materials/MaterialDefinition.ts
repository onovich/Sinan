import {
  type MaterialParameterDefinition,
  type MaterialParameterValidationOptions,
  type MaterialValidationIssue,
  validateMaterialParameterDefinition,
} from './MaterialParameter';

export interface MaterialDefinition {
  id: string;
  version: number;
  displayName?: string;
  parameters: Readonly<Record<string, MaterialParameterDefinition>>;
}

export function isMaterialDefinitionId(id: string): boolean {
  return /^[a-z][a-z0-9]*(?:[._-][a-z0-9]+)*$/.test(id);
}

export function validateMaterialDefinition(
  definition: MaterialDefinition,
  options: MaterialParameterValidationOptions = {},
): MaterialValidationIssue[] {
  const issues: MaterialValidationIssue[] = [];

  if (!isMaterialDefinitionId(definition.id)) {
    issues.push({
      path: 'id',
      message: `Material definition id "${definition.id}" must be a stable lowercase id.`,
    });
  }

  if (!Number.isInteger(definition.version) || definition.version <= 0) {
    issues.push({
      path: 'version',
      message: 'Material definition version must be a positive integer.',
    });
  }

  const rawDefinition = definition as unknown as Record<string, unknown>;

  if (
    'uniforms' in rawDefinition ||
    'vertexShader' in rawDefinition ||
    'fragmentShader' in rawDefinition
  ) {
    issues.push({
      path: definition.id,
      message: 'Material definitions must not expose GLSL source or raw uniforms.',
    });
  }

  if (!isRecord(definition.parameters)) {
    issues.push({
      path: 'parameters',
      message: 'Material definition parameters must be a record.',
    });
    return issues;
  }

  for (const [parameterName, parameterDefinition] of Object.entries(definition.parameters)) {
    issues.push(
      ...validateMaterialParameterDefinition(
        parameterName,
        parameterDefinition,
        `parameters.${parameterName}`,
        options,
      ),
    );
  }

  return issues;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
