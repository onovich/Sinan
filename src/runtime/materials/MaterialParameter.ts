export const MATERIAL_PARAMETER_TYPES = [
  'number',
  'boolean',
  'color',
  'vec2',
  'vec3',
  'texture',
] as const;

export type MaterialParameterType = (typeof MATERIAL_PARAMETER_TYPES)[number];
export type MaterialParameterTimelineMode = 'continuous' | 'discrete' | 'disabled';
export type MaterialVec2 = readonly [number, number];
export type MaterialVec3 = readonly [number, number, number];
export type MaterialParameterValue = number | boolean | string | MaterialVec2 | MaterialVec3 | null;

export interface MaterialParameterDefinition {
  type: MaterialParameterType;
  defaultValue: MaterialParameterValue;
  min?: number;
  max?: number;
  step?: number;
  timeline?: MaterialParameterTimelineMode;
  label?: string;
  description?: string;
}

export interface MaterialValidationIssue {
  path: string;
  message: string;
}

export interface MaterialParameterValidationOptions {
  textureAssetIds?: ReadonlySet<string>;
}

export function isMaterialParameterType(value: unknown): value is MaterialParameterType {
  return (
    typeof value === 'string' && MATERIAL_PARAMETER_TYPES.includes(value as MaterialParameterType)
  );
}

export function isPublicMaterialParameterName(name: string): boolean {
  return /^[a-z][A-Za-z0-9]*(?:[._-][A-Za-z0-9]+)*$/.test(name) && !/^u[A-Z]/.test(name);
}

export function validateMaterialParameterDefinition(
  parameterName: string,
  definition: MaterialParameterDefinition,
  path = `parameters.${parameterName}`,
  options: MaterialParameterValidationOptions = {},
): MaterialValidationIssue[] {
  const issues: MaterialValidationIssue[] = [];
  const rawDefinition = definition as unknown as Record<string, unknown>;

  if (!isPublicMaterialParameterName(parameterName)) {
    issues.push({
      path,
      message: `Material parameter "${parameterName}" must be a public name and must not look like a raw uniform name.`,
    });
  }

  if ('uniformName' in rawDefinition || 'uniform' in rawDefinition) {
    issues.push({
      path,
      message: 'Material parameter definitions must not expose raw uniform names.',
    });
  }

  if (!isMaterialParameterType(definition.type)) {
    issues.push({
      path: `${path}.type`,
      message: `Unsupported material parameter type "${String(definition.type)}".`,
    });
    return issues;
  }

  if (definition.type === 'number') {
    addNumberMetadataIssues(definition, path, issues);
  } else if (
    definition.min !== undefined ||
    definition.max !== undefined ||
    definition.step !== undefined
  ) {
    issues.push({
      path,
      message: `Bounds are only supported for number parameters, not "${definition.type}".`,
    });
  }

  if (definition.timeline === 'continuous' && !isContinuousParameterType(definition.type)) {
    issues.push({
      path: `${path}.timeline`,
      message: `Material parameter type "${definition.type}" cannot be exposed as a continuous timeline value.`,
    });
  }

  issues.push(
    ...validateMaterialParameterValue(
      parameterName,
      definition,
      definition.defaultValue,
      `${path}.defaultValue`,
      options,
    ),
  );

  return issues;
}

export function validateMaterialParameterValue(
  parameterName: string,
  definition: Pick<MaterialParameterDefinition, 'type' | 'min' | 'max'>,
  value: MaterialParameterValue,
  path = `parameters.${parameterName}`,
  options: MaterialParameterValidationOptions = {},
): MaterialValidationIssue[] {
  if (!isMaterialParameterType(definition.type)) {
    return [
      {
        path,
        message: `Unsupported material parameter type "${String(definition.type)}".`,
      },
    ];
  }

  switch (definition.type) {
    case 'number':
      return validateNumberValue(definition, value, path);
    case 'boolean':
      return typeof value === 'boolean' ? [] : typeIssue(path, 'boolean');
    case 'color':
      return isColorValue(value) ? [] : typeIssue(path, 'hex color string');
    case 'vec2':
      return isNumberTuple(value, 2) ? [] : typeIssue(path, 'vec2 tuple');
    case 'vec3':
      return isNumberTuple(value, 3) ? [] : typeIssue(path, 'vec3 tuple');
    case 'texture':
      return validateTextureValue(value, path, options);
  }
}

function addNumberMetadataIssues(
  definition: MaterialParameterDefinition,
  path: string,
  issues: MaterialValidationIssue[],
): void {
  if (definition.min !== undefined && !Number.isFinite(definition.min)) {
    issues.push({ path: `${path}.min`, message: 'Number parameter min must be finite.' });
  }

  if (definition.max !== undefined && !Number.isFinite(definition.max)) {
    issues.push({ path: `${path}.max`, message: 'Number parameter max must be finite.' });
  }

  if (
    definition.min !== undefined &&
    definition.max !== undefined &&
    definition.min > definition.max
  ) {
    issues.push({ path, message: 'Number parameter min must be less than or equal to max.' });
  }

  if (
    definition.step !== undefined &&
    (!Number.isFinite(definition.step) || definition.step <= 0)
  ) {
    issues.push({ path: `${path}.step`, message: 'Number parameter step must be positive.' });
  }
}

function validateNumberValue(
  definition: Pick<MaterialParameterDefinition, 'min' | 'max'>,
  value: MaterialParameterValue,
  path: string,
): MaterialValidationIssue[] {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    return typeIssue(path, 'finite number');
  }

  const issues: MaterialValidationIssue[] = [];

  if (definition.min !== undefined && value < definition.min) {
    issues.push({ path, message: `Number value ${value} is below min ${definition.min}.` });
  }

  if (definition.max !== undefined && value > definition.max) {
    issues.push({ path, message: `Number value ${value} is above max ${definition.max}.` });
  }

  return issues;
}

function validateTextureValue(
  value: MaterialParameterValue,
  path: string,
  options: MaterialParameterValidationOptions,
): MaterialValidationIssue[] {
  if (value === null) {
    return [];
  }

  if (typeof value !== 'string' || value.trim().length === 0) {
    return typeIssue(path, 'texture asset id string or null');
  }

  if (options.textureAssetIds && !options.textureAssetIds.has(value)) {
    return [{ path, message: `Missing texture asset "${value}".` }];
  }

  return [];
}

function isContinuousParameterType(type: MaterialParameterType): boolean {
  return type === 'number' || type === 'color' || type === 'vec2' || type === 'vec3';
}

function isColorValue(value: MaterialParameterValue): boolean {
  return typeof value === 'string' && /^#[0-9A-Fa-f]{6}([0-9A-Fa-f]{2})?$/.test(value);
}

function isNumberTuple(value: MaterialParameterValue, length: number): boolean {
  return (
    Array.isArray(value) &&
    value.length === length &&
    value.every((entry) => typeof entry === 'number' && Number.isFinite(entry))
  );
}

function typeIssue(path: string, expected: string): MaterialValidationIssue[] {
  return [{ path, message: `Expected ${expected}.` }];
}
