import type { LevelData } from '../../schemas/level.schema';

export interface HierarchyPanelProps {
  level: LevelData | null;
  selectedEntityId: string | undefined;
  onSelectEntity: (entityId: string) => void;
}

export function HierarchyPanel({ level, selectedEntityId, onSelectEntity }: HierarchyPanelProps) {
  return (
    <section aria-labelledby="hierarchy-heading">
      <PanelHeading id="hierarchy-heading" title="Hierarchy" />
      <ul className="entity-list">
        {level?.entities.map((entity) => (
          <li key={entity.id}>
            <button
              type="button"
              className={entity.id === selectedEntityId ? 'is-selected' : undefined}
              onClick={() => onSelectEntity(entity.id)}
            >
              <span>{entity.id}</span>
              {entity.prefab ? <small>{entity.prefab}</small> : null}
            </button>
          </li>
        )) ?? <li className="panel-empty">Loading level</li>}
      </ul>
    </section>
  );
}

function PanelHeading({ id, title }: { id: string; title: string }) {
  return <h2 id={id}>{title}</h2>;
}
