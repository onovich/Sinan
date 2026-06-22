import { useEffect, useRef, useState, type MouseEvent as ReactMouseEvent } from 'react';

import { getPreviewStatusPill, getSaveStatusPill, type EditorSaveStatus } from '../editorStatus';
import {
  CameraShotSchema,
  type CameraShotData,
  type CameraShotKeyData,
} from '../../schemas/cameraShot.schema';
import { NumericScrubInput } from '../components/NumericScrubInput';

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
  const [keyStripDragState, setKeyStripDragState] = useState<{
    index: number;
    time: number;
  }>();
  const cleanupKeyStripDragRef = useRef<(() => void) | undefined>(undefined);

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
  const draftPosition = draftKey ? getCameraPointVector(draftKey.position) : undefined;
  const visibleKeys =
    keyframedShot?.keys.map((key, index) =>
      draftKeyState?.shotId === keyframedShot.id &&
      draftKeyState.index === index &&
      draftKeyState.sourceSignature === JSON.stringify(key)
        ? draftKeyState.key
        : key,
    ) ?? [];
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

  useEffect(
    () => () => {
      cleanupKeyStripDragRef.current?.();
    },
    [],
  );

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

  const commitDraftKey = (key: CameraShotKeyData) => {
    if (!keyframedShot) {
      return;
    }

    const nextShot = replaceKey(keyframedShot, keyIndex, key);
    const result = CameraShotSchema.safeParse(nextShot);

    if (result.success) {
      onApplyShot(result.data);
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

  const previewDraftKey = (key: CameraShotKeyData) => {
    if (!keyframedShot) {
      return;
    }

    onPreviewShot(replaceKey(keyframedShot, keyIndex, key), key.time);
  };

  const startKeyStripDrag = (event: ReactMouseEvent<HTMLButtonElement>, markerIndex: number) => {
    if (!keyframedShot || event.button !== 0) {
      return;
    }

    const strip = event.currentTarget.closest('.camera-key-strip');
    const sourceKey = visibleKeys[markerIndex] ?? keyframedShot.keys[markerIndex];
    const sourceSignature = JSON.stringify(keyframedShot.keys[markerIndex]);

    if (!strip || !sourceKey) {
      return;
    }

    event.preventDefault();
    cleanupKeyStripDragRef.current?.();
    setKeyIndexState({ shotId: keyframedShot.id, index: markerIndex });
    const stripRect = strip.getBoundingClientRect();

    const updateDrag = (clientX: number): CameraShotKeyData => {
      const time = getStripTime(clientX, stripRect, keyframedShot.duration);
      const nextKey = { ...sourceKey, time };

      setDraftKeyState({
        shotId: keyframedShot.id,
        index: markerIndex,
        sourceSignature,
        key: nextKey,
      });
      setKeyStripDragState({ index: markerIndex, time });
      onPreviewShot(replaceKey(keyframedShot, markerIndex, nextKey), time);

      return nextKey;
    };

    updateDrag(event.clientX);

    const handleMouseMove = (nativeEvent: MouseEvent) => {
      updateDrag(nativeEvent.clientX);
    };
    const handleMouseUp = (nativeEvent: MouseEvent) => {
      const nextKey = updateDrag(nativeEvent.clientX);
      cleanupKeyStripDragRef.current?.();
      cleanupKeyStripDragRef.current = undefined;
      setKeyStripDragState(undefined);

      const result = CameraShotSchema.safeParse(replaceKey(keyframedShot, markerIndex, nextKey));

      if (result.success) {
        onApplyShot(result.data);
        setDraftKeyState(undefined);
      }
    };

    window.addEventListener('mousemove', handleMouseMove, true);
    window.addEventListener('mouseup', handleMouseUp, true);
    cleanupKeyStripDragRef.current = () => {
      window.removeEventListener('mousemove', handleMouseMove, true);
      window.removeEventListener('mouseup', handleMouseUp, true);
    };
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

          <div className="camera-key-strip" data-testid="camera-key-strip">
            <div className="camera-key-strip-track" aria-hidden="true" />
            {visibleKeys.map((key, index) => (
              <button
                key={`${keyframedShot.id}-${index}-${key.time}`}
                type="button"
                className={`camera-key-marker${index === keyIndex ? ' is-selected' : ''}${
                  keyStripDragState?.index === index ? ' is-dragging' : ''
                }`}
                style={{ left: `${(key.time / keyframedShot.duration) * 100}%` }}
                data-testid={`camera-key-marker-${index}`}
                aria-label={`Camera key ${index + 1} at ${key.time.toFixed(2)} seconds`}
                onClick={() => {
                  setKeyIndexState({ shotId: keyframedShot.id, index });
                  onPreviewShot(keyframedShot, key.time);
                }}
                onMouseDown={(event) => startKeyStripDrag(event, index)}
              />
            ))}
          </div>

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
            <NumericScrubInput
              id="camera-key-time"
              label="Time"
              value={draftKey.time}
              min={0}
              max={keyframedShot.duration}
              step={0.1}
              onChange={(value) => {
                const nextKey = { ...draftKey, time: value };
                updateDraftKey({ time: value });
                previewDraftKey(nextKey);
              }}
              onCommit={(value) => commitDraftKey({ ...draftKey, time: value })}
              onCancel={(value) => updateDraftKey({ time: value })}
            />
            <NumericScrubInput
              id="camera-key-fov"
              label="FOV"
              value={draftKey.fov}
              min={1}
              step={1}
              onChange={(value) => {
                const nextKey = { ...draftKey, fov: value };
                updateDraftKey({ fov: value });
                previewDraftKey(nextKey);
              }}
              onCommit={(value) => commitDraftKey({ ...draftKey, fov: value })}
              onCancel={(value) => updateDraftKey({ fov: value })}
            />
          </div>

          <fieldset className="camera-fieldset">
            <legend>Position</legend>
            {(['X', 'Y', 'Z'] as const).map((axis, axisIndex) => (
              <NumericScrubInput
                key={axis}
                id={`camera-position-${axis}`}
                label={axis}
                value={draftPosition?.[axisIndex] ?? 0}
                step={0.1}
                onChange={(value) => {
                  const position = getCameraPointVector(draftKey.position);
                  position[axisIndex] = value;
                  const nextPosition = withCameraPointVector(draftKey.position, position);
                  const nextKey = { ...draftKey, position: nextPosition };
                  updateDraftKey({ position: nextPosition });
                  previewDraftKey(nextKey);
                }}
                onCommit={(value) => {
                  const position = getCameraPointVector(draftKey.position);
                  position[axisIndex] = value;
                  commitDraftKey({
                    ...draftKey,
                    position: withCameraPointVector(draftKey.position, position),
                  });
                }}
                onCancel={(value) => {
                  const position = getCameraPointVector(draftKey.position);
                  position[axisIndex] = value;
                  updateDraftKey({
                    position: withCameraPointVector(draftKey.position, position),
                  });
                }}
              />
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

function getCameraPointVector(point: CameraShotKeyData['position']): [number, number, number] {
  return Array.isArray(point)
    ? [point[0], point[1], point[2]]
    : [point.localPosition[0], point.localPosition[1], point.localPosition[2]];
}

function withCameraPointVector(
  point: CameraShotKeyData['position'],
  vector: [number, number, number],
): CameraShotKeyData['position'] {
  return Array.isArray(point) ? vector : { ...point, localPosition: vector };
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

function getStripTime(clientX: number, rect: DOMRect, duration: number): number {
  const ratio = rect.width <= 0 ? 0 : (clientX - rect.left) / rect.width;
  const unclampedTime = clampTime(ratio * duration, duration);

  return Math.round(unclampedTime / 0.05) * 0.05;
}
