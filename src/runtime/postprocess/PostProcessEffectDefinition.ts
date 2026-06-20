import {
  type MaterialParameterDefinition,
  type MaterialValidationIssue,
  validateMaterialParameterDefinition,
} from '../materials';

export interface PostProcessEffectDefinition {
  id: string;
  version: number;
  displayName?: string;
  parameters: Readonly<Record<string, MaterialParameterDefinition>>;
}

export function isPostProcessEffectId(id: string): boolean {
  return /^[a-z][a-z0-9]*(?:[._-][a-z0-9]+)*$/.test(id);
}

export function validatePostProcessEffectDefinition(
  definition: PostProcessEffectDefinition,
): MaterialValidationIssue[] {
  const issues: MaterialValidationIssue[] = [];

  if (!isPostProcessEffectId(definition.id)) {
    issues.push({
      path: 'id',
      message: `Postprocess effect id "${definition.id}" must be a stable lowercase id.`,
    });
  }

  if (!Number.isInteger(definition.version) || definition.version <= 0) {
    issues.push({
      path: 'version',
      message: 'Postprocess effect definition version must be a positive integer.',
    });
  }

  const rawDefinition = definition as unknown as Record<string, unknown>;

  if ('uniforms' in rawDefinition || 'pass' in rawDefinition || 'composer' in rawDefinition) {
    issues.push({
      path: definition.id,
      message:
        'Postprocess effect definitions must not expose renderer pass or raw uniform details.',
    });
  }

  if (!isRecord(definition.parameters)) {
    issues.push({
      path: 'parameters',
      message: 'Postprocess effect definition parameters must be a record.',
    });
    return issues;
  }

  for (const [parameterName, parameterDefinition] of Object.entries(definition.parameters)) {
    issues.push(
      ...validateMaterialParameterDefinition(
        parameterName,
        parameterDefinition,
        `parameters.${parameterName}`,
      ),
    );
  }

  return issues;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
