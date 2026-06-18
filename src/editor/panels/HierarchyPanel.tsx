import { useState, type DragEvent, type KeyboardEvent } from 'react';

import type { LevelData } from '../../schemas/level.schema';

export interface HierarchyPanelProps {
  level: LevelData | null;
  selectedEntityId: string | undefined;
  onSelectEntity: (entityId: string) => void;
  onReorderEntity?: (entityId: string, beforeEntityId: string | undefined) => void;
}

type DropPosition = 'after' | 'before';

interface HierarchyDragState {
  entityId: string;
  overEntityId?: string;
  position: DropPosition;
}

export function HierarchyPanel({
  level,
  selectedEntityId,
  onSelectEntity,
  onReorderEntity,
}: HierarchyPanelProps) {
  const entities = level?.entities ?? [];
  const entityCount = entities.length;
  const [dragState, setDragState] = useState<HierarchyDragState>();

  const getInsertBeforeEntityId = (
    targetEntityId: string,
    position: DropPosition,
  ): string | undefined => {
    const targetIndex = entities.findIndex((entity) => entity.id === targetEntityId);

    if (targetIndex < 0) {
      return undefined;
    }

    if (position === 'before') {
      return targetEntityId;
    }

    return entities[targetIndex + 1]?.id;
  };

  const handleDragStart = (event: DragEvent<HTMLLIElement>, entityId: string) => {
    event.dataTransfer.effectAllowed = 'move';
    event.dataTransfer.setData('text/plain', entityId);
    event.dataTransfer.setData('application/x-sinan-entity-id', entityId);
    setDragState({ entityId, position: 'before' });
  };

  const handleDragOver = (event: DragEvent<HTMLLIElement>, targetEntityId: string) => {
    if (!onReorderEntity) {
      return;
    }

    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
    autoScrollHierarchy(event);

    const target = event.currentTarget;
    const rect = target.getBoundingClientRect();
    const position = event.clientY < rect.top + rect.height / 2 ? 'before' : 'after';
    const entityId =
      dragState?.entityId ||
      event.dataTransfer.getData('application/x-sinan-entity-id') ||
      event.dataTransfer.getData('text/plain');

    setDragState(
      entityId === targetEntityId
        ? { entityId, position }
        : { entityId, overEntityId: targetEntityId, position },
    );
  };

  const handleDrop = (event: DragEvent<HTMLLIElement>, targetEntityId: string) => {
    if (!onReorderEntity) {
      return;
    }

    event.preventDefault();
    const entityId =
      dragState?.entityId ||
      event.dataTransfer.getData('application/x-sinan-entity-id') ||
      event.dataTransfer.getData('text/plain');
    const position = dragState?.overEntityId === targetEntityId ? dragState.position : 'before';

    setDragState(undefined);

    if (!entityId || entityId === targetEntityId) {
      return;
    }

    onReorderEntity(entityId, getInsertBeforeEntityId(targetEntityId, position));
  };

  const handleListDragOver = (event: DragEvent<HTMLUListElement>) => {
    if (!onReorderEntity || !dragState || entities.length === 0) {
      return;
    }

    const list = event.currentTarget;
    const rect = list.getBoundingClientRect();

    if (event.clientY < rect.bottom - 14) {
      return;
    }

    event.preventDefault();
    autoScrollHierarchy(event);
    setDragState({
      entityId: dragState.entityId,
      overEntityId: entities[entities.length - 1]?.id,
      position: 'after',
    });
  };

  const handleListDrop = (event: DragEvent<HTMLUListElement>) => {
    if (!onReorderEntity || !dragState || entities.length === 0) {
      return;
    }

    if (event.target !== event.currentTarget) {
      return;
    }

    event.preventDefault();
    const entityId = dragState.entityId;
    setDragState(undefined);
    onReorderEntity(entityId, undefined);
  };

  const handleRowKeyDown = (
    event: KeyboardEvent<HTMLButtonElement>,
    entityId: string,
    index: number,
  ) => {
    if (event.key !== 'ArrowUp' && event.key !== 'ArrowDown') {
      return;
    }

    const direction = event.key === 'ArrowUp' ? -1 : 1;
    const nextIndex = index + direction;

    if (nextIndex < 0 || nextIndex >= entities.length) {
      return;
    }

    event.preventDefault();

    if ((event.ctrlKey || event.metaKey) && onReorderEntity) {
      const beforeEntityId = direction < 0 ? entities[nextIndex]?.id : entities[nextIndex + 1]?.id;
      onReorderEntity(entityId, beforeEntityId);
      return;
    }

    onSelectEntity(entities[nextIndex].id);
    focusAdjacentRow(event.currentTarget, direction);
  };

  return (
    <section aria-labelledby="hierarchy-heading">
      <PanelHeading
        id="hierarchy-heading"
        title="Hierarchy"
        meta={level ? formatCount(entityCount, 'entity') : 'Loading'}
      />
      <ul
        className="entity-list"
        aria-label="Level entities"
        onDragOver={handleListDragOver}
        onDrop={handleListDrop}
      >
        {entities.map((entity, index) => {
          const dropClass =
            dragState?.overEntityId === entity.id ? ` drop-${dragState.position}` : '';
          const dragClass = dragState?.entityId === entity.id ? ' is-dragging' : '';

          return (
            <li
              key={entity.id}
              className={`${dropClass}${dragClass}`.trim() || undefined}
              data-testid={`hierarchy-item-${entity.id}`}
              draggable={Boolean(onReorderEntity)}
              onDragStart={(event) => handleDragStart(event, entity.id)}
              onDragOver={(event) => handleDragOver(event, entity.id)}
              onDrop={(event) => handleDrop(event, entity.id)}
              onDragEnd={() => setDragState(undefined)}
            >
              <button
                type="button"
                className={entity.id === selectedEntityId ? 'is-selected' : undefined}
                aria-pressed={entity.id === selectedEntityId}
                data-testid={`hierarchy-row-${entity.id}`}
                onClick={() => onSelectEntity(entity.id)}
                onKeyDown={(event) => handleRowKeyDown(event, entity.id, index)}
              >
                <span className="entity-name">{entity.name ?? entity.id}</span>
                <small className="entity-id">{entity.id}</small>
                <span className="panel-badge">{entity.prefab ?? 'No prefab'}</span>
              </button>
            </li>
          );
        })}
        {level ? null : <li className="panel-empty">Loading level</li>}
      </ul>
    </section>
  );
}

function autoScrollHierarchy(event: DragEvent<HTMLElement>): void {
  const scroller = event.currentTarget.closest('.editor-panel-left');

  if (!scroller) {
    return;
  }

  const rect = scroller.getBoundingClientRect();
  const edgeSize = 32;

  if (event.clientY < rect.top + edgeSize) {
    scroller.scrollBy({ top: -18 });
  } else if (event.clientY > rect.bottom - edgeSize) {
    scroller.scrollBy({ top: 18 });
  }
}

function focusAdjacentRow(currentButton: HTMLButtonElement, direction: -1 | 1): void {
  const row = currentButton.closest('li');
  const nextRow = direction < 0 ? row?.previousElementSibling : row?.nextElementSibling;
  const nextButton = nextRow?.querySelector('button');

  if (nextButton instanceof HTMLButtonElement) {
    nextButton.focus();
  }
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
