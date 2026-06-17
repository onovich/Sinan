import { useState } from 'react';

import { getPreviewStatusPill, getSaveStatusPill, type EditorSaveStatus } from '../editorStatus';
import {
  CameraShotSchema,
  type CameraShotData,
  type CameraShotKeyData,
} from '../../schemas/cameraShot.schema';

export type CameraShotSaveStatus = EditorSaveStatus;

export interface CameraShotPanelProps {
  shots: readonly CameraShotData[];
  selectedShot: CameraShotData | undefined;
  selectedEntityId?: string;
  saveStatus: CameraShotSaveStatus;
  isDirty: boolean;
  saveError?: string;
  previewStatus: string;
  onSelectShot: (shotId: string) => void;
  onCreateShot: () => void;
  onApplyShot: (shot: CameraShotData) => void;
  onSaveShot: (shot: CameraShotData) => void;
  onSetKeyFromView: (shot: CameraShotData, keyIndex: number) => void;
  onPreviewShot: (shot: CameraShotData, time: number) => void;
}

export function CameraShotPanel({
  shots,
  selectedShot,
  selectedEntityId,
  saveStatus,
  isDirty,
  saveError,
  previewStatus,
  onSelectShot,
  onCreateShot,
  onApplyShot,
  onSaveShot,
  onSetKeyFromView,
  onPreviewShot,
}: CameraShotPanelProps) {
  const [keyIndexState, setKeyIndexState] = useState({ shotId: '', index: 0 });
  const [draftKeyState, setDraftKeyState] = useState<{
    shotId: string;
    index: number;
    sourceSignature: string;
    key: CameraShotKeyData;
  }>();

  const keyframedShot = selectedShot?.type === 'keyframed' ? selectedShot : undefined;
  const keyIndex =
    keyframedShot && keyIndexState.shotId === keyframedShot.id
      ? Math.min(keyIndexState.index, keyframedShot.keys.length - 1)
      : 0;
  const currentKey = keyframedShot?.keys[keyIndex];
  const currentKeySignature = currentKey ? JSON.stringify(currentKey) : '';
  const draftKey =
    keyframedShot &&
    draftKeyState?.shotId === keyframedShot.id &&
    draftKeyState.index === keyIndex &&
    draftKeyState.sourceSignature === currentKeySignature
      ? draftKeyState.key
      : currentKey;
  const draftShot =
    keyframedShot && draftKey ? replaceKey(keyframedShot, keyIndex, draftKey) : undefined;
  const validationResult = draftShot ? CameraShotSchema.safeParse(draftShot) : undefined;
  const validationMessages =
    validationResult && !validationResult.success
      ? validationResult.error.issues.map((issue) => {
          const path = issue.path.join('.') || 'cameraShot';
          return `${path}: ${issue.message}`;
        })
      : [];
  const canApply =
    Boolean(draftShot) &&
    validationResult?.success === true &&
    JSON.stringify(draftShot) !== JSON.stringify(selectedShot);
  const saveStatusPill = getSaveStatusPill({
    saveStatus,
    isDirty,
    issueCount: validationMessages.length,
  });
  const previewStatusPill = getPreviewStatusPill(previewStatus);

  const updateDraftKey = (patch: Partial<CameraShotKeyData>) => {
    if (!keyframedShot || !draftKey) {
      return;
    }

    setDraftKeyState({
      shotId: keyframedShot.id,
      index: keyIndex,
      sourceSignature: currentKeySignature,
      key: {
        ...draftKey,
        ...patch,
      },
    });
  };

  const applyDraft = () => {
    if (validationResult?.success) {
      onApplyShot(validationResult.data);
      setDraftKeyState(undefined);
    }
  };

  const addKey = () => {
    if (!keyframedShot || !currentKey) {
      return;
    }

    const nextIndex = keyIndex + 1;
    const nextKey: CameraShotKeyData = {
      ...currentKey,
      time: clampTime(currentKey.time + 0.5, keyframedShot.duration),
    };

    onApplyShot({
      ...keyframedShot,
      keys: insertArrayItem(keyframedShot.keys, nextIndex, nextKey),
    });
    setDraftKeyState(undefined);
    setKeyIndexState({ shotId: keyframedShot.id, index: nextIndex });
  };

  const removeKey = () => {
    if (!keyframedShot || keyframedShot.keys.length <= 1) {
      return;
    }

    onApplyShot({
      ...keyframedShot,
      keys: keyframedShot.keys.filter((_, index) => index !== keyIndex),
    });
    setDraftKeyState(undefined);
    setKeyIndexState({ shotId: keyframedShot.id, index: Math.max(0, keyIndex - 1) });
  };

  const moveKey = (direction: -1 | 1) => {
    if (!keyframedShot) {
      return;
    }

    const nextIndex = keyIndex + direction;

    if (nextIndex < 0 || nextIndex >= keyframedShot.keys.length) {
      return;
    }

    onApplyShot({
      ...keyframedShot,
      keys: swapKeyTimes(keyframedShot.keys, keyIndex, nextIndex),
    });
    setDraftKeyState(undefined);
    setKeyIndexState({ shotId: keyframedShot.id, index: nextIndex });
  };

  const lookAtSelected = () => {
    if (!selectedEntityId || !keyframedShot || !draftKey) {
      return;
    }

    const nextShot = replaceKey(keyframedShot, keyIndex, {
      ...draftKey,
      lookAt: selectedEntityId,
    });

    onApplyShot(nextShot);
    setDraftKeyState(undefined);
  };

  return (
    <section className="camera-shot-panel" aria-labelledby="camera-shot-heading">
      <div className="panel-title-row">
        <h2 id="camera-shot-heading">Camera Shots</h2>
        <span className={saveStatusPill.className} role="status">
          {saveStatusPill.text}
        </span>
      </div>

      <div className="event-command-row">
        <button type="button" onClick={onCreateShot}>
          Create Shot
        </button>
        <button
          type="button"
          onClick={() => selectedShot && onSaveShot(selectedShot)}
          disabled={!selectedShot || saveStatus === 'saving'}
        >
          Save Shot
        </button>
      </div>

      {saveError ? (
        <p className="panel-error" role="alert">
          {saveError}
        </p>
      ) : null}

      {shots.length > 0 ? (
        <label className="field-stack" htmlFor="camera-shot-select">
          <span>Shot</span>
          <select
            id="camera-shot-select"
            value={selectedShot?.id ?? ''}
            onChange={(event) => onSelectShot(event.target.value)}
          >
            {shots.map((shot) => (
              <option key={shot.id} value={shot.id}>
                {shot.name ? `${shot.name} (${shot.id})` : shot.id}
              </option>
            ))}
          </select>
        </label>
      ) : (
        <p className="panel-empty">No camera shots loaded</p>
      )}

      {keyframedShot && draftKey ? (
        <>
          <label className="field-stack" htmlFor="camera-key-select">
            <span>Key</span>
            <select
              id="camera-key-select"
              value={keyIndex}
              onChange={(event) =>
                setKeyIndexState({
                  shotId: keyframedShot.id,
                  index: Number(event.target.value),
                })
              }
            >
              {keyframedShot.keys.map((key, index) => (
                <option key={`${keyframedShot.id}-${index}`} value={index}>
                  {index + 1} @ {key.time}s
                </option>
              ))}
            </select>
          </label>

          <div className="key-command-row" aria-label="Camera keyframe commands">
            <button type="button" onClick={addKey}>
              Add Key
            </button>
            <button type="button" onClick={() => moveKey(-1)} disabled={keyIndex === 0}>
              Move Up
            </button>
            <button
              type="button"
              onClick={() => moveKey(1)}
              disabled={keyIndex >= keyframedShot.keys.length - 1}
            >
              Move Down
            </button>
            <button type="button" onClick={removeKey} disabled={keyframedShot.keys.length <= 1}>
              Remove Key
            </button>
          </div>

          <div className="camera-grid">
            <label className="field-stack" htmlFor="camera-key-time">
              <span>Time</span>
              <input
                id="camera-key-time"
                type="number"
                step="0.1"
                value={draftKey.time}
                onChange={(event) => updateDraftKey({ time: Number(event.target.value) })}
              />
            </label>
            <label className="field-stack" htmlFor="camera-key-fov">
              <span>FOV</span>
              <input
                id="camera-key-fov"
                type="number"
                step="1"
                value={draftKey.fov}
                onChange={(event) => updateDraftKey({ fov: Number(event.target.value) })}
              />
            </label>
          </div>

          <fieldset className="camera-fieldset">
            <legend>Position</legend>
            {(['X', 'Y', 'Z'] as const).map((axis, axisIndex) => (
              <label key={axis} className="field-stack" htmlFor={`camera-position-${axis}`}>
                <span>{axis}</span>
                <input
                  id={`camera-position-${axis}`}
                  type="number"
                  step="0.1"
                  value={draftKey.position[axisIndex]}
                  onChange={(event) => {
                    const position: [number, number, number] = [...draftKey.position];
                    position[axisIndex] = Number(event.target.value);
                    updateDraftKey({ position });
                  }}
                />
              </label>
            ))}
          </fieldset>

          <label className="field-stack" htmlFor="camera-key-ease">
            <span>Ease</span>
            <input
              id="camera-key-ease"
              type="text"
              value={draftKey.ease ?? ''}
              onChange={(event) => updateDraftKey({ ease: event.target.value || undefined })}
            />
          </label>

          {validationMessages.length > 0 ? (
            <ul className="validation-list" role="alert">
              {validationMessages.map((message) => (
                <li key={message}>{message}</li>
              ))}
            </ul>
          ) : null}

          <div className="camera-command-row">
            <button type="button" onClick={applyDraft} disabled={!canApply}>
              Apply Key
            </button>
            <button type="button" onClick={lookAtSelected} disabled={!selectedEntityId}>
              Look At Selected
            </button>
            <button
              type="button"
              onClick={() => {
                onSetKeyFromView(keyframedShot, keyIndex);
                setDraftKeyState(undefined);
              }}
            >
              Set Key From View
            </button>
            <button type="button" onClick={() => onPreviewShot(keyframedShot, draftKey.time)}>
              View Through Camera
            </button>
          </div>

          <p className="preview-status" role="status">
            <span className={previewStatusPill.className}>{previewStatusPill.text}</span>
          </p>
        </>
      ) : null}
    </section>
  );
}

function replaceKey(
  shot: Extract<CameraShotData, { type: 'keyframed' }>,
  keyIndex: number,
  key: CameraShotKeyData,
): CameraShotData {
  return {
    ...shot,
    keys: shot.keys.map((item, index) => (index === keyIndex ? key : item)),
  };
}

function insertArrayItem<T>(items: readonly T[], index: number, item: T): T[] {
  return [...items.slice(0, index), item, ...items.slice(index)];
}

function swapKeyTimes(
  keys: readonly CameraShotKeyData[],
  leftIndex: number,
  rightIndex: number,
): CameraShotKeyData[] {
  return keys.map((key, index) => {
    if (index === leftIndex) {
      return { ...key, time: keys[rightIndex].time };
    }

    if (index === rightIndex) {
      return { ...key, time: keys[leftIndex].time };
    }

    return key;
  });
}

function clampTime(time: number, duration: number): number {
  return Math.min(Math.max(time, 0), duration);
}
