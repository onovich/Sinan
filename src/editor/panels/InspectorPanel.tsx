import type { EntityData } from '../../schemas/entity.schema';

export interface InspectorPanelProps {
  entity: EntityData | undefined;
  onTranslateSelected?: (delta: readonly [number, number, number]) => void;
  onInteractSelected?: () => void;
}

export function InspectorPanel({
  entity,
  onTranslateSelected,
  onInteractSelected,
}: InspectorPanelProps) {
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
      <section className="component-section" aria-labelledby="components-heading">
        <h3 id="components-heading">Components</h3>
        {Object.keys(entity.components).length > 0 ? (
          <ul className="component-list">
            {Object.entries(entity.components).map(([componentType, payload]) => (
              <li key={componentType}>
                <strong>{componentType}</strong>
                <pre>{JSON.stringify(payload, null, 2)}</pre>
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

function formatTuple(values: readonly number[]): string {
  return values.map((value) => Number(value.toFixed(3))).join(', ');
}

function formatCount(count: number, label: string): string {
  return `${count} ${label}${count === 1 ? '' : 's'}`;
}
