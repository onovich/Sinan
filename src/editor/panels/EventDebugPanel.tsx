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
  const firedCount = debugState.firedEventIds.length;
  const activeFlagCount = countDefined(debugState.flags);
  const directorCommandCount = debugState.directorCommands.length;

  return (
    <section className="event-debug" aria-labelledby="event-debug-heading">
      <div className="panel-heading-row">
        <h2 id="event-debug-heading">Event Debug</h2>
        <span className="panel-count">{formatFiredCount(firedCount)}</span>
      </div>
      <div className="debug-summary" aria-label="Event debug summary">
        <span>{formatCount(activeFlagCount, 'flag')}</span>
        <span>{formatCount(directorCommandCount, 'command')}</span>
      </div>
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

function countDefined(record: Record<string, unknown>): number {
  return Object.values(record).filter((value) => value !== undefined).length;
}

function formatCount(count: number, label: string): string {
  return `${count} ${label}${count === 1 ? '' : 's'}`;
}

function formatFiredCount(count: number): string {
  return `${count} fired`;
}

function formatRecord(record: Record<string, unknown>): string {
  const entries = Object.entries(record).filter(([, value]) => value !== undefined);

  if (entries.length === 0) {
    return 'None';
  }

  return entries.map(([key, value]) => `${key}: ${String(value)}`).join(', ');
}
