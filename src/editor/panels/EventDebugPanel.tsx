import type { DirectorCommand, FlagValue } from '../../events/types';

export interface EventDebugState {
  firedEventIds: readonly string[];
  flags: Record<string, FlagValue | undefined>;
  doorStates: Record<string, boolean | undefined>;
  directorCommands: readonly DirectorCommand[];
}

export interface EventDebugPanelProps {
  debugState: EventDebugState;
}

export function EventDebugPanel({ debugState }: EventDebugPanelProps) {
  return (
    <section className="event-debug" aria-labelledby="event-debug-heading">
      <h2 id="event-debug-heading">Event Debug</h2>
      <dl className="inspector-list">
        <div>
          <dt>Fired</dt>
          <dd>{debugState.firedEventIds.join(', ') || 'None'}</dd>
        </div>
        <div>
          <dt>Flags</dt>
          <dd>{formatRecord(debugState.flags)}</dd>
        </div>
        <div>
          <dt>Doors</dt>
          <dd>{formatRecord(debugState.doorStates)}</dd>
        </div>
        <div>
          <dt>Director Queue</dt>
          <dd>
            {debugState.directorCommands.map((command) => command.type).join(', ') || 'Empty'}
          </dd>
        </div>
      </dl>
    </section>
  );
}

function formatRecord(record: Record<string, unknown>): string {
  const entries = Object.entries(record).filter(([, value]) => value !== undefined);

  if (entries.length === 0) {
    return 'None';
  }

  return entries.map(([key, value]) => `${key}: ${String(value)}`).join(', ');
}
