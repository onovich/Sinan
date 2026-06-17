export function Viewport() {
  return (
    <div className="viewport-placeholder" data-testid="viewport-placeholder">
      <div className="viewport-grid" aria-hidden="true" />
      <div className="viewport-status">
        <strong>Editor Viewport</strong>
        <span>Runtime adapter pending Round 0.2</span>
      </div>
    </div>
  );
}
