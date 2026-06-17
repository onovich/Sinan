import { useEffect, useReducer, useRef, useState } from 'react';

import { createDemoDataRepository } from '../data/demoDataLoader';
import type { ProjectData } from '../data/DataRepository';
import type { TransformData } from '../schemas/transform.schema';
import type { EditorCommandContext } from './commands/Command';
import { CommandHistory } from './commands/CommandHistory';
import { TransformEntityCommand } from './commands/TransformEntityCommand';
import { Viewport } from './Viewport';
import { editorPanelLayout } from './editorLayout';
import { AssetPanel } from './panels/AssetPanel';
import { HierarchyPanel } from './panels/HierarchyPanel';
import { InspectorPanel } from './panels/InspectorPanel';
import {
  createInitialEditorState,
  editorReducer,
  type ActiveTool,
  type EditorMode,
} from './store/editorStore';

export function EditorApp() {
  const [editorState, dispatch] = useReducer(editorReducer, undefined, createInitialEditorState);
  const [project, setProject] = useState<ProjectData | null>(null);
  const [projectError, setProjectError] = useState<string | null>(null);
  const [historyState, setHistoryState] = useState({ canUndo: false, canRedo: false });
  const projectRef = useRef<ProjectData | null>(null);
  const commandHistoryRef = useRef(new CommandHistory());
  const selectedEntity = project?.level.entities.find(
    (entity) => entity.id === editorState.selectedEntityId,
  );
  const commandContext: EditorCommandContext = {
    updateEntityTransform: (entityId, transform) => {
      setProject((current) => updateProjectEntityTransform(current, entityId, transform));
    },
  };

  useEffect(() => {
    let cancelled = false;
    const repository = createDemoDataRepository();

    repository
      .loadProjectLevel('level_01')
      .then((loadedProject) => {
        if (!cancelled) {
          setProject(loadedProject);
          setProjectError(null);
        }
      })
      .catch((error: unknown) => {
        console.error(error);
        if (!cancelled) {
          setProjectError(error instanceof Error ? error.message : String(error));
        }
      });

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    projectRef.current = project;
  }, [project]);

  const commitTransform = (entityId: string, transform: TransformData) => {
    const current = projectRef.current;
    const entity = current?.level.entities.find((item) => item.id === entityId);

    if (!entity || transformsEqual(entity.transform, transform)) {
      return;
    }

    commandHistoryRef.current.execute(
      new TransformEntityCommand(entityId, entity.transform, transform),
      commandContext,
    );
    refreshHistoryState(commandHistoryRef.current, setHistoryState);
  };

  const undo = () => {
    commandHistoryRef.current.undo(commandContext);
    refreshHistoryState(commandHistoryRef.current, setHistoryState);
  };

  const redo = () => {
    commandHistoryRef.current.redo(commandContext);
    refreshHistoryState(commandHistoryRef.current, setHistoryState);
  };

  const translateSelectedEntity = (delta: readonly [number, number, number]) => {
    if (!selectedEntity) {
      return;
    }

    const nextTransform: TransformData = {
      ...selectedEntity.transform,
      position: [
        selectedEntity.transform.position[0] + delta[0],
        selectedEntity.transform.position[1] + delta[1],
        selectedEntity.transform.position[2] + delta[2],
      ],
    };

    commandHistoryRef.current.execute(
      new TransformEntityCommand(selectedEntity.id, selectedEntity.transform, nextTransform),
      commandContext,
    );
    refreshHistoryState(commandHistoryRef.current, setHistoryState);
  };

  return (
    <div className="editor-shell" data-testid="editor-shell">
      <header className="editor-topbar">
        <div>
          <h1>Sinan Scene Director</h1>
          <span>Scene editing workspace</span>
        </div>
        <nav aria-label="Editor modes">
          {(['edit', 'play', 'preview'] as const).map((mode) => (
            <button
              key={mode}
              type="button"
              className={editorState.mode === mode ? 'is-active' : undefined}
              onClick={() => dispatch({ type: 'setMode', mode })}
            >
              {formatMode(mode)}
            </button>
          ))}
        </nav>
        <div className="toolbar-group" aria-label="Transform tools">
          {(['select', 'move', 'rotate', 'scale'] as const).map((activeTool) => (
            <button
              key={activeTool}
              type="button"
              className={editorState.activeTool === activeTool ? 'is-active' : undefined}
              onClick={() => dispatch({ type: 'setActiveTool', activeTool })}
            >
              {formatTool(activeTool)}
            </button>
          ))}
        </div>
        <div className="toolbar-group" aria-label="Command history">
          <button type="button" onClick={undo} disabled={!historyState.canUndo}>
            Undo
          </button>
          <button type="button" onClick={redo} disabled={!historyState.canRedo}>
            Redo
          </button>
        </div>
      </header>

      <main className="editor-workbench">
        <aside className="editor-panel editor-panel-left" aria-labelledby="hierarchy-heading">
          <HierarchyPanel
            level={project?.level ?? null}
            selectedEntityId={editorState.selectedEntityId}
            onSelectEntity={(entityId) => dispatch({ type: 'selectEntity', entityId })}
          />
          <AssetPanel assets={project?.assets ?? null} />
          {projectError ? <p className="panel-error">{projectError}</p> : null}
        </aside>

        <section className="viewport-region" aria-label={editorPanelLayout[1].title}>
          <Viewport
            project={project}
            selectionEnabled={editorState.mode === 'edit' && editorState.activeTool === 'select'}
            selectedEntityId={editorState.selectedEntityId}
            activeTool={editorState.activeTool}
            onSelectEntity={(entityId) => dispatch({ type: 'selectEntity', entityId })}
            onTransformCommit={commitTransform}
          />
        </section>

        <aside className="editor-panel editor-panel-right" aria-labelledby="inspector-heading">
          <InspectorPanel entity={selectedEntity} onTranslateSelected={translateSelectedEntity} />
        </aside>
      </main>

      <footer className="timeline-shell" aria-label={editorPanelLayout[3].title}>
        <div className="timeline-header">
          <strong>Timeline</strong>
          <span>00:00.000</span>
        </div>
        <div className="timeline-ruler">
          {Array.from({ length: 8 }, (_, index) => (
            <span key={index}>{index}s</span>
          ))}
        </div>
      </footer>
    </div>
  );
}

function formatMode(mode: EditorMode): string {
  return mode[0].toUpperCase() + mode.slice(1);
}

function formatTool(tool: ActiveTool): string {
  return tool[0].toUpperCase() + tool.slice(1);
}

function updateProjectEntityTransform(
  project: ProjectData | null,
  entityId: string,
  transform: TransformData,
): ProjectData | null {
  if (!project) {
    return project;
  }

  return {
    ...project,
    level: {
      ...project.level,
      entities: project.level.entities.map((entity) =>
        entity.id === entityId ? { ...entity, transform } : entity,
      ),
    },
  };
}

function transformsEqual(left: TransformData, right: TransformData): boolean {
  return (
    tupleEqual(left.position, right.position) &&
    tupleEqual(left.rotation, right.rotation) &&
    tupleEqual(left.scale, right.scale)
  );
}

function tupleEqual(left: readonly number[], right: readonly number[]): boolean {
  return left.length === right.length && left.every((value, index) => value === right[index]);
}

function refreshHistoryState(
  history: CommandHistory,
  setHistoryState: (state: { canUndo: boolean; canRedo: boolean }) => void,
): void {
  setHistoryState({
    canUndo: history.canUndo(),
    canRedo: history.canRedo(),
  });
}
