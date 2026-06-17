import type { Vec3 } from '../runtime/RuntimeTypes';
import type {
  CameraLookAtData,
  CameraPoseData,
  CameraShotData,
  CameraShotKeyData,
} from '../schemas/cameraShot.schema';
import type { Quat } from '../schemas/common.schema';

export interface CameraShotEntityResolver {
  getEntityPosition(entityId: string): Vec3 | undefined;
}

export interface CameraPoseSample {
  position: Vec3;
  rotation?: Quat;
  lookAt?: Vec3;
  fov: number;
  near?: number;
  far?: number;
}

export class CameraShotPlayer {
  constructor(
    private readonly resolver: CameraShotEntityResolver = { getEntityPosition: () => undefined },
  ) {}

  sample(shot: CameraShotData, time: number): CameraPoseSample {
    switch (shot.type) {
      case 'static':
        return this.resolvePose(shot.pose);
      case 'keyframed':
        return this.sampleKeyframedShot(shot.keys, time);
      case 'follow': {
        const target = this.resolver.getEntityPosition(shot.target) ?? [0, 0, 0];
        return {
          position: addVec3(target, shot.offset),
          lookAt: target,
          fov: shot.fov,
        };
      }
      case 'lookAt':
        return {
          position: shot.position,
          lookAt: this.resolveLookAt(shot.target),
          fov: shot.fov,
        };
    }
  }

  private sampleKeyframedShot(keys: readonly CameraShotKeyData[], time: number): CameraPoseSample {
    const sortedKeys = [...keys].sort((left, right) => left.time - right.time);

    if (time <= sortedKeys[0].time) {
      return this.resolvePose(sortedKeys[0]);
    }

    for (let index = 1; index < sortedKeys.length; index += 1) {
      const previous = sortedKeys[index - 1];
      const next = sortedKeys[index];

      if (time <= next.time) {
        return this.interpolateKeys(previous, next, time);
      }
    }

    return this.resolvePose(sortedKeys[sortedKeys.length - 1]);
  }

  private interpolateKeys(
    previous: CameraShotKeyData,
    next: CameraShotKeyData,
    time: number,
  ): CameraPoseSample {
    const span = next.time - previous.time;
    const rawAlpha = span <= 0 ? 1 : (time - previous.time) / span;
    const alpha = applyEase(rawAlpha, next.ease);
    const previousPose = this.resolvePose(previous);
    const nextPose = this.resolvePose(next);

    return {
      position: lerpVec3(previousPose.position, nextPose.position, alpha),
      rotation:
        previousPose.rotation && nextPose.rotation
          ? normalizeQuat(lerpQuat(previousPose.rotation, nextPose.rotation, alpha))
          : (nextPose.rotation ?? previousPose.rotation),
      lookAt:
        previousPose.lookAt && nextPose.lookAt
          ? lerpVec3(previousPose.lookAt, nextPose.lookAt, alpha)
          : (nextPose.lookAt ?? previousPose.lookAt),
      fov: roundSample(previousPose.fov + (nextPose.fov - previousPose.fov) * alpha),
      near: lerpOptionalNumber(previousPose.near, nextPose.near, alpha),
      far: lerpOptionalNumber(previousPose.far, nextPose.far, alpha),
    };
  }

  private resolvePose(pose: CameraPoseData): CameraPoseSample {
    return {
      position: pose.position,
      rotation: pose.rotation,
      lookAt: pose.lookAt ? this.resolveLookAt(pose.lookAt) : undefined,
      fov: pose.fov,
      near: pose.near,
      far: pose.far,
    };
  }

  private resolveLookAt(lookAt: CameraLookAtData): Vec3 {
    if (Array.isArray(lookAt)) {
      return lookAt;
    }

    return this.resolver.getEntityPosition(lookAt) ?? [0, 0, 0];
  }
}

function applyEase(alpha: number, ease: string | undefined): number {
  if (ease === 'easeInCubic') {
    return alpha ** 3;
  }

  if (ease === 'easeOutCubic') {
    return 1 - (1 - alpha) ** 3;
  }

  if (ease === 'easeInOutCubic') {
    return alpha < 0.5 ? 4 * alpha ** 3 : 1 - (-2 * alpha + 2) ** 3 / 2;
  }

  return alpha;
}

function addVec3(left: Vec3, right: Vec3): Vec3 {
  return [
    roundSample(left[0] + right[0]),
    roundSample(left[1] + right[1]),
    roundSample(left[2] + right[2]),
  ];
}

function lerpVec3(left: Vec3, right: Vec3, alpha: number): Vec3 {
  return [
    roundSample(left[0] + (right[0] - left[0]) * alpha),
    roundSample(left[1] + (right[1] - left[1]) * alpha),
    roundSample(left[2] + (right[2] - left[2]) * alpha),
  ];
}

function lerpQuat(left: Quat, right: Quat, alpha: number): Quat {
  return [
    left[0] + (right[0] - left[0]) * alpha,
    left[1] + (right[1] - left[1]) * alpha,
    left[2] + (right[2] - left[2]) * alpha,
    left[3] + (right[3] - left[3]) * alpha,
  ];
}

function normalizeQuat(quat: Quat): Quat {
  const length = Math.hypot(quat[0], quat[1], quat[2], quat[3]);

  if (length === 0) {
    return [0, 0, 0, 1];
  }

  return [
    roundSample(quat[0] / length),
    roundSample(quat[1] / length),
    roundSample(quat[2] / length),
    roundSample(quat[3] / length),
  ];
}

function lerpOptionalNumber(
  left: number | undefined,
  right: number | undefined,
  alpha: number,
): number | undefined {
  if (left === undefined || right === undefined) {
    return right ?? left;
  }

  return roundSample(left + (right - left) * alpha);
}

function roundSample(value: number): number {
  return Math.round(value * 1_000_000) / 1_000_000;
}
