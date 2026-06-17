import { useEffect, useReducer, useState } from 'react';

import { createDemoDataRepository } from '../data/demoDataLoader';
import type { ProjectData } from '../data/DataRepository';
import { Viewport } from './Viewport';
import { editorPanelLayout } from './editorLayout';
import { AssetPanel } from './panels/AssetPanel';
import { HierarchyPanel } from './panels/HierarchyPanel';
import { InspectorPanel } from './panels/InspectorPanel';
import { createInitialEditorState, editorReducer, type EditorMode } from './store/editorStore';

export function EditorApp() {
  const [editorState, dispatch] = useReducer(editorReducer, undefined, createInitialEditorState);
  const [project, setProject] = useState<ProjectData | null>(null);
  const [projectError, setProjectError] = useState<string | null>(null);
  const selectedEntity = project?.level.entities.find(
    (entity) => entity.id === editorState.selectedEntityId,
  );

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
            selectionEnabled={editorState.mode === 'edit'}
            onSelectEntity={(entityId) => dispatch({ type: 'selectEntity', entityId })}
          />
        </section>

        <aside className="editor-panel editor-panel-right" aria-labelledby="inspector-heading">
          <InspectorPanel entity={selectedEntity} />
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
