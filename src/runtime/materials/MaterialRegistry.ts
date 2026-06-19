import type { MaterialDefinition } from './MaterialDefinition';
import { validateMaterialDefinition } from './MaterialDefinition';
import {
  type MaterialParameterValidationOptions,
  type MaterialParameterValue,
  type MaterialValidationIssue,
  validateMaterialParameterValue,
} from './MaterialParameter';

export class MaterialRegistryError extends Error {
  constructor(
    message: string,
    readonly issues: readonly MaterialValidationIssue[] = [],
  ) {
    super(message);
    this.name = 'MaterialRegistryError';
  }
}

export class MaterialRegistry {
  private readonly definitions = new Map<string, MaterialDefinition>();

  constructor(definitions: readonly MaterialDefinition[] = []) {
    for (const definition of definitions) {
      this.register(definition);
    }
  }

  register(definition: MaterialDefinition): void {
    const issues = validateMaterialDefinition(definition);

    if (issues.length > 0) {
      throw new MaterialRegistryError(`Material definition "${definition.id}" is invalid.`, issues);
    }

    if (this.definitions.has(definition.id)) {
      throw new MaterialRegistryError(`Duplicate material definition "${definition.id}".`, [
        {
          path: definition.id,
          message: `Duplicate material definition "${definition.id}".`,
        },
      ]);
    }

    this.definitions.set(definition.id, definition);
  }

  get(materialId: string): MaterialDefinition | undefined {
    return this.definitions.get(materialId);
  }

  require(materialId: string): MaterialDefinition {
    const definition = this.get(materialId);

    if (!definition) {
      throw new MaterialRegistryError(`Missing material definition "${materialId}".`, [
        {
          path: materialId,
          message: `Missing material definition "${materialId}".`,
        },
      ]);
    }

    return definition;
  }

  list(): MaterialDefinition[] {
    return [...this.definitions.values()];
  }

  validateParameters(
    materialId: string,
    parameters: Readonly<Record<string, MaterialParameterValue>> = {},
    options: MaterialParameterValidationOptions = {},
  ): MaterialValidationIssue[] {
    const definition = this.get(materialId);

    if (!definition) {
      return [
        {
          path: 'materialId',
          message: `Missing material definition "${materialId}".`,
        },
      ];
    }

    const issues: MaterialValidationIssue[] = [];

    for (const [parameterName, value] of Object.entries(parameters)) {
      const parameterDefinition = definition.parameters[parameterName];

      if (!parameterDefinition) {
        issues.push({
          path: `parameters.${parameterName}`,
          message: `Unknown material parameter "${parameterName}" for material "${materialId}".`,
        });
        continue;
      }

      issues.push(
        ...validateMaterialParameterValue(
          parameterName,
          parameterDefinition,
          value,
          `parameters.${parameterName}`,
          options,
        ),
      );
    }

    return issues;
  }
}
