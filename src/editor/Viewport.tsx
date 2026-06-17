import { useEffect, useRef } from 'react';

import type { WebRuntime } from '../runtime/WebRuntime';
import { ThreeRuntime } from '../runtime/three/ThreeRuntime';

export function Viewport() {
  const hostRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const runtimeRef = useRef<WebRuntime | null>(null);

  useEffect(() => {
    const host = hostRef.current;
    const canvas = canvasRef.current;

    if (!host || !canvas) {
      return undefined;
    }

    const runtime = new ThreeRuntime();
    runtimeRef.current = runtime;

    const readSize = () => {
      const rect = host.getBoundingClientRect();

      return {
        width: Math.max(1, rect.width),
        height: Math.max(1, rect.height),
        pixelRatio: window.devicePixelRatio,
      };
    };

    runtime.init({ canvas, ...readSize() });

    const resizeObserver = new ResizeObserver(() => {
      runtime.resize(readSize());
    });
    resizeObserver.observe(host);

    let frameId = 0;
    let lastTime = performance.now();
    let disposed = false;

    const frame = (now: number) => {
      if (disposed) {
        return;
      }

      const deltaSeconds = Math.min((now - lastTime) / 1000, 0.05);
      lastTime = now;
      runtime.update(deltaSeconds);
      runtime.render();
      frameId = window.requestAnimationFrame(frame);
    };

    frameId = window.requestAnimationFrame(frame);

    return () => {
      disposed = true;
      window.cancelAnimationFrame(frameId);
      resizeObserver.disconnect();
      runtime.dispose();
      runtimeRef.current = null;
    };
  }, []);

  return (
    <div ref={hostRef} className="viewport-placeholder" data-testid="viewport-placeholder">
      <canvas ref={canvasRef} className="runtime-canvas" aria-label="Runtime viewport" />
      <div className="viewport-status">
        <strong>Editor Viewport</strong>
        <span>Three runtime online</span>
      </div>
    </div>
  );
}
