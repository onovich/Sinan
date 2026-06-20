import {
  type MaterialParameterValue,
  type MaterialValidationIssue,
  validateMaterialParameterValue,
} from '../materials';
import type { PostProcessEffectDefinition } from './PostProcessEffectDefinition';
import { validatePostProcessEffectDefinition } from './PostProcessEffectDefinition';

export class PostProcessRegistryError extends Error {
  constructor(
    message: string,
    readonly issues: readonly MaterialValidationIssue[] = [],
  ) {
    super(message);
    this.name = 'PostProcessRegistryError';
  }
}

export class PostProcessRegistry {
  private readonly definitions = new Map<string, PostProcessEffectDefinition>();

  constructor(definitions: readonly PostProcessEffectDefinition[] = []) {
    for (const definition of definitions) {
      this.register(definition);
    }
  }

  register(definition: PostProcessEffectDefinition): void {
    const issues = validatePostProcessEffectDefinition(definition);

    if (issues.length > 0) {
      throw new PostProcessRegistryError(
        `Postprocess effect definition "${definition.id}" is invalid.`,
        issues,
      );
    }

    if (this.definitions.has(definition.id)) {
      throw new PostProcessRegistryError(
        `Duplicate postprocess effect definition "${definition.id}".`,
        [
          {
            path: definition.id,
            message: `Duplicate postprocess effect definition "${definition.id}".`,
          },
        ],
      );
    }

    this.definitions.set(definition.id, definition);
  }

  get(effectId: string): PostProcessEffectDefinition | undefined {
    return this.definitions.get(effectId);
  }

  list(): PostProcessEffectDefinition[] {
    return [...this.definitions.values()];
  }

  resolveParameters(
    effectId: string,
    parameters: Readonly<Record<string, MaterialParameterValue>> = {},
  ): Record<string, MaterialParameterValue> | undefined {
    const definition = this.get(effectId);

    if (!definition) {
      return undefined;
    }

    return Object.fromEntries(
      Object.entries(definition.parameters).map(([name, parameterDefinition]) => [
        name,
        parameters[name] ?? parameterDefinition.defaultValue,
      ]),
    );
  }

  validateParameters(
    effectId: string,
    parameters: Readonly<Record<string, MaterialParameterValue>> = {},
  ): MaterialValidationIssue[] {
    const definition = this.get(effectId);

    if (!definition) {
      return [
        {
          path: 'effectId',
          message: `Missing postprocess effect definition "${effectId}".`,
        },
      ];
    }

    const issues: MaterialValidationIssue[] = [];

    for (const [parameterName, value] of Object.entries(parameters)) {
      const parameterDefinition = definition.parameters[parameterName];

      if (!parameterDefinition) {
        issues.push({
          path: `parameters.${parameterName}`,
          message: `Unknown postprocess parameter "${parameterName}" for effect "${effectId}".`,
        });
        continue;
      }

      issues.push(
        ...validateMaterialParameterValue(
          parameterName,
          parameterDefinition,
          value,
          `parameters.${parameterName}`,
        ),
      );
    }

    return issues;
  }
}
