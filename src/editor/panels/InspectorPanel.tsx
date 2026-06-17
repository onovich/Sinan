import { useState } from 'react';

import {
  isKnownComponentType,
  parseKnownComponentPayload,
  type KnownComponentType,
} from '../../schemas/component.schema';
import type { ComponentPayloadData, EntityData } from '../../schemas/entity.schema';
import { TransformSchema, type TransformData } from '../../schemas/transform.schema';

export interface InspectorPanelProps {
  entity: EntityData | undefined;
  onApplyTransform?: (entityId: string, transform: TransformData) => void;
  onApplyComponent?: (
    entityId: string,
    componentType: string,
    payload: ComponentPayloadData,
  ) => void;
  onTranslateSelected?: (delta: readonly [number, number, number]) => void;
  onInteractSelected?: () => void;
}

export function InspectorPanel({
  entity,
  onApplyTransform,
  onApplyComponent,
  onTranslateSelected,
  onInteractSelected,
}: InspectorPanelProps) {
  const [validationState, setValidationState] = useState<{
    entityId: string;
    issues: string[];
  } | null>(null);

  if (!entity) {
    return (
      <section aria-labelledby="inspector-heading">
        <div className="panel-heading-row">
          <h2 id="inspector-heading">Inspector</h2>
          <span className="panel-count">No selection</span>
        </div>
        <p className="panel-empty">No entity selected</p>
      </section>
    );
  }

  const validationIssues = validationState?.entityId === entity.id ? validationState.issues : [];

  return (
    <section aria-labelledby="inspector-heading">
      <div className="panel-heading-row">
        <h2 id="inspector-heading">Inspector</h2>
        <span className="panel-count">
          {formatCount(Object.keys(entity.components).length, 'component')}
        </span>
      </div>
      <div className="inspector-entity-card">
        <strong>{entity.name ?? entity.id}</strong>
        <span>{entity.prefab ?? 'No prefab'}</span>
      </div>
      <dl className="inspector-list">
        <div>
          <dt>Entity</dt>
          <dd>{entity.id}</dd>
        </div>
        <div>
          <dt>Prefab</dt>
          <dd>{entity.prefab ?? 'None'}</dd>
        </div>
        <div>
          <dt>Position</dt>
          <dd>{formatTuple(entity.transform.position)}</dd>
        </div>
        <div>
          <dt>Rotation</dt>
          <dd>{formatTuple(entity.transform.rotation)}</dd>
        </div>
        <div>
          <dt>Scale</dt>
          <dd>{formatTuple(entity.transform.scale)}</dd>
        </div>
      </dl>
      <form
        key={`transform-form-${entity.id}-${JSON.stringify(entity.transform)}`}
        className="structured-form"
        aria-label="Transform editor"
        onSubmit={(event) => {
          event.preventDefault();
          const transform = readTransformForm(new FormData(event.currentTarget));
          const result = TransformSchema.safeParse(transform);

          if (!result.success) {
            setValidationState({
              entityId: entity.id,
              issues: formatZodIssues(result.error.issues),
            });
            return;
          }

          setValidationState(null);
          onApplyTransform?.(entity.id, result.data);
        }}
      >
        <h3>Transform</h3>
        <VectorField name="position" label="Position" values={entity.transform.position} />
        <VectorField name="rotation" label="Rotation" values={entity.transform.rotation} />
        <VectorField name="scale" label="Scale" values={entity.transform.scale} />
        <button type="submit" disabled={!onApplyTransform}>
          Apply Transform
        </button>
      </form>
      {onTranslateSelected ? (
        <section className="transform-nudge" aria-labelledby="transform-nudge-heading">
          <h3 id="transform-nudge-heading">Position</h3>
          <div>
            <button type="button" onClick={() => onTranslateSelected([-0.25, 0, 0])}>
              X -
            </button>
            <button type="button" onClick={() => onTranslateSelected([0.25, 0, 0])}>
              X +
            </button>
            <button type="button" onClick={() => onTranslateSelected([0, 0, -0.25])}>
              Z -
            </button>
            <button type="button" onClick={() => onTranslateSelected([0, 0, 0.25])}>
              Z +
            </button>
          </div>
        </section>
      ) : null}
      {onInteractSelected ? (
        <section className="inspector-actions" aria-labelledby="inspector-actions-heading">
          <h3 id="inspector-actions-heading">Actions</h3>
          <button type="button" onClick={onInteractSelected}>
            Interact
          </button>
        </section>
      ) : null}
      {validationIssues.length > 0 ? (
        <ul className="validation-list" role="alert">
          {validationIssues.map((issue) => (
            <li key={issue}>{issue}</li>
          ))}
        </ul>
      ) : null}
      <section className="component-section" aria-labelledby="components-heading">
        <h3 id="components-heading">Components</h3>
        {Object.keys(entity.components).length > 0 ? (
          <ul className="component-list">
            {Object.entries(entity.components).map(([componentType, payload]) => (
              <li key={componentType}>
                <div className="component-card-header">
                  <strong>{componentType}</strong>
                  <span>
                    {onApplyComponent && isKnownComponentType(componentType)
                      ? 'Structured'
                      : 'Read only'}
                  </span>
                </div>
                {onApplyComponent && isKnownComponentType(componentType) ? (
                  <KnownComponentForm
                    key={`${entity.id}-${componentType}-${JSON.stringify(payload)}`}
                    componentType={componentType}
                    payload={payload}
                    onSubmit={(nextPayload) => {
                      const result = parseKnownComponentPayload(componentType, nextPayload);

                      if (!result?.success) {
                        setValidationState({
                          entityId: entity.id,
                          issues: result
                            ? formatZodIssues(result.error.issues)
                            : ['Unknown component.'],
                        });
                        return;
                      }

                      setValidationState(null);
                      onApplyComponent(entity.id, componentType, result.data);
                    }}
                  />
                ) : (
                  <pre>{JSON.stringify(payload, null, 2)}</pre>
                )}
              </li>
            ))}
          </ul>
        ) : (
          <p className="panel-empty">None</p>
        )}
      </section>
    </section>
  );
}

interface KnownComponentFormProps {
  componentType: KnownComponentType;
  payload: unknown;
  onSubmit: (payload: ComponentPayloadData) => void;
}

function KnownComponentForm({ componentType, payload, onSubmit }: KnownComponentFormProps) {
  const component = asRecord(payload);

  return (
    <form
      className="structured-form component-form"
      aria-label={`${componentType} component editor`}
      onSubmit={(event) => {
        event.preventDefault();
        onSubmit(readComponentForm(componentType, component, new FormData(event.currentTarget)));
      }}
    >
      {renderComponentFields(componentType, component)}
      <button type="submit">Apply Component</button>
    </form>
  );
}

function renderComponentFields(
  componentType: KnownComponentType,
  component: Record<string, unknown>,
) {
  if (componentType === 'Renderable') {
    return (
      <label className="field-stack">
        Model
        <input name="model" defaultValue={getString(component, 'model')} />
      </label>
    );
  }

  if (componentType === 'Door') {
    return (
      <>
        <label className="check-field">
          <input name="locked" type="checkbox" defaultChecked={getBoolean(component, 'locked')} />
          Locked
        </label>
        <label className="field-stack">
          Required key
          <input name="requiredKey" defaultValue={getString(component, 'requiredKey')} />
        </label>
        <div className="form-grid">
          <label className="field-stack">
            Open angle
            <input
              name="openAngle"
              type="number"
              step="1"
              defaultValue={getOptionalNumberString(component, 'openAngle')}
            />
          </label>
          <label className="field-stack">
            Open duration
            <input
              name="openDuration"
              type="number"
              step="0.01"
              defaultValue={getOptionalNumberString(component, 'openDuration')}
            />
          </label>
        </div>
      </>
    );
  }

  if (componentType === 'Switch') {
    return (
      <label className="check-field">
        <input
          name="initialState"
          type="checkbox"
          defaultChecked={getBoolean(component, 'initialState') || getBoolean(component, 'isOn')}
        />
        Initially on
      </label>
    );
  }

  if (componentType === 'Interactable') {
    return (
      <label className="field-stack">
        Prompt
        <input name="prompt" defaultValue={getString(component, 'prompt')} />
      </label>
    );
  }

  if (componentType === 'Collider') {
    return (
      <>
        <VectorField
          name="center"
          label="Center"
          values={getVector(component, 'center', [0, 0, 0])}
        />
        <VectorField name="size" label="Size" values={getVector(component, 'size', [1, 1, 1])} />
        <label className="check-field">
          <input
            name="isTrigger"
            type="checkbox"
            defaultChecked={getBoolean(component, 'isTrigger')}
          />
          Trigger collider
        </label>
        <label className="field-stack">
          Debug color
          <input name="debugColor" defaultValue={getString(component, 'debugColor')} />
        </label>
      </>
    );
  }

  if (componentType === 'TriggerZone') {
    return (
      <label className="check-field">
        <input
          name="enabled"
          type="checkbox"
          defaultChecked={getBoolean(component, 'enabled', true)}
        />
        Enabled
      </label>
    );
  }

  return (
    <label className="field-stack">
      Kind
      <input name="kind" defaultValue={getString(component, 'kind') || 'default'} />
    </label>
  );
}

interface VectorFieldProps {
  name: string;
  label: string;
  values: readonly number[];
}

function VectorField({ name, label, values }: VectorFieldProps) {
  return (
    <fieldset className="vector-field">
      <legend>{label}</legend>
      {values.map((value, index) => (
        <label key={`${name}-${index}`}>
          {formatAxis(index)}
          <input
            aria-label={`${label} ${formatAxis(index)}`}
            name={`${name}.${index}`}
            type="number"
            step="0.01"
            defaultValue={formatNumberInput(value)}
          />
        </label>
      ))}
    </fieldset>
  );
}

function readTransformForm(formData: FormData): TransformData {
  return {
    position: readVector(formData, 'position', 3),
    rotation: readVector(formData, 'rotation', 4),
    scale: readVector(formData, 'scale', 3),
  };
}

function readComponentForm(
  componentType: KnownComponentType,
  current: Record<string, unknown>,
  formData: FormData,
): ComponentPayloadData {
  if (componentType === 'Renderable') {
    return { model: readString(formData, 'model') };
  }

  if (componentType === 'Door') {
    return removeUndefined({
      locked: readCheckbox(formData, 'locked'),
      requiredKey: readOptionalString(formData, 'requiredKey'),
      openAngle: readOptionalNumber(formData, 'openAngle'),
      openDuration: readOptionalNumber(formData, 'openDuration'),
      openAmount: getOptionalNumber(current, 'openAmount'),
    });
  }

  if (componentType === 'Switch') {
    return { initialState: readCheckbox(formData, 'initialState') };
  }

  if (componentType === 'Interactable') {
    return removeUndefined({ prompt: readOptionalString(formData, 'prompt') });
  }

  if (componentType === 'Collider') {
    return removeUndefined({
      shape: 'aabb',
      center: readVector(formData, 'center', 3),
      size: readVector(formData, 'size', 3),
      isTrigger: readCheckbox(formData, 'isTrigger'),
      debugColor: readOptionalString(formData, 'debugColor'),
    });
  }

  if (componentType === 'TriggerZone') {
    return { enabled: readCheckbox(formData, 'enabled') };
  }

  return { kind: readString(formData, 'kind') || 'default' };
}

function formatTuple(values: readonly number[]): string {
  return values.map((value) => Number(value.toFixed(3))).join(', ');
}

function formatCount(count: number, label: string): string {
  return `${count} ${label}${count === 1 ? '' : 's'}`;
}

function formatAxis(index: number): string {
  return ['X', 'Y', 'Z', 'W'][index] ?? String(index + 1);
}

function formatNumberInput(value: number): string {
  return Number(value.toFixed(4)).toString();
}

function formatZodIssues(
  issues: ReadonlyArray<{ path: PropertyKey[]; message: string }>,
): string[] {
  return issues.map((issue) =>
    issue.path.length > 0 ? `${issue.path.join('.')}: ${issue.message}` : issue.message,
  );
}

function readVector(formData: FormData, name: string, length: 3): [number, number, number];
function readVector(formData: FormData, name: string, length: 4): [number, number, number, number];
function readVector(formData: FormData, name: string, length: 3 | 4) {
  return Array.from({ length }, (_, index) => readNumber(formData, `${name}.${index}`));
}

function readNumber(formData: FormData, name: string): number {
  const value = Number(formData.get(name));

  return Number.isFinite(value) ? value : Number.NaN;
}

function readOptionalNumber(formData: FormData, name: string): number | undefined {
  const raw = readFormText(formData, name);

  if (!raw) {
    return undefined;
  }

  const value = Number(raw);

  return Number.isFinite(value) ? value : Number.NaN;
}

function readString(formData: FormData, name: string): string {
  return readFormText(formData, name);
}

function readOptionalString(formData: FormData, name: string): string | undefined {
  const value = readString(formData, name);

  return value ? value : undefined;
}

function readCheckbox(formData: FormData, name: string): boolean {
  return formData.get(name) === 'on';
}

function readFormText(formData: FormData, name: string): string {
  const value = formData.get(name);

  return typeof value === 'string' ? value.trim() : '';
}

function asRecord(value: unknown): Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function getString(payload: Record<string, unknown>, key: string): string {
  const value = payload[key];

  return typeof value === 'string' ? value : '';
}

function getBoolean(payload: Record<string, unknown>, key: string, fallback = false): boolean {
  const value = payload[key];

  return typeof value === 'boolean' ? value : fallback;
}

function getOptionalNumber(payload: Record<string, unknown>, key: string): number | undefined {
  const value = payload[key];

  return typeof value === 'number' ? value : undefined;
}

function getOptionalNumberString(payload: Record<string, unknown>, key: string): string {
  const value = getOptionalNumber(payload, key);

  return value === undefined ? '' : formatNumberInput(value);
}

function getVector(
  payload: Record<string, unknown>,
  key: string,
  fallback: [number, number, number],
): [number, number, number] {
  const value = payload[key];

  if (
    Array.isArray(value) &&
    value.length === 3 &&
    value.every((item): item is number => typeof item === 'number')
  ) {
    return [value[0], value[1], value[2]];
  }

  return fallback;
}

function removeUndefined(payload: Record<string, unknown>): ComponentPayloadData {
  return Object.fromEntries(Object.entries(payload).filter(([, value]) => value !== undefined));
}
