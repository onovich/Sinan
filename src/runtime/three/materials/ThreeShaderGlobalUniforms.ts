import * as THREE from 'three';

import type { ShaderGlobals } from '../../materials';

export interface ThreeShaderGlobalUniforms {
  uElapsedSeconds: THREE.IUniform<number>;
  uDeltaSeconds: THREE.IUniform<number>;
  uViewportSize: THREE.IUniform<THREE.Vector2>;
  uCameraPosition: THREE.IUniform<THREE.Vector3>;
}

export function createThreeShaderGlobalUniforms(): ThreeShaderGlobalUniforms {
  return {
    uElapsedSeconds: { value: 0 },
    uDeltaSeconds: { value: 0 },
    uViewportSize: { value: new THREE.Vector2(1, 1) },
    uCameraPosition: { value: new THREE.Vector3(0, 0, 0) },
  };
}

export function applyShaderGlobalsToUniforms(
  uniforms: Record<string, THREE.IUniform> | undefined,
  globals: ShaderGlobals,
): void {
  setNumberUniform(uniforms?.uElapsedSeconds, globals.elapsedSeconds);
  setNumberUniform(uniforms?.uDeltaSeconds, globals.deltaSeconds);
  setVector2Uniform(uniforms?.uViewportSize, globals.viewportSize);

  if (globals.cameraPosition) {
    setVector3Uniform(uniforms?.uCameraPosition, globals.cameraPosition);
  }
}

function setNumberUniform(uniform: THREE.IUniform | undefined, value: number): void {
  if (uniform) {
    uniform.value = value;
  }
}

function setVector2Uniform(
  uniform: THREE.IUniform | undefined,
  value: readonly [number, number],
): void {
  if (uniform?.value instanceof THREE.Vector2) {
    uniform.value.set(value[0], value[1]);
  }
}

function setVector3Uniform(
  uniform: THREE.IUniform | undefined,
  value: readonly [number, number, number],
): void {
  if (uniform?.value instanceof THREE.Vector3) {
    uniform.value.set(value[0], value[1], value[2]);
  }
}
