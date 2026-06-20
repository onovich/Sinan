import type { ComponentPayloadData } from '../../schemas/component.schema';
import type {
  RenderableMaterialSlotData,
  RenderableMaterialSlotsData,
} from '../../schemas/material.schema';
import {
  createDefaultMaterialRegistry,
  type MaterialDefinition,
  type MaterialParameterDefinition,
  type MaterialParameterType,
  type MaterialParameterValue,
  type MaterialValidationIssue,
} from '../../runtime/materials';

export interface MaterialInspectableRenderable {
  model: string;
  renderStyle?: unknown;
  materials?: RenderableMaterialSlotsData;
}

export interface MaterialInspectorProps {
  entityId: string;
  renderable: MaterialInspectableRenderable;
  onApplyComponent?: (
    entityId: string,
    componentType: string,
    payload: ComponentPayloadData,
  ) => void;
  onValidationIssues?: (issues: string[]) => void;
}

const materialRegistry = createDefaultMaterialRegistry();

export function MaterialInspector({
  entityId,
  renderable,
  onApplyComponent,
  onValidationIssues,
}: MaterialInspectorProps) {
  const materialSlots = Object.entries(renderable.materials ?? {});

  return (
    <section className="material-inspector" aria-labelledby="material-inspector-heading">
      <h3 id="material-inspector-heading">Materials</h3>
      {materialSlots.length > 0 ? (
        <ul className="material-slot-list">
          {materialSlots.map(([slotName, materialSlot]) => (
            <MaterialSlotInspector
              key={slotName}
              entityId={entityId}
              renderable={renderable}
              slotName={slotName}
              materialSlot={materialSlot}
              onApplyComponent={onApplyComponent}
              onValidationIssues={onValidationIssues}
            />
          ))}
        </ul>
      ) : (
        <p className="panel-empty">No custom material slots</p>
      )}
    </section>
  );
}

interface MaterialSlotInspectorProps {
  entityId: string;
  renderable: MaterialInspectableRenderable;
  slotName: string;
  materialSlot: RenderableMaterialSlotData;
  onApplyComponent?: (
    entityId: string,
    componentType: string,
    payload: ComponentPayloadData,
  ) => void;
  onValidationIssues?: (issues: string[]) => void;
}

function MaterialSlotInspector({
  entityId,
  renderable,
  slotName,
  materialSlot,
  onApplyComponent,
  onValidationIssues,
}: MaterialSlotInspectorProps) {
  const definition = materialRegistry.get(materialSlot.materialId);
  const validationIssues = getMaterialSlotValidationIssues(materialSlot, definition);

  return (
    <li className="material-slot-item">
      <div className="material-slot-header">
        <div>
          <strong>{definition?.displayName ?? materialSlot.materialId}</strong>
          <span>
            {slotName} / {materialSlot.materialId}
          </span>
        </div>
        <span className="material-status-pill" data-tone={validationIssues.length ? 'error' : 'ok'}>
          {validationIssues.length ? 'Issues' : 'Valid'}
        </span>
      </div>
      {validationIssues.length > 0 ? (
        <ul className="material-validation-list" role="alert">
          {validationIssues.map((issue) => (
            <li key={`${issue.path}:${issue.message}`}>{formatMaterialIssue(issue)}</li>
          ))}
        </ul>
      ) : null}
      {definition ? (
        <ul className="material-parameter-list">
          {Object.entries(definition.parameters).map(([parameterName, parameterDefinition]) => (
            <MaterialParameterEditor
              key={parameterName}
              entityId={entityId}
              renderable={renderable}
              slotName={slotName}
              materialSlot={materialSlot}
              definition={definition}
              parameterName={parameterName}
              parameterDefinition={parameterDefinition}
              onApplyComponent={onApplyComponent}
              onValidationIssues={onValidationIssues}
            />
          ))}
        </ul>
      ) : null}
    </li>
  );
}

interface MaterialParameterEditorProps {
  entityId: string;
  renderable: MaterialInspectableRenderable;
  slotName: string;
  materialSlot: RenderableMaterialSlotData;
  definition: MaterialDefinition;
  parameterName: string;
  parameterDefinition: MaterialParameterDefinition;
  onApplyComponent?: (
    entityId: string,
    componentType: string,
    payload: ComponentPayloadData,
  ) => void;
  onValidationIssues?: (issues: string[]) => void;
}

function MaterialParameterEditor({
  entityId,
  renderable,
  slotName,
  materialSlot,
  definition,
  parameterName,
  parameterDefinition,
  onApplyComponent,
  onValidationIssues,
}: MaterialParameterEditorProps) {
  const parameterValue =
    materialSlot.parameters?.[parameterName] ?? parameterDefinition.defaultValue;
  const isOverridden = Object.prototype.hasOwnProperty.call(
    materialSlot.parameters ?? {},
    parameterName,
  );
  const parameterLabel = parameterDefinition.label ?? parameterName;

  return (
    <li>
      <form
        key={`${slotName}-${parameterName}-${formatMaterialValue(parameterValue)}`}
        className="material-parameter-form"
        aria-label={`${slotName} ${parameterLabel} material parameter`}
        onSubmit={(event) => {
          event.preventDefault();

          if (!onApplyComponent) {
            return;
          }

          const nextValue = readMaterialParameterForm(
            parameterDefinition.type,
            new FormData(event.currentTarget),
          );
          const validationIssues = materialRegistry.validateParameters(definition.id, {
            [parameterName]: nextValue,
          });

          if (validationIssues.length > 0) {
            onValidationIssues?.(validationIssues.map(formatMaterialIssue));
            return;
          }

          onValidationIssues?.([]);
          onApplyComponent(
            entityId,
            'Renderable',
            updateRenderableMaterialParameter(renderable, slotName, parameterName, nextValue),
          );
        }}
      >
        <div className="material-parameter-header">
          <div>
            <strong>{parameterLabel}</strong>
            <span>{parameterName}</span>
          </div>
          <span>{isOverridden ? 'Overridden' : 'Default'}</span>
        </div>
        <div className="material-parameter-meta">
          <span>Current {formatMaterialValue(parameterValue)}</span>
          <span>Default {formatMaterialValue(parameterDefinition.defaultValue)}</span>
        </div>
        {renderMaterialParameterInput(parameterDefinition, parameterValue)}
        <button type="submit" disabled={!onApplyComponent}>
          Apply
        </button>
      </form>
    </li>
  );
}

export function updateRenderableMaterialParameter(
  renderable: MaterialInspectableRenderable,
  slotName: string,
  parameterName: string,
  value: MaterialParameterValue,
): ComponentPayloadData {
  const materialSlots = renderable.materials ?? {};
  const materialSlot = materialSlots[slotName];

  if (!materialSlot) {
    return { ...renderable };
  }

  return {
    ...renderable,
    materials: {
      ...materialSlots,
      [slotName]: {
        ...materialSlot,
        parameters: {
          ...(materialSlot.parameters ?? {}),
          [parameterName]: value,
        },
      },
    },
  };
}

function getMaterialSlotValidationIssues(
  materialSlot: RenderableMaterialSlotData,
  definition: MaterialDefinition | undefined,
): MaterialValidationIssue[] {
  if (!definition) {
    return [
      {
        path: 'materialId',
        message: `Missing material definition "${materialSlot.materialId}".`,
      },
    ];
  }

  return materialRegistry.validateParameters(materialSlot.materialId, materialSlot.parameters);
}

function renderMaterialParameterInput(
  definition: MaterialParameterDefinition,
  value: MaterialParameterValue,
) {
  switch (definition.type) {
    case 'number':
      return (
        <input
          name="value"
          type="number"
          min={definition.min}
          max={definition.max}
          step={definition.step ?? 0.01}
          defaultValue={formatNumberInput(typeof value === 'number' ? value : NaN)}
        />
      );
    case 'boolean':
      return <input name="value" type="checkbox" defaultChecked={value === true} />;
    case 'color':
      return (
        <input
          name="value"
          type="color"
          defaultValue={typeof value === 'string' ? value.slice(0, 7) : '#ffffff'}
        />
      );
    case 'vec2':
      return <MaterialVectorInput length={2} value={value} />;
    case 'vec3':
      return <MaterialVectorInput length={3} value={value} />;
    case 'texture':
      return (
        <input
          name="value"
          defaultValue={typeof value === 'string' ? value : ''}
          placeholder="texture.asset_id"
        />
      );
  }
}

function MaterialVectorInput({ length, value }: { length: 2 | 3; value: MaterialParameterValue }) {
  const values = Array.isArray(value) ? value : [];

  return (
    <fieldset className="material-vector-field">
      <legend>{length === 2 ? 'Vector 2' : 'Vector 3'}</legend>
      {Array.from({ length }, (_, index) => (
        <label key={index}>
          {formatAxis(index)}
          <input
            name={`value.${index}`}
            type="number"
            step="0.01"
            defaultValue={formatNumberInput(
              typeof values[index] === 'number' ? values[index] : NaN,
            )}
          />
        </label>
      ))}
    </fieldset>
  );
}

function readMaterialParameterForm(
  type: MaterialParameterType,
  formData: FormData,
): MaterialParameterValue {
  switch (type) {
    case 'number':
      return readStrictNumber(formData, 'value');
    case 'boolean':
      return formData.get('value') === 'on';
    case 'color':
      return readFormText(formData, 'value');
    case 'vec2':
      return [readStrictNumber(formData, 'value.0'), readStrictNumber(formData, 'value.1')];
    case 'vec3':
      return [
        readStrictNumber(formData, 'value.0'),
        readStrictNumber(formData, 'value.1'),
        readStrictNumber(formData, 'value.2'),
      ];
    case 'texture': {
      const value = readFormText(formData, 'value');
      return value ? value : null;
    }
  }
}

function formatMaterialIssue(issue: MaterialValidationIssue): string {
  return `${issue.path}: ${issue.message}`;
}

function formatMaterialValue(value: MaterialParameterValue): string {
  if (Array.isArray(value)) {
    return value.map((entry) => formatNumberInput(entry)).join(', ');
  }

  if (typeof value === 'number') {
    return formatNumberInput(value);
  }

  if (typeof value === 'boolean') {
    return value ? 'true' : 'false';
  }

  if (typeof value === 'string') {
    return value;
  }

  return 'None';
}

function formatNumberInput(value: number): string {
  return Number.isFinite(value) ? Number(value.toFixed(4)).toString() : '';
}

function formatAxis(index: number): string {
  return ['X', 'Y', 'Z'][index] ?? String(index + 1);
}

function readStrictNumber(formData: FormData, name: string): number {
  const raw = readFormText(formData, name);
  const value = Number(raw);

  return raw && Number.isFinite(value) ? value : Number.NaN;
}

function readFormText(formData: FormData, name: string): string {
  const value = formData.get(name);

  return typeof value === 'string' ? value.trim() : '';
}
