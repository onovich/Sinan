import { Viewport } from './Viewport';
import { editorPanelLayout } from './editorLayout';

const initialEntities = ['player_spawn', 'switch_a', 'gate_a'];
const initialAssets = ['room_blockout', 'switch_wall', 'gate_placeholder'];

export function EditorApp() {
  return (
    <div className="editor-shell" data-testid="editor-shell">
      <header className="editor-topbar">
        <div>
          <h1>Sinan Scene Director</h1>
          <span>Scene editing workspace</span>
        </div>
        <nav aria-label="Editor modes">
          <button type="button" className="is-active">
            Edit
          </button>
          <button type="button">Play</button>
          <button type="button">Preview</button>
        </nav>
      </header>

      <main className="editor-workbench">
        <aside className="editor-panel editor-panel-left" aria-labelledby="hierarchy-heading">
          <PanelHeading id="hierarchy-heading" title={editorPanelLayout[0].title} />
          <ul className="entity-list">
            {initialEntities.map((entityId) => (
              <li key={entityId}>
                <button type="button">{entityId}</button>
              </li>
            ))}
          </ul>
          <section aria-labelledby="assets-heading">
            <PanelHeading id="assets-heading" title="Assets" />
            <ul className="asset-list">
              {initialAssets.map((assetId) => (
                <li key={assetId}>{assetId}</li>
              ))}
            </ul>
          </section>
        </aside>

        <section className="viewport-region" aria-label={editorPanelLayout[1].title}>
          <Viewport />
        </section>

        <aside className="editor-panel editor-panel-right" aria-labelledby="inspector-heading">
          <PanelHeading id="inspector-heading" title={editorPanelLayout[2].title} />
          <dl className="inspector-list">
            <div>
              <dt>Selection</dt>
              <dd>None</dd>
            </div>
            <div>
              <dt>Mode</dt>
              <dd>Edit</dd>
            </div>
            <div>
              <dt>Tool</dt>
              <dd>Select</dd>
            </div>
          </dl>
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

interface PanelHeadingProps {
  id: string;
  title: string;
}

function PanelHeading({ id, title }: PanelHeadingProps) {
  return <h2 id={id}>{title}</h2>;
}
