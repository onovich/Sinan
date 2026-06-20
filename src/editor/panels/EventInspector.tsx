import { useEffect, useRef, useState, type MouseEvent as ReactMouseEvent } from 'react';

import type { ActionData } from '../../schemas/action.schema';
import {
  TYPED_CONDITION_TYPES,
  type ConditionData,
  type TypedConditionType,
} from '../../schemas/condition.schema';
import { EventSchema, type EventData } from '../../schemas/event.schema';
import type { MaterialParameterValueData } from '../../schemas/material.schema';
import type { TransformData } from '../../schemas/transform.schema';
import { ConditionSystem } from '../../events/ConditionSystem';
import type { EventRuntimeState } from '../../events/types';
import { getSaveStatusPill, type EditorSaveStatus } from '../editorStatus';

export type EventSaveStatus = EditorSaveStatus;

export interface EventInspectorProps {
  events: readonly EventData[];
  selectedEvent: EventData | undefined;
  saveStatus: EventSaveStatus;
  isDirty: boolean;
  saveError?: string;
  entityIds: readonly string[];
  timelineIds: readonly string[];
  cameraShotIds: readonly string[];
  soundAssetIds: readonly string[];
  runtimeState?: EventRuntimeState;
  onSelectEvent: (eventId: string) => void;
  onApplyEvent: (event: EventData) => void;
  onSaveEvent: (event: EventData) => void;
}

const ACTION_TYPES: ActionData['type'][] = [
  'flag.set',
  'flag.toggle',
  'switch.setState',
  'door.open',
  'door.close',
  'timeline.play',
  'timeline.stop',
  'camera.playShot',
  'sound.play',
  'material.setParameter',
  'subtitle.show',
  'entity.setVisible',
  'entity.setEnabled',
  'animation.play',
  'animation.stop',
  'entity.animateTransform',
  'entity.setTransform',
  'function.call',
];

type TypedConditionData = Extract<ConditionData, { type: string }>;

interface EventDraftState {
  eventId: string;
  sourceSignature: string;
  event: EventData;
}

type DropPosition = 'after' | 'before';

interface ActionDragState {
  index: number;
  overIndex?: number;
  position: DropPosition;
}

export function EventInspector({
  events,
  selectedEvent,
  saveStatus,
  isDirty,
  saveError,
  entityIds,
  timelineIds,
  cameraShotIds,
  soundAssetIds,
  runtimeState,
  onSelectEvent,
  onApplyEvent,
  onSaveEvent,
}: EventInspectorProps) {
  const [draftState, setDraftState] = useState<EventDraftState>();
  const [newActionType, setNewActionType] = useState<ActionData['type']>('flag.set');
  const [newConditionType, setNewConditionType] = useState<TypedConditionType>('flag.equals');
  const [actionDragState, setActionDragState] = useState<ActionDragState>();
  const actionDragRef = useRef<ActionDragState | undefined>(undefined);
  const cleanupActionDragRef = useRef<(() => void) | undefined>(undefined);
  const selectedEventSignature = selectedEvent ? JSON.stringify(selectedEvent) : '';
  const draftEvent =
    selectedEvent &&
    draftState?.eventId === selectedEvent.id &&
    draftState.sourceSignature === selectedEventSignature
      ? draftState.event
      : selectedEvent;
  const validationResult = draftEvent ? EventSchema.safeParse(draftEvent) : undefined;
  const validationMessages =
    validationResult && !validationResult.success
      ? validationResult.error.issues.map(formatIssue)
      : [];
  const canApply =
    Boolean(selectedEvent) &&
    validationResult?.success === true &&
    JSON.stringify(validationResult.data) !== JSON.stringify(selectedEvent);
  const statusPill = getSaveStatusPill({
    saveStatus,
    isDirty,
    issueCount: validationMessages.length,
  });

  const updateDraftEvent = (event: EventData) => {
    setDraftState({ eventId: event.id, sourceSignature: selectedEventSignature, event });
  };

  const setActionDrag = (state: ActionDragState | undefined) => {
    actionDragRef.current = state;
    setActionDragState(state);
  };

  useEffect(
    () => () => {
      cleanupActionDragRef.current?.();
    },
    [],
  );

  const getUpdatedActionDrag = (
    drag: ActionDragState | undefined,
    clientX: number,
    clientY: number,
  ): ActionDragState | undefined => {
    if (!drag) {
      return undefined;
    }

    const target = getActionDropTarget(clientX, clientY);

    if (!target) {
      return drag;
    }

    return {
      ...drag,
      overIndex: target.index,
      position: getDropPositionFromRect(target.element.getBoundingClientRect(), clientY),
    };
  };

  const updateActionMouseDrag = (event: MouseEvent) => {
    const drag = actionDragRef.current;
    const nextDrag = getUpdatedActionDrag(drag, event.clientX, event.clientY);

    if (!nextDrag) {
      return;
    }

    setActionDrag(nextDrag);
  };

  const finishActionMouseDrag = (event: MouseEvent, eventDraft: EventData | undefined) => {
    const finalDrag = getUpdatedActionDrag(actionDragRef.current, event.clientX, event.clientY);
    cleanupActionDragRef.current?.();
    cleanupActionDragRef.current = undefined;
    setActionDrag(undefined);

    if (
      !eventDraft ||
      finalDrag?.overIndex === undefined ||
      finalDrag.index === finalDrag.overIndex
    ) {
      return;
    }

    updateDraftEvent({
      ...eventDraft,
      actions: reorderArrayByDrop(
        eventDraft.actions,
        finalDrag.index,
        finalDrag.overIndex,
        finalDrag.position,
      ),
    });
  };

  const startActionMouseDrag = (
    event: ReactMouseEvent<HTMLElement>,
    eventDraft: EventData | undefined,
    index: number,
  ) => {
    if (event.button !== 0 || !eventDraft) {
      return;
    }

    event.preventDefault();
    event.stopPropagation();
    cleanupActionDragRef.current?.();
    setActionDrag({ index, overIndex: index, position: 'before' });

    const handleMouseMove = (nativeEvent: MouseEvent) => updateActionMouseDrag(nativeEvent);
    const handleMouseUp = (nativeEvent: MouseEvent) =>
      finishActionMouseDrag(nativeEvent, eventDraft);

    window.addEventListener('mousemove', handleMouseMove, true);
    window.addEventListener('mouseup', handleMouseUp, true);
    cleanupActionDragRef.current = () => {
      window.removeEventListener('mousemove', handleMouseMove, true);
      window.removeEventListener('mouseup', handleMouseUp, true);
    };
  };

  const applyEvent = () => {
    if (!validationResult?.success) {
      return;
    }

    onApplyEvent(validationResult.data);
    setDraftState(undefined);
  };

  if (events.length === 0) {
    return (
      <section className="event-inspector" aria-labelledby="event-inspector-heading">
        <h2 id="event-inspector-heading">Events</h2>
        <p className="panel-empty">No events loaded</p>
      </section>
    );
  }

  return (
    <section className="event-inspector" aria-labelledby="event-inspector-heading">
      <div className="panel-title-row">
        <h2 id="event-inspector-heading">Events</h2>
        <span className={statusPill.className} role="status">
          {statusPill.text}
        </span>
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

      {draftEvent ? (
        <>
          <label className="field-stack" htmlFor="event-inspector-name">
            <span>Name</span>
            <input
              id="event-inspector-name"
              type="text"
              value={draftEvent.name ?? ''}
              onChange={(event) =>
                updateDraftEvent({
                  ...draftEvent,
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

          {saveError ? (
            <p className="panel-error" role="alert">
              {saveError}
            </p>
          ) : null}

          <div className="event-command-row">
            <button type="button" onClick={applyEvent} disabled={!canApply}>
              Apply
            </button>
            <button
              type="button"
              onClick={() => onSaveEvent(selectedEvent ?? draftEvent)}
              disabled={!selectedEvent || saveStatus === 'saving'}
            >
              Save Event
            </button>
          </div>

          <dl className="inspector-list">
            <div>
              <dt>ID</dt>
              <dd>{draftEvent.id}</dd>
            </div>
            <div>
              <dt>Trigger</dt>
              <dd>{formatJson(draftEvent.trigger)}</dd>
            </div>
          </dl>

          <ConditionEditor
            event={draftEvent}
            entityIds={entityIds}
            newConditionType={newConditionType}
            runtimeState={runtimeState}
            onNewConditionTypeChange={setNewConditionType}
            onUpdate={updateDraftEvent}
          />

          <section className="event-actions" aria-labelledby="event-actions-heading">
            <div className="panel-title-row">
              <h3 id="event-actions-heading">Actions</h3>
              <span>{draftEvent.actions.length} actions</span>
            </div>

            <div className="event-add-row">
              <label className="field-stack" htmlFor="event-action-type">
                <span>Add Action</span>
                <select
                  id="event-action-type"
                  value={newActionType}
                  onChange={(event) => setNewActionType(event.target.value as ActionData['type'])}
                >
                  {ACTION_TYPES.map((type) => (
                    <option key={type} value={type}>
                      {type}
                    </option>
                  ))}
                </select>
              </label>
              <button
                type="button"
                onClick={() =>
                  updateDraftEvent({
                    ...draftEvent,
                    actions: [
                      ...draftEvent.actions,
                      createDefaultAction(newActionType, {
                        event: draftEvent,
                        entityIds,
                        timelineIds,
                        cameraShotIds,
                        soundAssetIds,
                      }),
                    ],
                  })
                }
              >
                Add Action
              </button>
            </div>

            <ol className="event-list">
              {draftEvent.actions.map((action, index) => (
                <li
                  key={`${action.type}-${index}`}
                  className={getActionCardClassName(action, actionDragState, index)}
                  data-testid={`event-action-card-${index}`}
                  data-action-index={index}
                >
                  <span
                    className="action-drag-handle"
                    aria-hidden="true"
                    onMouseDown={(event) => startActionMouseDrag(event, draftEvent, index)}
                  />
                  <ActionEditor
                    action={action}
                    index={index}
                    entityIds={entityIds}
                    timelineIds={timelineIds}
                    cameraShotIds={cameraShotIds}
                    soundAssetIds={soundAssetIds}
                    canMoveUp={index > 0}
                    canMoveDown={index < draftEvent.actions.length - 1}
                    canRemove={draftEvent.actions.length > 1}
                    onUpdate={(nextAction) =>
                      updateDraftEvent({
                        ...draftEvent,
                        actions: replaceArrayItem(draftEvent.actions, index, nextAction),
                      })
                    }
                    onMoveUp={() =>
                      updateDraftEvent({
                        ...draftEvent,
                        actions: moveArrayItem(draftEvent.actions, index, index - 1),
                      })
                    }
                    onMoveDown={() =>
                      updateDraftEvent({
                        ...draftEvent,
                        actions: moveArrayItem(draftEvent.actions, index, index + 1),
                      })
                    }
                    onRemove={() =>
                      updateDraftEvent({
                        ...draftEvent,
                        actions: draftEvent.actions.filter((_, itemIndex) => itemIndex !== index),
                      })
                    }
                  />
                </li>
              ))}
            </ol>
          </section>
        </>
      ) : null}
    </section>
  );
}

interface ConditionEditorProps {
  event: EventData;
  entityIds: readonly string[];
  newConditionType: TypedConditionType;
  runtimeState?: EventRuntimeState;
  onNewConditionTypeChange: (type: TypedConditionType) => void;
  onUpdate: (event: EventData) => void;
}

function ConditionEditor({
  event,
  entityIds,
  newConditionType,
  runtimeState,
  onNewConditionTypeChange,
  onUpdate,
}: ConditionEditorProps) {
  const condition = event.condition;
  const groupKind = getConditionGroupKind(condition);
  const conditions =
    condition && groupKind ? getConditionGroupItems(condition, groupKind) : undefined;
  const preview = getConditionRuntimePreview(condition, runtimeState);

  return (
    <section className="event-conditions" aria-labelledby="event-conditions-heading">
      <div className="panel-title-row">
        <h3 id="event-conditions-heading">Condition</h3>
        <span
          className={`condition-preview ${preview.className}`}
          data-testid="event-condition-preview"
        >
          {preview.text}
        </span>
      </div>

      <div className="event-command-row">
        <button
          type="button"
          onClick={() =>
            onUpdate({
              ...event,
              condition: condition
                ? undefined
                : { all: [createDefaultCondition(newConditionType, entityIds)] },
            })
          }
        >
          {condition ? 'Clear Condition' : 'Add Condition'}
        </button>
        <button
          type="button"
          onClick={() =>
            onUpdate({
              ...event,
              condition: condition ? normalizeConditionGroup(condition, 'all') : { all: [] },
            })
          }
          disabled={!condition}
        >
          Use All
        </button>
      </div>

      {condition ? (
        <>
          <label className="field-stack" htmlFor="event-condition-mode">
            <span>Mode</span>
            <select
              id="event-condition-mode"
              value={groupKind ?? 'single'}
              onChange={(eventTarget) => {
                const value = eventTarget.target.value;
                onUpdate({
                  ...event,
                  condition:
                    value === 'single'
                      ? (getFirstTypedCondition(condition) ??
                        createDefaultCondition(newConditionType, entityIds))
                      : normalizeConditionGroup(condition, value as 'all' | 'any'),
                });
              }}
            >
              <option value="all">All</option>
              <option value="any">Any</option>
              <option value="single">Single</option>
            </select>
          </label>

          {conditions ? (
            <>
              <div className="event-add-row">
                <label className="field-stack" htmlFor="event-condition-type">
                  <span>Add Condition</span>
                  <select
                    id="event-condition-type"
                    value={newConditionType}
                    onChange={(eventTarget) =>
                      onNewConditionTypeChange(eventTarget.target.value as TypedConditionType)
                    }
                  >
                    {TYPED_CONDITION_TYPES.map((type) => (
                      <option key={type} value={type}>
                        {type}
                      </option>
                    ))}
                  </select>
                </label>
                <button
                  type="button"
                  onClick={() =>
                    onUpdate({
                      ...event,
                      condition: createConditionGroup(groupKind as 'all' | 'any', [
                        ...conditions,
                        createDefaultCondition(newConditionType, entityIds),
                      ]),
                    })
                  }
                >
                  Add Condition
                </button>
              </div>

              <ol className="event-list">
                {conditions.map((item, index) => (
                  <li key={`${formatConditionSummary(item)}-${index}`}>
                    {isTypedCondition(item) ? (
                      <TypedConditionEditor
                        condition={item}
                        entityIds={entityIds}
                        canMoveUp={index > 0}
                        canMoveDown={index < conditions.length - 1}
                        canRemove={conditions.length > 1}
                        onUpdate={(nextCondition) =>
                          onUpdate({
                            ...event,
                            condition: createConditionGroup(
                              groupKind as 'all' | 'any',
                              replaceArrayItem(conditions, index, nextCondition),
                            ),
                          })
                        }
                        onMoveUp={() =>
                          onUpdate({
                            ...event,
                            condition: createConditionGroup(
                              groupKind as 'all' | 'any',
                              moveArrayItem(conditions, index, index - 1),
                            ),
                          })
                        }
                        onMoveDown={() =>
                          onUpdate({
                            ...event,
                            condition: createConditionGroup(
                              groupKind as 'all' | 'any',
                              moveArrayItem(conditions, index, index + 1),
                            ),
                          })
                        }
                        onRemove={() =>
                          onUpdate({
                            ...event,
                            condition: createConditionGroup(
                              groupKind as 'all' | 'any',
                              conditions.filter((_, itemIndex) => itemIndex !== index),
                            ),
                          })
                        }
                      />
                    ) : (
                      <>
                        <pre>{formatJson(item)}</pre>
                        <button
                          type="button"
                          onClick={() =>
                            onUpdate({
                              ...event,
                              condition: createConditionGroup(
                                groupKind as 'all' | 'any',
                                conditions.filter((_, itemIndex) => itemIndex !== index),
                              ),
                            })
                          }
                        >
                          Remove Condition
                        </button>
                      </>
                    )}
                  </li>
                ))}
              </ol>
            </>
          ) : isTypedCondition(condition) ? (
            <ol className="event-list">
              <li>
                <TypedConditionEditor
                  condition={condition}
                  entityIds={entityIds}
                  canMoveUp={false}
                  canMoveDown={false}
                  canRemove
                  onUpdate={(nextCondition) => onUpdate({ ...event, condition: nextCondition })}
                  onMoveUp={() => undefined}
                  onMoveDown={() => undefined}
                  onRemove={() => onUpdate({ ...event, condition: undefined })}
                />
              </li>
            </ol>
          ) : (
            <pre>{formatJson(condition)}</pre>
          )}
        </>
      ) : null}
    </section>
  );
}

interface ActionEditorProps {
  action: ActionData;
  index: number;
  entityIds: readonly string[];
  timelineIds: readonly string[];
  cameraShotIds: readonly string[];
  soundAssetIds: readonly string[];
  canMoveUp: boolean;
  canMoveDown: boolean;
  canRemove: boolean;
  onUpdate: (action: ActionData) => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
  onRemove: () => void;
}

function ActionEditor({
  action,
  index,
  entityIds,
  timelineIds,
  cameraShotIds,
  soundAssetIds,
  canMoveUp,
  canMoveDown,
  canRemove,
  onUpdate,
  onMoveUp,
  onMoveDown,
  onRemove,
}: ActionEditorProps) {
  return (
    <>
      <div className="component-card-header">
        <strong>
          {index + 1}. {action.type}
        </strong>
        <span>Action</span>
      </div>
      <label className="field-stack">
        Type
        <select
          aria-label={`Action ${index + 1} Type`}
          value={action.type}
          onChange={(event) =>
            onUpdate(
              createDefaultAction(event.target.value as ActionData['type'], {
                entityIds,
                timelineIds,
                cameraShotIds,
                soundAssetIds,
              }),
            )
          }
        >
          {ACTION_TYPES.map((type) => (
            <option key={type} value={type}>
              {type}
            </option>
          ))}
        </select>
      </label>

      {renderActionFields({
        action,
        entityIds,
        timelineIds,
        cameraShotIds,
        soundAssetIds,
        onUpdate,
      })}

      <div className="event-row-actions">
        <button type="button" onClick={onMoveUp} disabled={!canMoveUp}>
          Up
        </button>
        <button type="button" onClick={onMoveDown} disabled={!canMoveDown}>
          Down
        </button>
        <button type="button" onClick={onRemove} disabled={!canRemove}>
          Remove
        </button>
      </div>
    </>
  );
}

interface ActionFieldProps {
  action: ActionData;
  entityIds: readonly string[];
  timelineIds: readonly string[];
  cameraShotIds: readonly string[];
  soundAssetIds: readonly string[];
  onUpdate: (action: ActionData) => void;
}

function renderActionFields({
  action,
  entityIds,
  timelineIds,
  cameraShotIds,
  soundAssetIds,
  onUpdate,
}: ActionFieldProps) {
  switch (action.type) {
    case 'flag.set':
      return (
        <div className="form-grid">
          <TextField
            label="Flag"
            value={action.flag}
            onChange={(flag) => onUpdate({ ...action, flag })}
          />
          <TextField
            label="Value"
            value={formatEditableValue(action.value)}
            onChange={(value) => onUpdate({ ...action, value: parseEditableValue(value) })}
          />
        </div>
      );
    case 'flag.toggle':
      return (
        <TextField
          label="Flag"
          value={action.flag}
          onChange={(flag) => onUpdate({ ...action, flag })}
        />
      );
    case 'switch.setState':
      return (
        <div className="form-grid">
          <SelectField
            label="Entity"
            value={action.entityId}
            options={entityIds}
            onChange={(entityId) => onUpdate({ ...action, entityId })}
          />
          <CheckboxField
            label="Value"
            checked={action.value}
            onChange={(value) => onUpdate({ ...action, value })}
          />
        </div>
      );
    case 'door.open':
    case 'door.close':
      return (
        <SelectField
          label="Entity"
          value={action.entityId}
          options={entityIds}
          onChange={(entityId) => onUpdate({ ...action, entityId })}
        />
      );
    case 'timeline.play':
    case 'timeline.stop':
      return (
        <SelectField
          label="Timeline"
          value={action.timelineId}
          options={timelineIds}
          onChange={(timelineId) => onUpdate({ ...action, timelineId })}
        />
      );
    case 'camera.playShot':
      return (
        <SelectField
          label="Shot"
          value={action.shotId}
          options={cameraShotIds}
          onChange={(shotId) => onUpdate({ ...action, shotId })}
        />
      );
    case 'sound.play':
      return (
        <SelectField
          label="Sound"
          value={action.soundId}
          options={soundAssetIds}
          onChange={(soundId) => onUpdate({ ...action, soundId })}
        />
      );
    case 'material.setParameter':
      return (
        <>
          <div className="form-grid">
            <SelectField
              label="Entity"
              value={action.entityId}
              options={entityIds}
              onChange={(entityId) => onUpdate({ ...action, entityId })}
            />
            <TextField
              label="Slot"
              value={action.slot}
              onChange={(slot) => onUpdate({ ...action, slot })}
            />
          </div>
          <div className="form-grid">
            <TextField
              label="Parameter"
              value={action.parameter}
              onChange={(parameter) => onUpdate({ ...action, parameter })}
            />
            <TextField
              label="Value"
              value={formatMaterialParameterValue(action.value)}
              onChange={(value) =>
                onUpdate({ ...action, value: parseMaterialParameterValue(value) })
              }
            />
          </div>
        </>
      );
    case 'subtitle.show':
      return (
        <>
          <TextField
            label="Text"
            value={action.text}
            onChange={(text) => onUpdate({ ...action, text })}
          />
          <div className="form-grid">
            <NumberField
              label="Duration"
              value={action.duration}
              step="0.1"
              onChange={(duration) => onUpdate({ ...action, duration })}
            />
            <SelectField
              label="Speaker"
              value={action.speaker ?? ''}
              options={['', ...entityIds]}
              onChange={(speaker) =>
                onUpdate({ ...action, speaker: speaker === '' ? undefined : speaker })
              }
            />
          </div>
        </>
      );
    case 'entity.setVisible':
      return (
        <div className="form-grid">
          <SelectField
            label="Entity"
            value={action.entityId}
            options={entityIds}
            onChange={(entityId) => onUpdate({ ...action, entityId })}
          />
          <CheckboxField
            label="Visible"
            checked={action.visible}
            onChange={(visible) => onUpdate({ ...action, visible })}
          />
        </div>
      );
    case 'entity.setEnabled':
      return (
        <div className="form-grid">
          <SelectField
            label="Entity"
            value={action.entityId}
            options={entityIds}
            onChange={(entityId) => onUpdate({ ...action, entityId })}
          />
          <CheckboxField
            label="Enabled"
            checked={action.enabled}
            onChange={(enabled) => onUpdate({ ...action, enabled })}
          />
        </div>
      );
    case 'animation.play':
      return (
        <>
          <div className="form-grid">
            <SelectField
              label="Entity"
              value={action.entityId}
              options={entityIds}
              onChange={(entityId) => onUpdate({ ...action, entityId })}
            />
            <TextField
              label="Clip"
              value={action.clip}
              onChange={(clip) => onUpdate({ ...action, clip })}
            />
          </div>
          <CheckboxField
            label="Loop"
            checked={action.loop === true}
            onChange={(loop) => onUpdate({ ...action, loop })}
          />
        </>
      );
    case 'animation.stop':
      return (
        <div className="form-grid">
          <SelectField
            label="Entity"
            value={action.entityId}
            options={entityIds}
            onChange={(entityId) => onUpdate({ ...action, entityId })}
          />
          <TextField
            label="Clip"
            value={action.clip ?? ''}
            onChange={(clip) => onUpdate({ ...action, clip: clip || undefined })}
          />
        </div>
      );
    case 'entity.setTransform':
      return (
        <>
          <SelectField
            label="Entity"
            value={action.entityId}
            options={entityIds}
            onChange={(entityId) => onUpdate({ ...action, entityId })}
          />
          <TransformFields
            transform={action.transform}
            onChange={(transform) => onUpdate({ ...action, transform })}
          />
        </>
      );
    case 'entity.animateTransform':
      return (
        <>
          <div className="form-grid">
            <SelectField
              label="Entity"
              value={action.entityId}
              options={entityIds}
              onChange={(entityId) => onUpdate({ ...action, entityId })}
            />
            <NumberField
              label="Duration"
              value={action.duration}
              step="0.1"
              onChange={(duration) => onUpdate({ ...action, duration })}
            />
          </div>
          <TextField
            label="Ease"
            value={action.ease ?? ''}
            onChange={(ease) => onUpdate({ ...action, ease: ease || undefined })}
          />
          <TransformFields transform={action.to} onChange={(to) => onUpdate({ ...action, to })} />
        </>
      );
    case 'function.call':
      return (
        <TextField
          label="Name"
          value={action.name}
          onChange={(name) => onUpdate({ ...action, name })}
        />
      );
  }
}

interface TypedConditionEditorProps {
  condition: TypedConditionData;
  entityIds: readonly string[];
  canMoveUp: boolean;
  canMoveDown: boolean;
  canRemove: boolean;
  onUpdate: (condition: TypedConditionData) => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
  onRemove: () => void;
}

function TypedConditionEditor({
  condition,
  entityIds,
  canMoveUp,
  canMoveDown,
  canRemove,
  onUpdate,
  onMoveUp,
  onMoveDown,
  onRemove,
}: TypedConditionEditorProps) {
  return (
    <>
      <div className="component-card-header">
        <strong>{condition.type}</strong>
        <span>Condition</span>
      </div>
      <label className="field-stack">
        Type
        <select
          aria-label={`${condition.type} Condition Type`}
          value={condition.type}
          onChange={(event) =>
            onUpdate(createDefaultCondition(event.target.value as TypedConditionType, entityIds))
          }
        >
          {TYPED_CONDITION_TYPES.map((type) => (
            <option key={type} value={type}>
              {type}
            </option>
          ))}
        </select>
      </label>

      {renderConditionFields({ condition, entityIds, onUpdate })}

      <div className="event-row-actions">
        <button type="button" onClick={onMoveUp} disabled={!canMoveUp}>
          Up
        </button>
        <button type="button" onClick={onMoveDown} disabled={!canMoveDown}>
          Down
        </button>
        <button type="button" onClick={onRemove} disabled={!canRemove}>
          Remove
        </button>
      </div>
    </>
  );
}

interface ConditionFieldProps {
  condition: TypedConditionData;
  entityIds: readonly string[];
  onUpdate: (condition: TypedConditionData) => void;
}

function renderConditionFields({ condition, entityIds, onUpdate }: ConditionFieldProps) {
  switch (condition.type) {
    case 'flag.equals':
      return (
        <div className="form-grid">
          <TextField
            label="Flag"
            value={condition.flag}
            onChange={(flag) => onUpdate({ ...condition, flag })}
          />
          <TextField
            label="Value"
            value={formatEditableValue(condition.value)}
            onChange={(value) => onUpdate({ ...condition, value: parseEditableValue(value) })}
          />
        </div>
      );
    case 'flag.exists':
      return (
        <TextField
          label="Flag"
          value={condition.flag}
          onChange={(flag) => onUpdate({ ...condition, flag })}
        />
      );
    case 'inventory.hasItem':
      return (
        <TextField
          label="Item"
          value={condition.itemId}
          onChange={(itemId) => onUpdate({ ...condition, itemId })}
        />
      );
    case 'quest.stateEquals':
      return (
        <div className="form-grid">
          <TextField
            label="Quest"
            value={condition.questId}
            onChange={(questId) => onUpdate({ ...condition, questId })}
          />
          <TextField
            label="State"
            value={condition.state}
            onChange={(state) => onUpdate({ ...condition, state })}
          />
        </div>
      );
    case 'entity.stateEquals':
      return (
        <>
          <SelectField
            label="Entity"
            value={condition.entityId}
            options={entityIds}
            onChange={(entityId) => onUpdate({ ...condition, entityId })}
          />
          <div className="form-grid">
            <TextField
              label="State"
              value={condition.state}
              onChange={(state) => onUpdate({ ...condition, state })}
            />
            <TextField
              label="Value"
              value={formatEditableValue(condition.value)}
              onChange={(value) => onUpdate({ ...condition, value: parseEditableValue(value) })}
            />
          </div>
        </>
      );
    case 'distance.lessThan':
      return (
        <>
          <div className="form-grid">
            <SelectField
              label="Entity A"
              value={condition.entityA}
              options={entityIds}
              onChange={(entityA) => onUpdate({ ...condition, entityA })}
            />
            <SelectField
              label="Entity B"
              value={condition.entityB}
              options={entityIds}
              onChange={(entityB) => onUpdate({ ...condition, entityB })}
            />
          </div>
          <NumberField
            label="Distance"
            value={condition.distance}
            step="0.1"
            onChange={(distance) => onUpdate({ ...condition, distance })}
          />
        </>
      );
    case 'custom.condition':
      return (
        <TextField
          label="Name"
          value={condition.name}
          onChange={(name) => onUpdate({ ...condition, name })}
        />
      );
  }
}

interface TextFieldProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
}

function TextField({ label, value, onChange }: TextFieldProps) {
  return (
    <label className="field-stack">
      {label}
      <input value={value} onChange={(event) => onChange(event.target.value)} />
    </label>
  );
}

interface NumberFieldProps {
  label: string;
  value: number;
  step: string;
  onChange: (value: number) => void;
}

function NumberField({ label, value, step, onChange }: NumberFieldProps) {
  return (
    <label className="field-stack">
      {label}
      <input
        type="number"
        step={step}
        value={value}
        onChange={(event) => onChange(Number(event.target.value))}
      />
    </label>
  );
}

interface SelectFieldProps {
  label: string;
  value: string;
  options: readonly string[];
  onChange: (value: string) => void;
}

function SelectField({ label, value, options, onChange }: SelectFieldProps) {
  return (
    <label className="field-stack">
      {label}
      <select value={value} onChange={(event) => onChange(event.target.value)}>
        {options.length === 0 || !options.includes(value) ? (
          <option value={value}>{value}</option>
        ) : null}
        {options.map((option) => (
          <option key={option || 'empty-option'} value={option}>
            {option || 'None'}
          </option>
        ))}
      </select>
    </label>
  );
}

interface CheckboxFieldProps {
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}

function CheckboxField({ label, checked, onChange }: CheckboxFieldProps) {
  return (
    <label className="check-field">
      <input
        type="checkbox"
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
      />
      {label}
    </label>
  );
}

interface TransformFieldsProps {
  transform: TransformData;
  onChange: (transform: TransformData) => void;
}

function TransformFields({ transform, onChange }: TransformFieldsProps) {
  return (
    <div className="event-transform-grid">
      <VectorFields
        label="Position"
        values={transform.position}
        onChange={(position) => onChange({ ...transform, position: toVec3(position) })}
      />
      <VectorFields
        label="Rotation"
        values={transform.rotation}
        onChange={(rotation) => onChange({ ...transform, rotation: toQuat(rotation) })}
      />
      <VectorFields
        label="Scale"
        values={transform.scale}
        onChange={(scale) => onChange({ ...transform, scale: toVec3(scale) })}
      />
    </div>
  );
}

interface VectorFieldsProps {
  label: string;
  values: readonly [number, number, number] | readonly [number, number, number, number];
  onChange: (values: [number, number, number] | [number, number, number, number]) => void;
}

function VectorFields({ label, values, onChange }: VectorFieldsProps) {
  return (
    <fieldset className="vector-field">
      <legend>{label}</legend>
      {values.map((value, index) => (
        <label key={`${label}-${index}`}>
          {['X', 'Y', 'Z', 'W'][index]}
          <input
            type="number"
            step="0.01"
            value={value}
            onChange={(event) => {
              onChange(updateVectorValue(values, index, Number(event.target.value)));
            }}
          />
        </label>
      ))}
    </fieldset>
  );
}

function createDefaultAction(
  type: ActionData['type'],
  options: {
    event?: EventData;
    entityIds?: readonly string[];
    timelineIds?: readonly string[];
    cameraShotIds?: readonly string[];
    soundAssetIds?: readonly string[];
  },
): ActionData {
  const entityId = getPreferredEntityId(options.event, options.entityIds ?? []);
  const transform = createDefaultTransform();

  switch (type) {
    case 'flag.set':
      return { type, flag: 'gate_a_opened', value: true };
    case 'flag.toggle':
      return { type, flag: 'gate_a_opened' };
    case 'switch.setState':
      return { type, entityId, value: true };
    case 'door.open':
    case 'door.close':
      return { type, entityId };
    case 'timeline.play':
    case 'timeline.stop':
      return { type, timelineId: firstOrFallback(options.timelineIds, 'tl_open_gate') };
    case 'camera.playShot':
      return { type, shotId: firstOrFallback(options.cameraShotIds, 'cam_gate_reveal') };
    case 'sound.play':
      return { type, soundId: firstOrFallback(options.soundAssetIds, 'audio.switch_click') };
    case 'material.setParameter':
      return { type, entityId, slot: 'main', parameter: 'progress', value: 0 };
    case 'subtitle.show':
      return { type, text: 'Gate open.', duration: 2 };
    case 'entity.setVisible':
      return { type, entityId, visible: true };
    case 'entity.setEnabled':
      return { type, entityId, enabled: true };
    case 'animation.play':
      return { type, entityId, clip: 'Open', loop: false };
    case 'animation.stop':
      return { type, entityId, clip: 'Open' };
    case 'entity.setTransform':
      return { type, entityId, transform };
    case 'entity.animateTransform':
      return { type, entityId, to: transform, duration: 0.2, ease: 'linear' };
    case 'function.call':
      return { type, name: 'registered_function' };
  }
}

function createDefaultCondition(
  type: TypedConditionType,
  entityIds: readonly string[],
): TypedConditionData {
  const entityId = firstOrFallback(entityIds, 'switch_a');

  switch (type) {
    case 'flag.equals':
      return { type, flag: 'power_enabled', value: true };
    case 'flag.exists':
      return { type, flag: 'power_enabled' };
    case 'inventory.hasItem':
      return { type, itemId: 'gate_key' };
    case 'quest.stateEquals':
      return { type, questId: 'quest_gate', state: 'active' };
    case 'entity.stateEquals':
      return { type, entityId, state: 'Switch', value: true };
    case 'distance.lessThan':
      return {
        type,
        entityA: entityId,
        entityB: entityIds[1] ?? entityId,
        distance: 2,
      };
    case 'custom.condition':
      return { type, name: 'registered_condition' };
  }
}

function createDefaultTransform(): TransformData {
  return {
    position: [0, 0, 0],
    rotation: [0, 0, 0, 1],
    scale: [1, 1, 1],
  };
}

function getPreferredEntityId(event: EventData | undefined, entityIds: readonly string[]): string {
  const triggerEntityId =
    event?.trigger && 'entityId' in event.trigger ? event.trigger.entityId : undefined;

  return triggerEntityId ?? firstOrFallback(entityIds, 'switch_a');
}

function firstOrFallback(values: readonly string[] | undefined, fallback: string): string {
  return values?.[0] ?? fallback;
}

function getConditionGroupKind(condition: ConditionData | undefined): 'all' | 'any' | undefined {
  if (condition && 'all' in condition) {
    return 'all';
  }

  if (condition && 'any' in condition) {
    return 'any';
  }

  return undefined;
}

function normalizeConditionGroup(
  condition: ConditionData,
  groupKind: 'all' | 'any',
): ConditionData {
  const currentKind = getConditionGroupKind(condition);
  const conditions = currentKind
    ? getConditionGroupItems(condition, currentKind)
    : [getFirstTypedCondition(condition) ?? condition];

  return createConditionGroup(groupKind, conditions);
}

function getConditionGroupItems(
  condition: ConditionData,
  groupKind: 'all' | 'any',
): ConditionData[] {
  if (groupKind === 'all' && 'all' in condition) {
    return condition.all;
  }

  if (groupKind === 'any' && 'any' in condition) {
    return condition.any;
  }

  return [];
}

function createConditionGroup(
  groupKind: 'all' | 'any',
  conditions: readonly ConditionData[],
): ConditionData {
  return groupKind === 'all' ? { all: [...conditions] } : { any: [...conditions] };
}

function getFirstTypedCondition(condition: ConditionData): TypedConditionData | undefined {
  if (isTypedCondition(condition)) {
    return condition;
  }

  if ('all' in condition) {
    return condition.all.find(isTypedCondition);
  }

  if ('any' in condition) {
    return condition.any.find(isTypedCondition);
  }

  if ('not' in condition) {
    return getFirstTypedCondition(condition.not);
  }

  return undefined;
}

function isTypedCondition(condition: ConditionData): condition is TypedConditionData {
  return 'type' in condition;
}

function replaceArrayItem<T>(items: readonly T[], index: number, nextItem: T): T[] {
  return items.map((item, itemIndex) => (itemIndex === index ? nextItem : item));
}

function moveArrayItem<T>(items: readonly T[], fromIndex: number, toIndex: number): T[] {
  const nextItems = [...items];
  const [item] = nextItems.splice(fromIndex, 1);
  nextItems.splice(toIndex, 0, item);

  return nextItems;
}

function reorderArrayByDrop<T>(
  items: readonly T[],
  fromIndex: number,
  targetIndex: number,
  position: DropPosition,
): T[] {
  const nextItems = [...items];
  const [item] = nextItems.splice(fromIndex, 1);

  if (item === undefined) {
    return [...items];
  }

  let insertIndex = position === 'before' ? targetIndex : targetIndex + 1;

  if (fromIndex < insertIndex) {
    insertIndex -= 1;
  }

  nextItems.splice(Math.max(0, Math.min(insertIndex, nextItems.length)), 0, item);

  return nextItems;
}

function getDropPositionFromRect(rect: DOMRect, clientY: number): DropPosition {
  return clientY < rect.top + rect.height / 2 ? 'before' : 'after';
}

function getActionDropTarget(
  clientX: number,
  clientY: number,
): { element: HTMLElement; index: number } | undefined {
  const element = document.elementFromPoint(clientX, clientY);
  const actionCard = element?.closest('[data-action-index]');

  if (!(actionCard instanceof HTMLElement)) {
    return undefined;
  }

  const index = Number(actionCard.dataset.actionIndex);

  if (!Number.isInteger(index)) {
    return undefined;
  }

  return { element: actionCard, index };
}

function getActionCardClassName(
  action: ActionData,
  dragState: ActionDragState | undefined,
  index: number,
): string {
  const classes = [
    'event-action-card',
    `is-${action.type.split('.')[0].replace(/[^a-z0-9_-]/gi, '-')}`,
  ];

  if (dragState?.index === index) {
    classes.push('is-dragging');
  }

  if (dragState?.overIndex === index) {
    classes.push(`drop-${dragState.position}`);
  }

  return classes.join(' ');
}

function formatConditionSummary(condition: ConditionData): string {
  if ('all' in condition) {
    return `All (${condition.all.length})`;
  }

  if ('any' in condition) {
    return `Any (${condition.any.length})`;
  }

  if ('not' in condition) {
    return 'Not';
  }

  return condition.type;
}

function getConditionRuntimePreview(
  condition: ConditionData | undefined,
  runtimeState: EventRuntimeState | undefined,
): { className: string; text: string } {
  if (!condition) {
    return { className: 'is-neutral', text: 'Always' };
  }

  const summary = formatConditionSummary(condition);

  if (!runtimeState) {
    return { className: 'is-neutral', text: summary };
  }

  const passes = new ConditionSystem().evaluate(condition, runtimeState);

  return {
    className: passes ? 'is-passing' : 'is-blocked',
    text: `${summary} / ${passes ? 'Runtime pass' : 'Runtime blocked'}`,
  };
}

function parseEditableValue(value: string): boolean | string | number {
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

function formatEditableValue(value: boolean | string | number): string {
  return String(value);
}

function parseMaterialParameterValue(value: string): MaterialParameterValueData {
  const trimmed = value.trim();

  if (trimmed === 'null') {
    return null;
  }

  try {
    const parsed = JSON.parse(trimmed) as unknown;

    if (
      parsed === null ||
      typeof parsed === 'boolean' ||
      typeof parsed === 'number' ||
      typeof parsed === 'string' ||
      isNumberTuple(parsed, 2) ||
      isNumberTuple(parsed, 3)
    ) {
      return parsed;
    }
  } catch {
    return parseEditableValue(value);
  }

  return value;
}

function formatMaterialParameterValue(value: MaterialParameterValueData): string {
  return Array.isArray(value) || value === null ? JSON.stringify(value) : String(value);
}

function isNumberTuple(
  value: unknown,
  length: 2 | 3,
): value is [number, number] | [number, number, number] {
  return (
    Array.isArray(value) &&
    value.length === length &&
    value.every((entry) => typeof entry === 'number' && Number.isFinite(entry))
  );
}

function toVec3(
  values: [number, number, number] | [number, number, number, number],
): [number, number, number] {
  return [values[0], values[1], values[2]];
}

function toQuat(
  values: [number, number, number] | [number, number, number, number],
): [number, number, number, number] {
  return [values[0], values[1], values[2], values[3] ?? 1];
}

function updateVectorValue(
  values: readonly [number, number, number] | readonly [number, number, number, number],
  index: number,
  value: number,
): [number, number, number] | [number, number, number, number] {
  if (values.length === 4) {
    const nextValues: [number, number, number, number] = [
      values[0],
      values[1],
      values[2],
      values[3],
    ];
    nextValues[index] = value;
    return nextValues;
  }

  const nextValues: [number, number, number] = [values[0], values[1], values[2]];
  nextValues[index] = value;
  return nextValues;
}

function formatJson(value: unknown): string {
  return JSON.stringify(value, null, 2);
}

function formatIssue(issue: { path: PropertyKey[]; message: string }): string {
  const path = issue.path.join('.') || 'event';

  return `${path}: ${issue.message}`;
}
