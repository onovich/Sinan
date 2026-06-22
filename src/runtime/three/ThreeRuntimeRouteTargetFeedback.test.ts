import * as THREE from 'three';
import { describe, expect, it, vi } from 'vitest';

import type { RuntimeDeliveryRouteFeedbackState } from '../RuntimeTypes';
import { ThreeDeliveryRouteFeedbackRuntime } from './ThreeDeliveryRouteFeedbackRuntime';
import { ThreeRuntime } from './ThreeRuntime';

describe('ThreeRuntime route target feedback visuals', () => {
  it('renders route and target feedback markers through the public runtime bridge', () => {
    const runtime = new ThreeRuntime();

    runtime.setDeliveryRouteFeedback(createFeedbackState());

    expect(runtime.getDeliveryRouteFeedbackDiagnostics()).toMatchObject({
      activeMarkerCount: 2,
      completedMarkerCount: 0,
      issueCount: 0,
      lowEndSuppressedCount: 0,
      markerCount: 3,
      visibleMarkerCount: 3,
    });
    expect(
      runtime.getDeliveryRouteFeedbackDiagnostics().markers.map((marker) => marker.kind),
    ).toEqual(['accept', 'route', 'target']);
  });

  it('suppresses intermediate route dots on low-end while keeping endpoint targets readable', () => {
    const runtime = new ThreeRuntime();

    runtime.setDeliveryRouteFeedback(createFeedbackState());
    runtime.setStyleQualityProfile('low-end');

    expect(runtime.getDeliveryRouteFeedbackDiagnostics()).toMatchObject({
      lowEndSuppressedCount: 1,
      markerCount: 3,
      visibleMarkerCount: 2,
    });
    expect(
      runtime.getDeliveryRouteFeedbackDiagnostics().markers.map((marker) => marker.kind),
    ).toEqual(['accept', 'target']);
  });

  it('tracks completed state and missing target fallback diagnostics', () => {
    const runtime = new ThreeDeliveryRouteFeedbackRuntime();
    const root = new THREE.Group();

    runtime.setRoot(root);
    runtime.setState({
      ...createFeedbackState(),
      issueCount: 1,
      issues: [
        {
          endpointId: 'delivery.drop',
          jobId: 'job.mail',
          message: 'Delivery job "job.mail" is missing target endpoint "delivery.drop".',
          reason: 'missing_target_endpoint',
        },
      ],
      markerCount: 2,
      markers: createFeedbackState()
        .markers.filter((marker) => marker.kind !== 'target')
        .map((marker) => ({
          ...marker,
          active: false,
          completed: true,
          status: 'completed',
        })),
      status: 'completed',
    });

    expect(runtime.getDiagnostics()).toMatchObject({
      activeMarkerCount: 0,
      completedMarkerCount: 2,
      issueCount: 1,
      markerCount: 2,
      missingTargetCount: 1,
      visibleMarkerCount: 2,
    });
    expect(root.children).toHaveLength(1);
  });

  it('disposes route feedback marker geometry and materials', () => {
    const runtime = new ThreeDeliveryRouteFeedbackRuntime();
    const geometryDispose = vi.spyOn(THREE.BufferGeometry.prototype, 'dispose');
    const materialDispose = vi.spyOn(THREE.Material.prototype, 'dispose');

    try {
      runtime.setRoot(new THREE.Group());
      runtime.setState(createFeedbackState());
      runtime.dispose();

      expect(geometryDispose).toHaveBeenCalled();
      expect(materialDispose).toHaveBeenCalled();
      expect(runtime.getDiagnostics()).toMatchObject({
        markerCount: 0,
        visibleMarkerCount: 0,
      });
    } finally {
      runtime.dispose();
      geometryDispose.mockRestore();
      materialDispose.mockRestore();
    }
  });
});

function createFeedbackState(): RuntimeDeliveryRouteFeedbackState {
  return {
    activeJobId: 'job.mail',
    issueCount: 0,
    issues: [],
    jobId: 'job.mail',
    markerCount: 3,
    markers: [
      {
        active: false,
        completed: false,
        endpointId: 'delivery.pickup',
        entityId: 'pickup',
        fallbackUsed: false,
        id: 'job.mail:route-feedback:0:accept',
        jobId: 'job.mail',
        kind: 'accept',
        label: 'Pickup',
        normal: [0, 1, 0],
        position: [0, 0, 0],
        status: 'inactive',
        target: false,
        visible: true,
      },
      {
        active: true,
        completed: false,
        fallbackUsed: false,
        id: 'job.mail:route-feedback:1:route',
        jobId: 'job.mail',
        kind: 'route',
        label: 'Path',
        normal: [0, 1, 0],
        position: [0.5, 0, 0.5],
        regionId: 'city',
        status: 'active',
        target: false,
        visible: true,
      },
      {
        active: true,
        completed: false,
        endpointId: 'delivery.drop',
        entityId: 'drop',
        fallbackUsed: false,
        id: 'job.mail:route-feedback:2:target',
        jobId: 'job.mail',
        kind: 'target',
        label: 'Drop',
        normal: [0, 1, 0],
        position: [1, 0, 1],
        status: 'active',
        target: true,
        visible: true,
      },
    ],
    sequence: 2,
    status: 'inProgress',
  };
}
