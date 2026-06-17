import type { LevelData } from '../../schemas/level.schema';

export interface HierarchyPanelProps {
  level: LevelData | null;
  selectedEntityId: string | undefined;
  onSelectEntity: (entityId: string) => void;
}

export function HierarchyPanel({ level, selectedEntityId, onSelectEntity }: HierarchyPanelProps) {
  const entityCount = level?.entities.length ?? 0;

  return (
    <section aria-labelledby="hierarchy-heading">
      <PanelHeading
        id="hierarchy-heading"
        title="Hierarchy"
        meta={level ? formatCount(entityCount, 'entity') : 'Loading'}
      />
      <ul className="entity-list" aria-label="Level entities">
        {level?.entities.map((entity) => (
          <li key={entity.id}>
            <button
              type="button"
              className={entity.id === selectedEntityId ? 'is-selected' : undefined}
              aria-pressed={entity.id === selectedEntityId}
              onClick={() => onSelectEntity(entity.id)}
            >
              <span className="entity-name">{entity.name ?? entity.id}</span>
              <small className="entity-id">{entity.id}</small>
              <span className="panel-badge">{entity.prefab ?? 'No prefab'}</span>
            </button>
          </li>
        )) ?? <li className="panel-empty">Loading level</li>}
      </ul>
    </section>
  );
}

function PanelHeading({ id, title, meta }: { id: string; title: string; meta: string }) {
  return (
    <div className="panel-heading-row">
      <h2 id={id}>{title}</h2>
      <span className="panel-count">{meta}</span>
    </div>
  );
}

function formatCount(count: number, label: string): string {
  const plural = label === 'entity' ? 'entities' : `${label}s`;

  return `${count} ${count === 1 ? label : plural}`;
}
