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
    key: CameraShotKeyData;
  }>();

  const keyframedShot = selectedShot?.type === 'keyframed' ? selectedShot : undefined;
  const keyIndex =
    keyframedShot && keyIndexState.shotId === keyframedShot.id
      ? Math.min(keyIndexState.index, keyframedShot.keys.length - 1)
      : 0;
  const currentKey = keyframedShot?.keys[keyIndex];
  const draftKey =
    keyframedShot && draftKeyState?.shotId === keyframedShot.id && draftKeyState.index === keyIndex
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
      key: {
        ...draftKey,
        ...patch,
      },
    });
  };

  const applyDraft = () => {
    if (validationResult?.success) {
      onApplyShot(validationResult.data);
    }
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
            <button type="button" onClick={() => onSetKeyFromView(keyframedShot, keyIndex)}>
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
