import { useState } from 'react';

import { EventSchema, type EventData } from '../../schemas/event.schema';

export type EventSaveStatus = 'idle' | 'saving' | 'saved' | 'failed';

export interface EventInspectorProps {
  events: readonly EventData[];
  selectedEvent: EventData | undefined;
  saveStatus: EventSaveStatus;
  onSelectEvent: (eventId: string) => void;
  onApplyEvent: (event: EventData) => void;
  onSaveEvent: (event: EventData) => void;
}

export function EventInspector({
  events,
  selectedEvent,
  saveStatus,
  onSelectEvent,
  onApplyEvent,
  onSaveEvent,
}: EventInspectorProps) {
  const [draftNameState, setDraftNameState] = useState({ eventId: '', name: '' });
  const draftName =
    selectedEvent && draftNameState.eventId === selectedEvent.id
      ? draftNameState.name
      : (selectedEvent?.name ?? '');

  if (events.length === 0) {
    return (
      <section className="event-inspector" aria-labelledby="event-inspector-heading">
        <h2 id="event-inspector-heading">Events</h2>
        <p className="panel-empty">No events loaded</p>
      </section>
    );
  }

  const eventDraft = selectedEvent ? { ...selectedEvent, name: draftName.trim() } : undefined;
  const validationResult = eventDraft ? EventSchema.safeParse(eventDraft) : undefined;
  const validationMessages =
    validationResult && !validationResult.success
      ? validationResult.error.issues.map((issue) => {
          const path = issue.path.join('.') || 'event';
          return `${path}: ${issue.message}`;
        })
      : [];
  const canApply =
    Boolean(selectedEvent) &&
    validationResult?.success === true &&
    draftName.trim() !== (selectedEvent?.name ?? '');

  const applyEvent = () => {
    if (!validationResult?.success) {
      return;
    }

    onApplyEvent(validationResult.data);
  };

  return (
    <section className="event-inspector" aria-labelledby="event-inspector-heading">
      <div className="panel-title-row">
        <h2 id="event-inspector-heading">Events</h2>
        <span role="status">{formatSaveStatus(saveStatus)}</span>
      </div>

      <label className="field-stack" htmlFor="event-inspector-select">
        <span>Event</span>
        <select
          id="event-inspector-select"
          value={selectedEvent?.id ?? ''}
          onChange={(event) => onSelectEvent(event.target.value)}
        >
          {events.map((event) => (
            <option key={event.id} value={event.id}>
              {event.name ? `${event.name} (${event.id})` : event.id}
            </option>
          ))}
        </select>
      </label>

      {selectedEvent ? (
        <>
          <label className="field-stack" htmlFor="event-inspector-name">
            <span>Name</span>
            <input
              id="event-inspector-name"
              type="text"
              value={draftName}
              onChange={(event) =>
                setDraftNameState({
                  eventId: selectedEvent.id,
                  name: event.target.value,
                })
              }
            />
          </label>

          {validationMessages.length > 0 ? (
            <ul className="validation-list" role="alert">
              {validationMessages.map((message) => (
                <li key={message}>{message}</li>
              ))}
            </ul>
          ) : null}

          <div className="event-command-row">
            <button type="button" onClick={applyEvent} disabled={!canApply}>
              Apply
            </button>
            <button
              type="button"
              onClick={() => onSaveEvent(selectedEvent)}
              disabled={saveStatus === 'saving'}
            >
              Save Event
            </button>
          </div>

          <dl className="inspector-list">
            <div>
              <dt>ID</dt>
              <dd>{selectedEvent.id}</dd>
            </div>
            <div>
              <dt>Trigger</dt>
              <dd>{formatJson(selectedEvent.trigger)}</dd>
            </div>
            <div>
              <dt>Condition</dt>
              <dd>{selectedEvent.condition ? formatJson(selectedEvent.condition) : 'None'}</dd>
            </div>
          </dl>

          <section className="event-actions" aria-labelledby="event-actions-heading">
            <h3 id="event-actions-heading">Actions</h3>
            <ol>
              {selectedEvent.actions.map((action, index) => (
                <li key={`${action.type}-${index}`}>
                  <strong>{action.type}</strong>
                  <pre>{formatJson(action)}</pre>
                </li>
              ))}
            </ol>
          </section>
        </>
      ) : null}
    </section>
  );
}

function formatJson(value: unknown): string {
  return JSON.stringify(value, null, 2);
}

function formatSaveStatus(status: EventSaveStatus): string {
  if (status === 'idle') {
    return 'Not saved';
  }

  if (status === 'saving') {
    return 'Saving';
  }

  if (status === 'saved') {
    return 'Saved';
  }

  return 'Save failed';
}
