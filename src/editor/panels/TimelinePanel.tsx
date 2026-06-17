import { useState } from 'react';

import { ActionSchema, type ActionData } from '../../schemas/action.schema';
import {
  TimelineSchema,
  type TimelineData,
  type TimelineTrackData,
} from '../../schemas/timeline.schema';

export type TimelineSaveStatus = 'idle' | 'saving' | 'saved' | 'failed';
export type TimelineTrackKind = TimelineTrackData['type'];
export type TimelineItemOperation = 'add' | 'update' | 'remove';

type PropertyTimelineTrack = Extract<TimelineTrackData, { type: 'property' }>;
type PropertyTimelineKey = PropertyTimelineTrack['keys'][number];

export interface TimelinePanelProps {
  timelines: readonly TimelineData[];
  selectedTimeline: TimelineData | undefined;
  selectedTrackId: string | undefined;
  currentTime: number;
  saveStatus: TimelineSaveStatus;
  previewStatus: string;
  entityIds: readonly string[];
  cameraShotIds: readonly string[];
  soundAssetIds: readonly string[];
  onSelectTimeline: (timelineId: string) => void;
  onSelectTrack: (trackId: string | undefined) => void;
  onScrubTimeline: (timelineId: string, time: number) => void;
  onAddTrack: (timelineId: string, trackType: TimelineTrackKind) => void;
  onApplyTrack: (timelineId: string, track: TimelineTrackData) => void;
  onApplyTrackItem: (
    timelineId: string,
    track: TimelineTrackData,
    operation: TimelineItemOperation,
    itemLabel: string,
  ) => void;
  onRemoveTrack: (timelineId: string, trackId: string) => void;
  onSaveTimeline: (timeline: TimelineData) => void;
}

const TRACK_TYPES: TimelineTrackKind[] = [
  'action',
  'animation.play',
  'camera.shot',
  'property',
  'subtitle',
  'sound',
];

export function TimelinePanel({
  timelines,
  selectedTimeline,
  selectedTrackId,
  currentTime,
  saveStatus,
  previewStatus,
  entityIds,
  cameraShotIds,
  soundAssetIds,
  onSelectTimeline,
  onSelectTrack,
  onScrubTimeline,
  onAddTrack,
  onApplyTrack,
  onApplyTrackItem,
  onRemoveTrack,
  onSaveTimeline,
}: TimelinePanelProps) {
  const [trackType, setTrackType] = useState<TimelineTrackKind>('action');
  const [draftTrackState, setDraftTrackState] = useState<{
    timelineId: string;
    trackId: string;
    track: TimelineTrackData;
  }>();
  const [keyIndexState, setKeyIndexState] = useState({ timelineId: '', trackId: '', index: 0 });
  const [draftKeyState, setDraftKeyState] = useState<{
    timelineId: string;
    trackId: string;
    index: number;
    key: PropertyTimelineKey;
  }>();
  const [actionPayloadState, setActionPayloadState] = useState({
    timelineId: '',
    trackId: '',
    json: '',
  });
  const selectedTrack =
    selectedTimeline?.tracks.find((track) => track.id === selectedTrackId) ??
    selectedTimeline?.tracks[0];
  const draftTrack =
    selectedTimeline &&
    selectedTrack &&
    draftTrackState?.timelineId === selectedTimeline.id &&
    draftTrackState.trackId === selectedTrack.id
      ? draftTrackState.track
      : selectedTrack;
  const timelineTime = clampTime(currentTime, selectedTimeline?.duration ?? 0);
  const playheadPercent = selectedTimeline
    ? `${(timelineTime / selectedTimeline.duration) * 100}%`
    : '0%';
  const scrubSelectedTimeline = (time: number) => {
    if (selectedTimeline) {
      onScrubTimeline(selectedTimeline.id, time);
    }
  };
  const draftTimeline =
    selectedTimeline && draftTrack ? replaceTrack(selectedTimeline, draftTrack) : undefined;
  const validationResult = draftTimeline ? TimelineSchema.safeParse(draftTimeline) : undefined;
  const validationMessages =
    validationResult && !validationResult.success
      ? validationResult.error.issues.map((issue) => {
          const path = issue.path.join('.') || 'timeline';
          return `${path}: ${issue.message}`;
        })
      : [];
  const canApply =
    Boolean(draftTrack) &&
    validationResult?.success === true &&
    JSON.stringify(draftTrack) !== JSON.stringify(selectedTrack);
  const propertyTrack = draftTrack?.type === 'property' ? draftTrack : undefined;
  const keyIndex =
    selectedTimeline &&
    propertyTrack &&
    keyIndexState.timelineId === selectedTimeline.id &&
    keyIndexState.trackId === propertyTrack.id
      ? Math.min(keyIndexState.index, propertyTrack.keys.length - 1)
      : 0;
  const selectedKey = propertyTrack?.keys[keyIndex];
  const draftKey =
    selectedTimeline &&
    propertyTrack &&
    selectedKey &&
    draftKeyState?.timelineId === selectedTimeline.id &&
    draftKeyState.trackId === propertyTrack.id &&
    draftKeyState.index === keyIndex
      ? draftKeyState.key
      : selectedKey;
  const draftKeyTrack =
    propertyTrack && draftKey ? replacePropertyKey(propertyTrack, keyIndex, draftKey) : undefined;
  const keyValidationResult =
    selectedTimeline && draftKeyTrack
      ? TimelineSchema.safeParse(replaceTrack(selectedTimeline, draftKeyTrack))
      : undefined;
  const keyValidationMessages =
    keyValidationResult && !keyValidationResult.success
      ? keyValidationResult.error.issues.map((issue) => {
          const path = issue.path.join('.') || 'timeline';
          return `${path}: ${issue.message}`;
        })
      : [];
  const canApplyKey =
    Boolean(draftKeyTrack) &&
    keyValidationResult?.success === true &&
    JSON.stringify(draftKey) !== JSON.stringify(selectedKey);
  const actionPayloadJson =
    selectedTimeline &&
    draftTrack?.type === 'action' &&
    actionPayloadState.timelineId === selectedTimeline.id &&
    actionPayloadState.trackId === draftTrack.id
      ? actionPayloadState.json
      : draftTrack?.type === 'action'
        ? JSON.stringify(draftTrack.action, null, 2)
        : '';
  const actionPayloadParseResult =
    draftTrack?.type === 'action' ? parseActionPayload(actionPayloadJson) : undefined;
  const actionValidationMessages =
    actionPayloadParseResult && !actionPayloadParseResult.success
      ? actionPayloadParseResult.messages
      : [];
  const canApplyAction =
    draftTrack?.type === 'action' &&
    actionPayloadParseResult?.success === true &&
    JSON.stringify(actionPayloadParseResult.action) !== JSON.stringify(draftTrack.action);
  const parsedFlagSetAction =
    actionPayloadParseResult?.success === true &&
    actionPayloadParseResult.action.type === 'flag.set'
      ? actionPayloadParseResult.action
      : undefined;

  const updateDraftTrack = (track: TimelineTrackData) => {
    if (!selectedTimeline) {
      return;
    }

    setDraftTrackState({
      timelineId: selectedTimeline.id,
      trackId: track.id,
      track,
    });
  };

  const applyDraftTrack = () => {
    if (!selectedTimeline || !draftTrack || !validationResult?.success) {
      return;
    }

    const parsedTrack = validationResult.data.tracks.find((track) => track.id === draftTrack.id);

    if (parsedTrack) {
      onApplyTrack(selectedTimeline.id, parsedTrack);
    }
  };

  const updateDraftKey = (key: PropertyTimelineKey) => {
    if (!selectedTimeline || !propertyTrack) {
      return;
    }

    setDraftKeyState({
      timelineId: selectedTimeline.id,
      trackId: propertyTrack.id,
      index: keyIndex,
      key,
    });
  };

  const addPropertyKey = () => {
    if (!selectedTimeline || !propertyTrack) {
      return;
    }

    const lastKey = propertyTrack.keys[propertyTrack.keys.length - 1];
    const nextKey: PropertyTimelineKey = {
      time: clampTime(lastKey.time + 0.5, selectedTimeline.duration),
      value: lastKey.value,
      ease: lastKey.ease ?? 'linear',
    };
    const nextTrack: PropertyTimelineTrack = {
      ...propertyTrack,
      keys: sortPropertyKeys([...propertyTrack.keys, nextKey]),
    };

    onApplyTrackItem(selectedTimeline.id, nextTrack, 'add', `${propertyTrack.id} key`);
  };

  const applyPropertyKey = () => {
    if (!selectedTimeline || !draftKeyTrack || !keyValidationResult?.success) {
      return;
    }

    const parsedTrack = keyValidationResult.data.tracks.find(
      (track) => track.id === draftKeyTrack.id,
    );

    if (parsedTrack) {
      onApplyTrackItem(selectedTimeline.id, parsedTrack, 'update', `${draftKeyTrack.id} key`);
    }
  };

  const removePropertyKey = () => {
    if (!selectedTimeline || !propertyTrack || propertyTrack.keys.length <= 1) {
      return;
    }

    const nextTrack: PropertyTimelineTrack = {
      ...propertyTrack,
      keys: propertyTrack.keys.filter((_, index) => index !== keyIndex),
    };

    onApplyTrackItem(selectedTimeline.id, nextTrack, 'remove', `${propertyTrack.id} key`);
    setKeyIndexState({
      timelineId: selectedTimeline.id,
      trackId: propertyTrack.id,
      index: Math.max(0, keyIndex - 1),
    });
  };

  const applyActionPayload = () => {
    if (
      !selectedTimeline ||
      draftTrack?.type !== 'action' ||
      actionPayloadParseResult?.success !== true
    ) {
      return;
    }

    onApplyTrackItem(
      selectedTimeline.id,
      { ...draftTrack, action: actionPayloadParseResult.action },
      'update',
      `${draftTrack.id} action`,
    );
  };

  if (timelines.length === 0) {
    return (
      <section className="timeline-panel" aria-labelledby="timeline-heading">
        <div className="timeline-header">
          <strong id="timeline-heading">Timeline</strong>
          <span>No timelines loaded</span>
        </div>
      </section>
    );
  }

  return (
    <section className="timeline-panel" aria-labelledby="timeline-heading">
      <div className="timeline-header">
        <strong id="timeline-heading">Timeline</strong>
        <span role="status">{previewStatus}</span>
      </div>

      <div className="timeline-controls">
        <label className="field-inline" htmlFor="timeline-select">
          <span>Timeline</span>
          <select
            id="timeline-select"
            value={selectedTimeline?.id ?? ''}
            onChange={(event) => onSelectTimeline(event.target.value)}
          >
            {timelines.map((timeline) => (
              <option key={timeline.id} value={timeline.id}>
                {timeline.name ? `${timeline.name} (${timeline.id})` : timeline.id}
              </option>
            ))}
          </select>
        </label>

        <div className="timeline-meta" aria-label="Timeline summary">
          <span>{selectedTimeline ? `${selectedTimeline.duration.toFixed(2)}s` : '0.00s'}</span>
          <span>{selectedTimeline ? `${selectedTimeline.tracks.length} tracks` : '0 tracks'}</span>
          <span>{formatSaveStatus(saveStatus)}</span>
        </div>

        <label className="field-inline" htmlFor="timeline-track-type">
          <span>Add</span>
          <select
            id="timeline-track-type"
            value={trackType}
            onChange={(event) => setTrackType(event.target.value as TimelineTrackKind)}
          >
            {TRACK_TYPES.map((type) => (
              <option key={type} value={type}>
                {type}
              </option>
            ))}
          </select>
        </label>

        <div className="timeline-command-row">
          <button
            type="button"
            onClick={() => selectedTimeline && onAddTrack(selectedTimeline.id, trackType)}
            disabled={!selectedTimeline}
          >
            Add Track
          </button>
          <button
            type="button"
            onClick={() => selectedTimeline && onSaveTimeline(selectedTimeline)}
            disabled={!selectedTimeline || saveStatus === 'saving'}
          >
            Save Timeline
          </button>
        </div>
      </div>

      {selectedTimeline ? (
        <>
          <label className="timeline-scrubber" htmlFor="timeline-scrub">
            <span>{timelineTime.toFixed(2)}s</span>
            <input
              id="timeline-scrub"
              type="range"
              min="0"
              max={selectedTimeline.duration}
              step="0.05"
              value={timelineTime}
              onInput={(event) => scrubSelectedTimeline(Number(event.currentTarget.value))}
              onChange={(event) => scrubSelectedTimeline(Number(event.currentTarget.value))}
            />
          </label>

          <div className="timeline-ruler" data-testid="timeline-ruler">
            {buildTicks(selectedTimeline.duration).map((time) => (
              <span key={time}>{time}s</span>
            ))}
            <div className="timeline-playhead" style={{ left: playheadPercent }} />
          </div>

          <ol className="timeline-track-list" aria-label="Timeline tracks">
            {selectedTimeline.tracks.map((track) => (
              <li
                key={track.id}
                className={track.id === selectedTrack?.id ? 'is-selected' : undefined}
              >
                <button type="button" onClick={() => onSelectTrack(track.id)}>
                  <strong>{track.type}</strong>
                  <span>{track.id}</span>
                  <small>{formatTrackTiming(track)}</small>
                </button>
              </li>
            ))}
          </ol>

          {draftTrack ? (
            <section className="timeline-track-editor" aria-labelledby="timeline-track-heading">
              <div className="panel-title-row">
                <h3 id="timeline-track-heading">Track</h3>
                <span>{draftTrack.id}</span>
              </div>

              {renderTrackFields({
                track: draftTrack,
                entityIds,
                cameraShotIds,
                soundAssetIds,
                onUpdate: updateDraftTrack,
              })}

              {validationMessages.length > 0 ? (
                <ul className="validation-list" role="alert">
                  {validationMessages.map((message) => (
                    <li key={message}>{message}</li>
                  ))}
                </ul>
              ) : null}

              <div className="timeline-command-row">
                <button type="button" onClick={applyDraftTrack} disabled={!canApply}>
                  Apply Track
                </button>
                <button
                  type="button"
                  onClick={() => onRemoveTrack(selectedTimeline.id, draftTrack.id)}
                >
                  Remove Track
                </button>
              </div>

              {draftTrack.type === 'action' ? (
                <section className="timeline-item-editor" aria-labelledby="timeline-action-heading">
                  <div className="panel-title-row">
                    <h3 id="timeline-action-heading">Action Marker</h3>
                    <span>{draftTrack.action.type}</span>
                  </div>
                  <label className="field-stack" htmlFor="timeline-action-json">
                    <span>Payload JSON</span>
                    <textarea
                      id="timeline-action-json"
                      value={actionPayloadJson}
                      rows={5}
                      spellCheck={false}
                      onChange={(event) =>
                        setActionPayloadState({
                          timelineId: selectedTimeline.id,
                          trackId: draftTrack.id,
                          json: event.target.value,
                        })
                      }
                    />
                  </label>

                  {actionValidationMessages.length > 0 ? (
                    <ul className="validation-list" role="alert">
                      {actionValidationMessages.map((message) => (
                        <li key={message}>{message}</li>
                      ))}
                    </ul>
                  ) : null}

                  <div className="timeline-command-row">
                    {parsedFlagSetAction && typeof parsedFlagSetAction.value === 'boolean' ? (
                      <button
                        type="button"
                        onClick={() =>
                          setActionPayloadState({
                            timelineId: selectedTimeline.id,
                            trackId: draftTrack.id,
                            json: JSON.stringify(
                              {
                                ...parsedFlagSetAction,
                                value: !parsedFlagSetAction.value,
                              },
                              null,
                              2,
                            ),
                          })
                        }
                      >
                        Toggle Flag Value
                      </button>
                    ) : null}
                    <button type="button" onClick={applyActionPayload} disabled={!canApplyAction}>
                      Apply Action
                    </button>
                  </div>
                </section>
              ) : null}

              {propertyTrack && draftKey ? (
                <section className="timeline-item-editor" aria-labelledby="timeline-key-heading">
                  <div className="panel-title-row">
                    <h3 id="timeline-key-heading">Keyframe</h3>
                    <span>{keyIndex + 1}</span>
                  </div>

                  <label className="field-stack" htmlFor="timeline-key-select">
                    <span>Key</span>
                    <select
                      id="timeline-key-select"
                      value={keyIndex}
                      onChange={(event) =>
                        setKeyIndexState({
                          timelineId: selectedTimeline.id,
                          trackId: propertyTrack.id,
                          index: Number(event.target.value),
                        })
                      }
                    >
                      {propertyTrack.keys.map((key, index) => (
                        <option key={`${propertyTrack.id}-${index}`} value={index}>
                          {index + 1} @ {key.time}s
                        </option>
                      ))}
                    </select>
                  </label>

                  <div className="timeline-track-fields">
                    <label className="field-stack" htmlFor="timeline-key-time">
                      <span>Time</span>
                      <input
                        id="timeline-key-time"
                        type="number"
                        min="0"
                        step="0.05"
                        value={draftKey.time}
                        onChange={(event) =>
                          updateDraftKey({ ...draftKey, time: Number(event.target.value) })
                        }
                      />
                    </label>
                    <label className="field-stack" htmlFor="timeline-key-value">
                      <span>Value</span>
                      <input
                        id="timeline-key-value"
                        type="text"
                        value={formatPropertyValue(draftKey.value)}
                        onChange={(event) =>
                          updateDraftKey({
                            ...draftKey,
                            value: parsePropertyValue(event.target.value),
                          })
                        }
                      />
                    </label>
                    <label className="field-stack" htmlFor="timeline-key-ease">
                      <span>Ease</span>
                      <input
                        id="timeline-key-ease"
                        type="text"
                        value={draftKey.ease ?? ''}
                        onChange={(event) =>
                          updateDraftKey({
                            ...draftKey,
                            ease: event.target.value || undefined,
                          })
                        }
                      />
                    </label>
                  </div>

                  {keyValidationMessages.length > 0 ? (
                    <ul className="validation-list" role="alert">
                      {keyValidationMessages.map((message) => (
                        <li key={message}>{message}</li>
                      ))}
                    </ul>
                  ) : null}

                  <div className="timeline-command-row">
                    <button type="button" onClick={addPropertyKey}>
                      Add Key
                    </button>
                    <button type="button" onClick={applyPropertyKey} disabled={!canApplyKey}>
                      Apply Keyframe
                    </button>
                    <button
                      type="button"
                      onClick={removePropertyKey}
                      disabled={propertyTrack.keys.length <= 1}
                    >
                      Remove Key
                    </button>
                  </div>
                </section>
              ) : null}
            </section>
          ) : null}
        </>
      ) : null}
    </section>
  );
}

interface TrackFieldProps {
  track: TimelineTrackData;
  entityIds: readonly string[];
  cameraShotIds: readonly string[];
  soundAssetIds: readonly string[];
  onUpdate: (track: TimelineTrackData) => void;
}

function renderTrackFields({
  track,
  entityIds,
  cameraShotIds,
  soundAssetIds,
  onUpdate,
}: TrackFieldProps) {
  return (
    <div className="timeline-track-fields">
      <label className="field-stack" htmlFor="timeline-track-time">
        <span>{getTimeLabel(track)}</span>
        <input
          id="timeline-track-time"
          type="number"
          min="0"
          step="0.05"
          value={getTrackTime(track)}
          onChange={(event) => onUpdate(updateTrackTime(track, Number(event.target.value)))}
        />
      </label>

      {hasDuration(track) ? (
        <label className="field-stack" htmlFor="timeline-track-duration">
          <span>Duration</span>
          <input
            id="timeline-track-duration"
            type="number"
            min="0.05"
            step="0.05"
            value={track.duration}
            onChange={(event) => onUpdate({ ...track, duration: Number(event.target.value) })}
          />
        </label>
      ) : null}

      {track.type === 'animation.play' ? (
        <>
          <SelectField
            id="timeline-track-entity"
            label="Entity"
            value={track.entityId}
            options={entityIds}
            onChange={(entityId) => onUpdate({ ...track, entityId })}
          />
          <label className="field-stack" htmlFor="timeline-track-clip">
            <span>Clip</span>
            <input
              id="timeline-track-clip"
              type="text"
              value={track.clip}
              onChange={(event) => onUpdate({ ...track, clip: event.target.value })}
            />
          </label>
        </>
      ) : null}

      {track.type === 'camera.shot' ? (
        <SelectField
          id="timeline-track-shot"
          label="Shot"
          value={track.shotId}
          options={cameraShotIds}
          onChange={(shotId) => onUpdate({ ...track, shotId })}
        />
      ) : null}

      {track.type === 'property' ? (
        <>
          <SelectField
            id="timeline-track-target"
            label="Target"
            value={track.target}
            options={entityIds}
            onChange={(target) => onUpdate({ ...track, target })}
          />
          <label className="field-stack" htmlFor="timeline-track-property">
            <span>Property</span>
            <input
              id="timeline-track-property"
              type="text"
              value={track.property}
              onChange={(event) => onUpdate({ ...track, property: event.target.value })}
            />
          </label>
        </>
      ) : null}

      {track.type === 'subtitle' ? (
        <label className="field-stack" htmlFor="timeline-track-text">
          <span>Text</span>
          <input
            id="timeline-track-text"
            type="text"
            value={track.text}
            onChange={(event) => onUpdate({ ...track, text: event.target.value })}
          />
        </label>
      ) : null}

      {track.type === 'sound' ? (
        <SelectField
          id="timeline-track-sound"
          label="Sound"
          value={track.soundId}
          options={soundAssetIds}
          onChange={(soundId) => onUpdate({ ...track, soundId })}
        />
      ) : null}
    </div>
  );
}

interface SelectFieldProps {
  id: string;
  label: string;
  value: string;
  options: readonly string[];
  onChange: (value: string) => void;
}

function SelectField({ id, label, value, options, onChange }: SelectFieldProps) {
  return (
    <label className="field-stack" htmlFor={id}>
      <span>{label}</span>
      <select id={id} value={value} onChange={(event) => onChange(event.target.value)}>
        {options.length === 0 ? <option value={value}>{value}</option> : null}
        {options.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
    </label>
  );
}

function replaceTrack(timeline: TimelineData, track: TimelineTrackData): TimelineData {
  return {
    ...timeline,
    tracks: timeline.tracks.map((item) => (item.id === track.id ? track : item)),
  };
}

function replacePropertyKey(
  track: PropertyTimelineTrack,
  keyIndex: number,
  key: PropertyTimelineKey,
): PropertyTimelineTrack {
  return {
    ...track,
    keys: track.keys.map((item, index) => (index === keyIndex ? key : item)),
  };
}

function sortPropertyKeys(keys: readonly PropertyTimelineKey[]): PropertyTimelineKey[] {
  return [...keys].sort((left, right) => left.time - right.time);
}

function parseActionPayload(
  json: string,
): { success: true; action: ActionData } | { success: false; messages: string[] } {
  try {
    const parsed = ActionSchema.safeParse(JSON.parse(json) as unknown);

    if (parsed.success) {
      return { success: true, action: parsed.data };
    }

    return {
      success: false,
      messages: parsed.error.issues.map((issue) => {
        const path = issue.path.join('.') || 'action';
        return `${path}: ${issue.message}`;
      }),
    };
  } catch (error) {
    return {
      success: false,
      messages: [error instanceof Error ? error.message : String(error)],
    };
  }
}

function formatPropertyValue(value: PropertyTimelineKey['value']): string {
  return JSON.stringify(value);
}

function parsePropertyValue(value: string): PropertyTimelineKey['value'] {
  try {
    const parsed = JSON.parse(value) as unknown;

    if (typeof parsed === 'boolean' || typeof parsed === 'number' || typeof parsed === 'string') {
      return parsed;
    }

    if (
      Array.isArray(parsed) &&
      parsed.length === 3 &&
      parsed.every((item) => typeof item === 'number')
    ) {
      return [parsed[0], parsed[1], parsed[2]];
    }
  } catch {
    const numeric = Number(value);

    if (Number.isFinite(numeric)) {
      return numeric;
    }
  }

  return value;
}

function buildTicks(duration: number): number[] {
  const last = Math.max(1, Math.ceil(duration));

  return Array.from({ length: last + 1 }, (_, index) => index);
}

function formatTrackTiming(track: TimelineTrackData): string {
  switch (track.type) {
    case 'action':
    case 'subtitle':
    case 'sound':
      return `@ ${track.time}s`;
    case 'animation.play':
    case 'camera.shot':
    case 'wait':
      return `${track.start}s`;
    case 'property':
      return `${Math.min(...track.keys.map((key) => key.time))}s`;
  }
}

function getTimeLabel(track: TimelineTrackData): string {
  return track.type === 'action' || track.type === 'subtitle' || track.type === 'sound'
    ? 'Time'
    : 'Start';
}

function getTrackTime(track: TimelineTrackData): number {
  switch (track.type) {
    case 'action':
    case 'sound':
    case 'subtitle':
      return track.time;
    case 'animation.play':
    case 'camera.shot':
    case 'wait':
      return track.start;
    case 'property':
      return Math.min(...track.keys.map((key) => key.time));
  }
}

function updateTrackTime(track: TimelineTrackData, time: number): TimelineTrackData {
  switch (track.type) {
    case 'action':
    case 'sound':
    case 'subtitle':
      return { ...track, time };
    case 'animation.play':
    case 'camera.shot':
    case 'wait':
      return { ...track, start: time };
    case 'property': {
      const firstKeyTime = Math.min(...track.keys.map((key) => key.time));
      const delta = time - firstKeyTime;

      return {
        ...track,
        keys: track.keys.map((key) => ({
          ...key,
          time: Math.max(0, Math.round((key.time + delta) * 100) / 100),
        })),
      };
    }
  }
}

function hasDuration(
  track: TimelineTrackData,
): track is Extract<TimelineTrackData, { duration: number }> {
  return 'duration' in track;
}

function clampTime(time: number, duration: number): number {
  return Math.min(Math.max(time, 0), duration);
}

function formatSaveStatus(status: TimelineSaveStatus): string {
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
