import { useState } from 'react';

import type { DirectorCommand, FlagValue } from '../../events/types';

export interface EventDebugState {
  firedEventIds: readonly string[];
  flags: Record<string, FlagValue | undefined>;
  doorStates: Record<string, boolean | undefined>;
  directorCommands: readonly DirectorCommand[];
}

export interface EventDebugPanelProps {
  debugState: EventDebugState;
  selectedEventId?: string;
  selectedTimelineId?: string;
  copyStatus?: string;
  onClearDebug?: () => void;
  onSetFlag?: (flag: string, value: FlagValue) => void;
  onToggleFlag?: (flag: string) => void;
  onFireSelectedEvent?: () => void;
  onReplayTimeline?: () => void;
  onCopySnapshot?: () => void;
}

export function EventDebugPanel({
  debugState,
  selectedEventId,
  selectedTimelineId,
  copyStatus,
  onClearDebug,
  onSetFlag,
  onToggleFlag,
  onFireSelectedEvent,
  onReplayTimeline,
  onCopySnapshot,
}: EventDebugPanelProps) {
  const firedCount = debugState.firedEventIds.length;
  const activeFlagCount = countDefined(debugState.flags);
  const directorCommandCount = debugState.directorCommands.length;
  const flagEntries = Object.entries(debugState.flags).filter(([, value]) => value !== undefined);
  const [flagName, setFlagName] = useState('power_enabled');
  const [flagValue, setFlagValue] = useState('true');

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

      <div className="debug-controls" aria-label="Runtime debug controls">
        <button type="button" onClick={onClearDebug} disabled={!onClearDebug}>
          Clear Debug
        </button>
        <button
          type="button"
          onClick={onFireSelectedEvent}
          disabled={!onFireSelectedEvent || !selectedEventId}
        >
          Fire Selected Event
        </button>
        <button
          type="button"
          onClick={onReplayTimeline}
          disabled={!onReplayTimeline || !selectedTimelineId}
        >
          Replay Timeline
        </button>
        <button type="button" onClick={onCopySnapshot} disabled={!onCopySnapshot}>
          Copy Snapshot
        </button>
      </div>

      <div className="debug-flag-editor" aria-label="Runtime flag editor">
        <label className="field-stack" htmlFor="debug-flag-name">
          <span>Flag</span>
          <input
            id="debug-flag-name"
            value={flagName}
            onChange={(event) => setFlagName(event.target.value)}
          />
        </label>
        <label className="field-stack" htmlFor="debug-flag-value">
          <span>Value</span>
          <input
            id="debug-flag-value"
            value={flagValue}
            onChange={(event) => setFlagValue(event.target.value)}
          />
        </label>
        <button
          type="button"
          onClick={() => onSetFlag?.(flagName, parseFlagValue(flagValue))}
          disabled={!onSetFlag || flagName.trim() === ''}
        >
          Set Flag
        </button>
      </div>

      {flagEntries.length > 0 ? (
        <ul className="debug-flag-list" aria-label="Runtime flags">
          {flagEntries.map(([flag, value]) => (
            <li key={flag}>
              <span>
                {flag}: {String(value)}
              </span>
              <button
                type="button"
                onClick={() => onToggleFlag?.(flag)}
                disabled={!onToggleFlag || typeof value !== 'boolean'}
                aria-label={`Toggle ${flag}`}
              >
                Toggle
              </button>
            </li>
          ))}
        </ul>
      ) : null}

      {copyStatus ? (
        <p className="debug-copy-status" role="status">
          {copyStatus}
        </p>
      ) : null}

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

function parseFlagValue(value: string): FlagValue {
  const trimmed = value.trim();

  if (trimmed === 'true') {
    return true;
  }

  if (trimmed === 'false') {
    return false;
  }

  const numeric = Number(trimmed);

  return trimmed !== '' && Number.isFinite(numeric) ? numeric : value;
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
