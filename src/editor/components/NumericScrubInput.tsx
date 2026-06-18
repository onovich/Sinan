import { useEffect, useRef, useState, type PointerEvent } from 'react';

export interface NumericScrubInputProps {
  id: string;
  name?: string;
  label: string;
  value: number;
  step?: number;
  min?: number;
  max?: number;
  onChange: (value: number) => void;
  onCommit?: (value: number) => void;
  onCancel?: (value: number) => void;
}

interface ScrubState {
  pointerId: number;
  startX: number;
  startValue: number;
  lastValue: number;
  active: boolean;
}

const scrubThresholdPx = 3;

export function NumericScrubInput({
  id,
  name,
  label,
  value,
  step = 0.01,
  min,
  max,
  onChange,
  onCommit,
  onCancel,
}: NumericScrubInputProps) {
  const [text, setText] = useState(formatNumberInput(value));
  const [isScrubbing, setIsScrubbing] = useState(false);
  const scrubRef = useRef<ScrubState | undefined>(undefined);
  const scrubKeyHandlerRef = useRef<
    | {
        handleKey: (event: KeyboardEvent) => void;
      }
    | undefined
  >(undefined);

  useEffect(() => {
    if (!scrubRef.current?.active) {
      setText(formatNumberInput(value));
    }
  }, [value]);

  useEffect(
    () => () => {
      const handler = scrubKeyHandlerRef.current?.handleKey;

      if (handler) {
        removeKeyboardListeners(handler);
      }
    },
    [],
  );

  const commitText = () => {
    const parsed = Number(text);

    if (!Number.isFinite(parsed)) {
      setText(formatNumberInput(value));
      return;
    }

    const nextValue = clampNumber(parsed, min, max);
    onChange(nextValue);
    onCommit?.(nextValue);
    setText(formatNumberInput(nextValue));
  };

  const cancelEdit = () => {
    const original = scrubRef.current?.startValue ?? value;

    scrubRef.current = undefined;
    setIsScrubbing(false);
    removeScrubKeyHandler();
    onChange(original);
    onCancel?.(original);
    setText(formatNumberInput(original));
  };

  const startScrub = (event: PointerEvent<HTMLElement>) => {
    if (event.button !== 0) {
      return;
    }

    scrubRef.current = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startValue: value,
      lastValue: value,
      active: false,
    };
    installScrubKeyHandler();
    event.currentTarget.setPointerCapture(event.pointerId);
  };

  const updateScrub = (event: PointerEvent<HTMLElement>) => {
    const scrub = scrubRef.current;

    if (!scrub || scrub.pointerId !== event.pointerId) {
      return;
    }

    const deltaX = event.clientX - scrub.startX;

    if (!scrub.active && Math.abs(deltaX) < scrubThresholdPx) {
      return;
    }

    if (!scrub.active) {
      setIsScrubbing(true);
    }
    scrub.active = true;
    event.preventDefault();
    const multiplier = event.shiftKey ? 10 : event.altKey ? 0.1 : 1;
    const nextValue = clampNumber(scrub.startValue + deltaX * step * multiplier, min, max);
    const snappedValue = event.ctrlKey ? snapNumber(nextValue, step) : nextValue;

    scrub.lastValue = snappedValue;
    setText(formatNumberInput(snappedValue));
    onChange(snappedValue);
  };

  const finishScrub = (event: PointerEvent<HTMLElement>) => {
    const scrub = scrubRef.current;

    if (!scrub || scrub.pointerId !== event.pointerId) {
      return;
    }

    scrubRef.current = undefined;
    setIsScrubbing(false);
    removeScrubKeyHandler();

    if (scrub.active) {
      event.preventDefault();
      onCommit?.(scrub.lastValue);
    }
  };

  function installScrubKeyHandler(): void {
    removeScrubKeyHandler();
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        cancelEdit();
        event.preventDefault();
      }
    };

    scrubKeyHandlerRef.current = { handleKey: handleKeyDown };
    addKeyboardListeners(handleKeyDown);
  }

  function removeScrubKeyHandler(): void {
    const handler = scrubKeyHandlerRef.current?.handleKey;

    if (handler) {
      removeKeyboardListeners(handler);
      scrubKeyHandlerRef.current = undefined;
    }
  }

  return (
    <label
      className="numeric-scrub field-stack"
      htmlFor={id}
      data-scrubbing={isScrubbing ? 'true' : 'false'}
      onPointerDown={startScrub}
      onPointerMove={updateScrub}
      onPointerUp={finishScrub}
      onPointerCancel={cancelEdit}
    >
      <span className="numeric-scrub-label">{label}</span>
      <input
        id={id}
        name={name}
        type="text"
        inputMode="decimal"
        value={text}
        onChange={(event) => {
          setText(event.target.value);
          const nextValue = Number(event.target.value);

          if (Number.isFinite(nextValue)) {
            onChange(clampNumber(nextValue, min, max));
          }
        }}
        onBlur={commitText}
        onKeyDown={(event) => {
          if (event.key === 'Enter') {
            commitText();
            event.currentTarget.blur();
          } else if (event.key === 'Escape') {
            cancelEdit();
            event.currentTarget.blur();
          }
        }}
      />
    </label>
  );
}

function clampNumber(value: number, min: number | undefined, max: number | undefined): number {
  const lowerBounded = min === undefined ? value : Math.max(min, value);

  return max === undefined ? lowerBounded : Math.min(max, lowerBounded);
}

function snapNumber(value: number, step: number): number {
  return Math.round(value / step) * step;
}

function formatNumberInput(value: number): string {
  return Number(value.toFixed(4)).toString();
}

function addKeyboardListeners(handler: (event: KeyboardEvent) => void): void {
  window.addEventListener('keydown', handler, true);
  window.addEventListener('keyup', handler, true);
  document.addEventListener('keydown', handler, true);
  document.addEventListener('keyup', handler, true);
}

function removeKeyboardListeners(handler: (event: KeyboardEvent) => void): void {
  window.removeEventListener('keydown', handler, true);
  window.removeEventListener('keyup', handler, true);
  document.removeEventListener('keydown', handler, true);
  document.removeEventListener('keyup', handler, true);
}
