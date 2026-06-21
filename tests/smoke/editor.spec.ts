import { expect, test, type APIRequestContext, type Locator, type Page } from '@playwright/test';
import { readFile, writeFile } from 'node:fs/promises';
import { inflateSync } from 'node:zlib';
import { PerspectiveCamera, Vector3 } from 'three';

test.describe.configure({ mode: 'serial' });

test('design review mode loads a deterministic reference state', async ({ page }) => {
  const browserErrors = collectBrowserErrors(page);

  await page.goto('/?designReview=1');
  await expect(page.getByTestId('editor-shell')).toBeVisible();
  await expect(page.getByTestId('editor-shell')).toHaveAttribute('data-mode', 'edit');
  await expect(page.getByRole('button', { name: 'Move', exact: true })).toHaveAttribute(
    'aria-pressed',
    'true',
  );
  await expect(page.getByRole('tab', { name: 'Inspector' })).toHaveAttribute(
    'aria-selected',
    'true',
  );
  await expect(page.locator('.selection-tag')).toContainText('switch_a');
  await expect(page.locator('.telemetry-line')).toContainText('timeline: tl_open_gate @ 2.25s');
  await expect(page.getByTestId('timeline-timecode')).toHaveText('00:02.25');
  await expect(page.getByTestId('timeline-selected-track')).toContainText(
    'TimelinePanel -> DirectorCameraSystem',
  );
  await expect(page.locator('.timeline-meta .status-pill')).toHaveText('Unsaved');
  await expect(page.locator('.asset-list button.is-selected')).toContainText('audio.switch_click');
  await expect(page.locator('.domain-status')).toHaveText(['TL', 'EV', 'CAM']);

  const layout = await page.evaluate(() => ({
    pageScrollHeight: document.documentElement.scrollHeight,
    pageScrollWidth: document.documentElement.scrollWidth,
    viewportHeight: document.documentElement.clientHeight,
    viewportWidth: document.documentElement.clientWidth,
    toolbarHeight: document.querySelector('.editor-topbar')?.getBoundingClientRect().height ?? 0,
    leftRailWidth: document.querySelector('.editor-panel-left')?.getBoundingClientRect().width ?? 0,
    rightRailWidth:
      document.querySelector('.editor-panel-right')?.getBoundingClientRect().width ?? 0,
    sequencerHeight: document.querySelector('.sequencer')?.getBoundingClientRect().height ?? 0,
  }));
  expect(layout.pageScrollHeight).toBeLessThanOrEqual(layout.viewportHeight + 1);
  expect(layout.pageScrollWidth).toBeLessThanOrEqual(layout.viewportWidth + 1);
  expect(layout.toolbarHeight).toBe(40);
  expect(layout.leftRailWidth).toBe(240);
  expect(layout.rightRailWidth).toBe(300);
  expect(layout.sequencerHeight).toBe(220);
  expect(browserErrors).toEqual([]);
});

test('timeline direct manipulation previews during the gesture and commits once', async ({
  page,
}) => {
  const browserErrors = collectBrowserErrors(page);

  await page.goto('/');
  await expect(page.getByTestId('editor-shell')).toBeVisible();
  const timelinePanel = page.getByTestId('timeline-panel');
  const cameraClip = timelinePanel.getByRole('button', { name: /^track_camera_gate_reveal/ });
  await expect(timelinePanel.locator('.timeline-meta .status-pill')).toHaveText('Clean');

  const playheadHandle = page.getByTestId('timeline-playhead-handle');
  const playheadHandleBox = await playheadHandle.boundingBox();
  const rulerBox = await page.getByTestId('timeline-ruler').boundingBox();
  expect(playheadHandleBox).not.toBeNull();
  expect(rulerBox).not.toBeNull();

  if (playheadHandleBox && rulerBox) {
    const y = playheadHandleBox.y + playheadHandleBox.height / 2;

    await page.mouse.move(playheadHandleBox.x + playheadHandleBox.width / 2, y);
    await page.mouse.down();
    await page.mouse.move(rulerBox.x + rulerBox.width * 0.45, y, { steps: 5 });
    await expect(page.getByTestId('timeline-timecode')).toContainText('00:02');
    await page.mouse.up();
  }

  await expect(timelinePanel.locator('.timeline-meta .status-pill')).toHaveText('Clean');

  const clipLeftBefore = await readComputedStyleNumber(cameraClip, 'left');
  const timelineContentBox = await page.locator('.timeline-content').boundingBox();
  const cameraClipBox = await cameraClip.boundingBox();
  expect(timelineContentBox).not.toBeNull();
  expect(cameraClipBox).not.toBeNull();

  if (timelineContentBox && cameraClipBox) {
    const y = cameraClipBox.y + cameraClipBox.height / 2;

    await page.mouse.move(cameraClipBox.x + cameraClipBox.width / 2, y);
    await page.mouse.down();
    await page.mouse.move(cameraClipBox.x + cameraClipBox.width / 2 + 60, y, { steps: 3 });

    await expect
      .poll(() => readComputedStyleNumber(cameraClip, 'left'))
      .toBeGreaterThan(clipLeftBefore);
    await expect(timelinePanel.locator('.timeline-meta .status-pill')).toHaveText('Clean');

    const timelineContentDuringDrag = await page.locator('.timeline-content').boundingBox();
    expect(timelineContentDuringDrag?.x).toBeCloseTo(timelineContentBox.x, 0);
    expect(timelineContentDuringDrag?.y).toBeCloseTo(timelineContentBox.y, 0);
    expect(timelineContentDuringDrag?.width).toBeCloseTo(timelineContentBox.width, 0);
    expect(timelineContentDuringDrag?.height).toBeCloseTo(timelineContentBox.height, 0);

    await page.keyboard.press('Escape');
    await expect.poll(() => readComputedStyleNumber(cameraClip, 'left')).toBe(clipLeftBefore);
    await page.mouse.up();
  }

  await expect(timelinePanel.locator('.timeline-meta .status-pill')).toHaveText('Clean');

  const clipWidthBefore = await readComputedStyleNumber(cameraClip, 'width');
  const cameraResizeHandle = cameraClip.locator('.clip-resize-handle.is-right');
  const resizeHandleBox = await cameraResizeHandle.boundingBox();
  expect(resizeHandleBox).not.toBeNull();

  if (resizeHandleBox) {
    const y = resizeHandleBox.y + resizeHandleBox.height / 2;

    await page.mouse.move(resizeHandleBox.x + resizeHandleBox.width / 2, y);
    await page.mouse.down();
    await page.mouse.move(resizeHandleBox.x + resizeHandleBox.width / 2 - 48, y, { steps: 4 });

    await expect
      .poll(() => readComputedStyleNumber(cameraClip, 'width'))
      .toBeLessThan(clipWidthBefore);
    await expect(timelinePanel.locator('.timeline-meta .status-pill')).toHaveText('Clean');

    await page.mouse.up();
  }

  await expect(timelinePanel.locator('.timeline-meta .status-pill')).toHaveText('Unsaved');
  const clipWidthAfter = await readComputedStyleNumber(cameraClip, 'width');
  await page.getByRole('button', { name: 'Undo' }).click();
  await expect.poll(() => readComputedStyleNumber(cameraClip, 'width')).toBe(clipWidthBefore);
  await page.getByRole('button', { name: 'Redo' }).click();
  await expect.poll(() => readComputedStyleNumber(cameraClip, 'width')).toBe(clipWidthAfter);
  expect(browserErrors).toEqual([]);
});

test('timeline affordances expose cursors, snap, zoom, and auto-scroll', async ({ page }) => {
  const browserErrors = collectBrowserErrors(page);

  await page.goto('/');
  await expect(page.getByTestId('editor-shell')).toBeVisible();
  const timelinePanel = page.getByTestId('timeline-panel');
  const timelineShell = page.getByTestId('timeline-lanes');
  const timelineContent = page.locator('.timeline-content');
  const cameraClip = timelinePanel.getByRole('button', { name: /^track_camera_gate_reveal/ });
  const actionClip = timelinePanel.getByRole('button', { name: /^track_set_flag/ });
  const rightResizeHandle = cameraClip.locator('.clip-resize-handle.is-right');

  await expect(cameraClip).toHaveCSS('cursor', 'grab');
  await expect(rightResizeHandle).toHaveCSS('cursor', 'ew-resize');
  await expect(page.getByTestId('timeline-ruler')).toHaveCSS('cursor', 'ew-resize');
  await expect(page.getByTestId('timeline-playhead-handle')).toHaveCSS('cursor', 'ew-resize');
  await expect(actionClip.locator('.clip-resize-handle')).toHaveCount(0);

  const numericScrub = page.locator('#position-0');
  await expect(numericScrub).toHaveCSS('cursor', 'ew-resize');
  await numericScrub.focus();
  await expect(numericScrub).toHaveCSS('cursor', 'text');
  await numericScrub.blur();

  const initialStart = await readTrackStartFromAria(cameraClip);
  const timelineContentBox = await timelineContent.boundingBox();
  const cameraClipBox = await cameraClip.boundingBox();
  expect(timelineContentBox).not.toBeNull();
  expect(cameraClipBox).not.toBeNull();

  if (timelineContentBox && cameraClipBox) {
    const deltaPixels = (0.13 / 4.5) * (timelineContentBox.width - 120);
    const y = cameraClipBox.y + cameraClipBox.height / 2;

    await page.mouse.move(cameraClipBox.x + cameraClipBox.width / 2, y);
    await page.mouse.down();
    await page.mouse.move(cameraClipBox.x + cameraClipBox.width / 2 + deltaPixels, y, {
      steps: 4,
    });
    await expect(page.getByTestId('timeline-snap-tooltip')).toContainText('Snap');
    await page.mouse.up();
  }

  const snappedStart = await readTrackStartFromAria(cameraClip);
  expect(isNearSnapIncrement(snappedStart, 0.05)).toBe(true);
  await page.getByRole('button', { name: 'Undo' }).click();
  await expect.poll(() => readTrackStartFromAria(cameraClip)).toBe(initialStart);

  const resetClipBox = await cameraClip.boundingBox();
  const resetContentBox = await timelineContent.boundingBox();
  expect(resetClipBox).not.toBeNull();
  expect(resetContentBox).not.toBeNull();

  if (resetClipBox && resetContentBox) {
    const deltaPixels = (0.13 / 4.5) * (resetContentBox.width - 120);
    const y = resetClipBox.y + resetClipBox.height / 2;

    await page.mouse.move(resetClipBox.x + resetClipBox.width / 2, y);
    await page.keyboard.down('Alt');
    await page.mouse.down();
    await page.mouse.move(resetClipBox.x + resetClipBox.width / 2 + deltaPixels, y, {
      steps: 4,
    });
    await expect(page.getByTestId('timeline-snap-tooltip')).toContainText('Free');
    await page.mouse.up();
    await page.keyboard.up('Alt');
  }

  const freeStart = await readTrackStartFromAria(cameraClip);
  expect(isNearSnapIncrement(freeStart, 0.05)).toBe(false);
  await page.getByRole('button', { name: 'Undo' }).click();
  await expect.poll(() => readTrackStartFromAria(cameraClip)).toBe(initialStart);

  const shellBox = await timelineShell.boundingBox();
  expect(shellBox).not.toBeNull();

  if (shellBox) {
    await page.mouse.move(shellBox.x + shellBox.width * 0.4, shellBox.y + shellBox.height / 2);
    await page.keyboard.down('Control');
    const ratioBeforeZoom = await readTimelineCursorRatio(page, 0.4);
    await page.mouse.wheel(0, -900);
    await page.waitForTimeout(80);
    const ratioAfterZoom = await readTimelineCursorRatio(page, 0.4);
    expect(ratioAfterZoom).toBeCloseTo(ratioBeforeZoom, 1);

    for (let index = 0; index < 10; index += 1) {
      await page.mouse.wheel(0, -900);
    }
    await page.keyboard.up('Control');
    await expect
      .poll(() =>
        timelineShell.evaluate((element) => element.scrollWidth > element.clientWidth + 24),
      )
      .toBe(true);
    await timelineShell.evaluate((element) => {
      element.scrollLeft = 0;
    });
    await cameraClip.scrollIntoViewIfNeeded();
    await timelineShell.evaluate((element) => {
      element.scrollLeft = 0;
    });
    const scrollBeforeDrag = await readTimelineScrollLeft(page);
    const zoomedClipBox = await cameraClip.boundingBox();
    const zoomedShellBox = await timelineShell.boundingBox();
    expect(zoomedClipBox).not.toBeNull();
    expect(zoomedShellBox).not.toBeNull();

    if (zoomedClipBox && zoomedShellBox) {
      const y = zoomedClipBox.y + zoomedClipBox.height / 2;
      await page.mouse.move(zoomedClipBox.x + zoomedClipBox.width / 2, y);
      await page.mouse.down();
      await page.mouse.move(zoomedShellBox.x + zoomedShellBox.width - 4, y, { steps: 8 });
      await page.waitForTimeout(120);
      await expect.poll(() => readTimelineScrollLeft(page)).toBeGreaterThan(scrollBeforeDrag);
      await page.keyboard.press('Escape');
      await page.mouse.up();
    }
  }

  const viewport = page.locator('.viewport-placeholder');
  const viewportBox = await viewport.boundingBox();
  expect(viewportBox).not.toBeNull();

  if (viewportBox) {
    await page.mouse.move(
      viewportBox.x + viewportBox.width / 2,
      viewportBox.y + viewportBox.height / 2,
    );
    await page.mouse.down({ button: 'right' });
    await page.mouse.move(
      viewportBox.x + viewportBox.width / 2 + 36,
      viewportBox.y + viewportBox.height / 2 + 18,
      { steps: 3 },
    );
    await expect(viewport).toHaveAttribute('data-nav-mode', 'pan');
    await expect(viewport).toHaveCSS('cursor', 'grabbing');
    await page.mouse.up({ button: 'right' });
  }

  expect(browserErrors).toEqual([]);
});

test('viewport navigation and numeric scrub inputs provide live interaction feedback', async ({
  page,
}) => {
  const browserErrors = collectBrowserErrors(page);

  await page.goto('/');
  await expect(page.getByTestId('editor-shell')).toBeVisible();
  const canvas = page.locator('canvas.runtime-canvas');
  await expect(canvas).toBeVisible();
  const canvasBox = await canvas.boundingBox();
  expect(canvasBox).not.toBeNull();

  if (canvasBox) {
    const center = {
      x: canvasBox.x + canvasBox.width / 2,
      y: canvasBox.y + canvasBox.height / 2,
    };
    const initialCanvas = await canvas.screenshot();

    await page.mouse.move(center.x, center.y);
    await page.mouse.wheel(0, -520);
    await page.waitForTimeout(120);
    const zoomCanvas = await canvas.screenshot();
    expect(sampleAveragePngDelta(initialCanvas, zoomCanvas)).toBeGreaterThan(0.2);

    await page.keyboard.down('Shift');
    await page.mouse.wheel(0, 520);
    await page.keyboard.up('Shift');
    await page.waitForTimeout(120);
    const horizontalPanCanvas = await canvas.screenshot();
    expect(sampleAveragePngDelta(zoomCanvas, horizontalPanCanvas)).toBeGreaterThan(0.2);

    await page.keyboard.down('Control');
    await page.mouse.wheel(0, 520);
    await page.keyboard.up('Control');
    await page.waitForTimeout(120);
    const verticalPanCanvas = await canvas.screenshot();
    expect(sampleAveragePngDelta(horizontalPanCanvas, verticalPanCanvas)).toBeGreaterThan(0.2);

    await page.getByRole('button', { name: /^switch_a/ }).click();
    await expect(page.locator('.selection-tag')).toContainText('switch_a');
    await page.mouse.move(center.x, center.y);
    await page.mouse.down({ button: 'right' });
    await page.mouse.move(center.x + 80, center.y + 30, { steps: 5 });
    await page.mouse.up({ button: 'right' });
    await expect(page.locator('.selection-tag')).toContainText('switch_a');
  }

  const positionX = page.locator('#position-0');
  const positionXBefore = await readInputNumber(positionX);
  const positionXBox = await positionX.boundingBox();
  expect(positionXBox).not.toBeNull();

  if (positionXBox) {
    const y = positionXBox.y + positionXBox.height / 2;

    await page.mouse.move(positionXBox.x + positionXBox.width / 2, y);
    await page.mouse.down();
    await page.mouse.move(positionXBox.x + positionXBox.width / 2 + 40, y, { steps: 4 });
    await expect.poll(() => readInputNumber(positionX)).toBeGreaterThan(positionXBefore);
    await page.keyboard.press('Escape');
    await expect.poll(() => readInputNumber(positionX)).toBe(positionXBefore);
    await page.mouse.up();

    await page.mouse.move(positionXBox.x + positionXBox.width / 2, y);
    await page.mouse.down();
    await page.mouse.move(positionXBox.x + positionXBox.width / 2 + 40, y, { steps: 4 });
    await expect.poll(() => readInputNumber(positionX)).toBeGreaterThan(positionXBefore);
    await page.mouse.up();
  }

  await expect(page.locator('.save-status')).toHaveText('Unsaved');
  await page.getByRole('button', { name: 'Undo' }).click();
  await expect.poll(() => readInputNumber(positionX)).toBe(positionXBefore);
  expect(browserErrors).toEqual([]);
});

test('styled runtime rendering is nonblank and low-end mode changes visible pixels', async ({
  page,
}) => {
  const browserErrors = collectBrowserErrors(page);

  await page.goto('/');
  await expect(page.getByTestId('editor-shell')).toBeVisible();
  const standardCanvas = await captureRuntimeCanvas(page);
  const standardPixels = inspectPng(standardCanvas);
  expect(standardPixels.sampledUniqueColors).toBeGreaterThan(8);
  expect(standardPixels.maxLuma - standardPixels.minLuma).toBeGreaterThan(20);

  await page.getByRole('button', { name: /^switch_a/ }).click();
  await expect(page.locator('.selection-tag')).toContainText('switch_a');
  await page.waitForTimeout(120);
  const selectedCanvas = await page.locator('canvas.runtime-canvas').screenshot();
  expect(sampleAveragePngDelta(standardCanvas, selectedCanvas)).toBeGreaterThan(0.05);

  await page.goto('/?styleQuality=low-end');
  await expect(page.getByTestId('editor-shell')).toBeVisible();
  await page.getByRole('button', { name: /^switch_a/ }).click();
  await expect(page.locator('.selection-tag')).toContainText('switch_a');
  await page.waitForTimeout(120);
  const lowEndCanvas = await captureRuntimeCanvas(page);
  const lowEndPixels = inspectPng(lowEndCanvas);
  expect(lowEndPixels.sampledUniqueColors).toBeGreaterThan(8);
  expect(lowEndPixels.maxLuma - lowEndPixels.minLuma).toBeGreaterThan(20);
  expect(sampleAveragePngDelta(selectedCanvas, lowEndCanvas)).toBeGreaterThan(0.2);
  expect(browserErrors).toEqual([]);
});

test('runtime diagnostics expose LOD and instanced scatter smoke counters', async ({ page }) => {
  const browserErrors = collectBrowserErrors(page);

  await page.goto('/?runtimeDiagnostics=1');
  await expect(page.getByTestId('editor-shell')).toBeVisible();
  await expect(page.locator('.viewport-status')).toContainText('runtime ready');
  await expect
    .poll(() => readRuntimeSmokeSignals(page))
    .toEqual({
      switchLod: {
        entityId: 'switch_a',
        currentLevel: 0,
        currentAsset: 'model.switch_wall.lod0',
      },
      scatter: {
        groupId: 'scatter_switch_markers',
        instanceCount: 6,
        sourceAsset: 'model.switch_wall.lod2',
        fallbackUsed: false,
      },
    });

  await page.goto('/?runtimeDiagnostics=1&styleQuality=low-end');
  await expect(page.getByTestId('editor-shell')).toBeVisible();
  await expect(page.locator('.viewport-status')).toContainText('runtime ready');
  await expect
    .poll(() => readRuntimeSmokeSignals(page))
    .toEqual({
      switchLod: {
        entityId: 'switch_a',
        currentLevel: 1,
        currentAsset: 'model.switch_wall.lod1',
      },
      scatter: {
        groupId: 'scatter_switch_markers',
        instanceCount: 3,
        sourceAsset: 'model.switch_wall.lod2',
        fallbackUsed: false,
      },
    });
  expect(browserErrors).toEqual([]);
});

test('transform gizmo previews inspector and overlay before commit', async ({ page }) => {
  const browserErrors = collectBrowserErrors(page);

  await page.goto('/');
  await expect(page.getByTestId('editor-shell')).toBeVisible();
  await expect(page.locator('.viewport-status')).toContainText('runtime ready');
  await page.getByRole('button', { name: /^switch_a/ }).click();
  await page.getByRole('button', { name: 'Move', exact: true }).click();

  const positionX = page.locator('#position-0');
  const positionXBefore = await readInputNumber(positionX);
  const gizmoPoint = await projectDefaultCameraPointToCanvas(page, [3.2, 1, 4.6]);

  await page.mouse.move(gizmoPoint.x, gizmoPoint.y);
  await page.mouse.down();
  await page.mouse.move(gizmoPoint.x + 90, gizmoPoint.y, { steps: 12 });
  await expect
    .poll(async () => Math.abs((await readInputNumber(positionX)) - positionXBefore))
    .toBeGreaterThan(0.1);

  const previewX = await readInputNumber(positionX);
  await expect(page.locator('.selection-tag')).toContainText(
    `Selected: switch_a [${Number(previewX.toFixed(2))}`,
  );
  await expect(page.locator('.save-status')).toHaveText('Clean');
  await page.mouse.up();

  await expect(page.locator('.save-status')).toHaveText('Unsaved');
  await page.getByRole('button', { name: 'Undo' }).click();
  await expect.poll(() => readInputNumber(positionX)).toBe(positionXBefore);
  await expect(page.locator('.selection-tag')).toContainText(
    `Selected: switch_a [${positionXBefore}`,
  );
  expect(browserErrors).toEqual([]);
});

test('hierarchy reorder is command backed and level dirty only', async ({ page }) => {
  const browserErrors = collectBrowserErrors(page);

  await page.goto('/');
  await expect(page.getByTestId('editor-shell')).toBeVisible();
  await expect(page.locator('.save-status')).toHaveText('Clean');
  await expect(page.locator('.domain-status').nth(0)).toHaveAttribute(
    'aria-label',
    'Timeline save state: Clean',
  );
  await expect(page.locator('.domain-status').nth(1)).toHaveAttribute(
    'aria-label',
    'Event save state: Clean',
  );
  await expect(page.locator('.domain-status').nth(2)).toHaveAttribute(
    'aria-label',
    'Camera save state: Clean',
  );

  await page.getByTestId('hierarchy-row-switch_a').click();
  const positionBefore = await readTransformPosition(page);
  const orderBefore = await readHierarchyOrder(page);
  expect(orderBefore).toEqual([
    'room_blockout_01',
    'player_spawn_01',
    'switch_a',
    'gate_a',
    'trigger_gate_entry',
  ]);

  await page
    .getByTestId('hierarchy-item-switch_a')
    .dragTo(page.getByTestId('hierarchy-item-player_spawn_01'), {
      targetPosition: { x: 12, y: 2 },
    });

  await expect
    .poll(() => readHierarchyOrder(page))
    .toEqual(['room_blockout_01', 'switch_a', 'player_spawn_01', 'gate_a', 'trigger_gate_entry']);
  await expect(page.getByTestId('hierarchy-row-switch_a')).toHaveAttribute('aria-pressed', 'true');
  expect(await readTransformPosition(page)).toEqual(positionBefore);
  await expect(page.locator('.save-status')).toHaveText('Unsaved');
  await expect(page.locator('.domain-status').nth(0)).toHaveAttribute(
    'aria-label',
    'Timeline save state: Clean',
  );
  await expect(page.locator('.domain-status').nth(1)).toHaveAttribute(
    'aria-label',
    'Event save state: Clean',
  );
  await expect(page.locator('.domain-status').nth(2)).toHaveAttribute(
    'aria-label',
    'Camera save state: Clean',
  );

  await page.getByRole('button', { name: 'Undo' }).click();
  await expect.poll(() => readHierarchyOrder(page)).toEqual(orderBefore);
  await expect(page.locator('.save-status')).toHaveText('Clean');
  await page.getByRole('button', { name: 'Redo' }).click();
  await expect
    .poll(() => readHierarchyOrder(page))
    .toEqual(['room_blockout_01', 'switch_a', 'player_spawn_01', 'gate_a', 'trigger_gate_entry']);

  await page.getByTestId('hierarchy-row-switch_a').focus();
  await page.keyboard.press('Control+ArrowDown');
  await expect.poll(() => readHierarchyOrder(page)).toEqual(orderBefore);
  expect(await readTransformPosition(page)).toEqual(positionBefore);
  expect(browserErrors).toEqual([]);
});

test('debug runtime controls affect preview state without dirtying data', async ({ page }) => {
  const browserErrors = collectBrowserErrors(page);

  await page.goto('/');
  await expect(page.getByTestId('editor-shell')).toBeVisible();
  await page.getByRole('tab', { name: 'Event' }).click();
  const eventInspector = page.locator('.event-inspector');
  await eventInspector.locator('#event-inspector-select').selectOption('ev_switch_a_open_gate');
  await expect(page.getByTestId('event-condition-preview')).toContainText('Runtime pass');

  await page.getByRole('tab', { name: 'Debug' }).click();
  const debugPanel = page.locator('.event-debug');
  await expect(debugPanel).toContainText('power_enabled: true');
  await debugPanel.getByRole('button', { name: 'Toggle power_enabled' }).click();
  await expect(debugPanel).toContainText('power_enabled: false');
  await expect(page.locator('.save-status')).toHaveText('Clean');
  await expect(page.locator('.domain-status').nth(0)).toHaveAttribute(
    'aria-label',
    'Timeline save state: Clean',
  );
  await expect(page.locator('.domain-status').nth(1)).toHaveAttribute(
    'aria-label',
    'Event save state: Clean',
  );
  await expect(page.locator('.domain-status').nth(2)).toHaveAttribute(
    'aria-label',
    'Camera save state: Clean',
  );

  await page.getByRole('tab', { name: 'Event' }).click();
  await expect(page.getByTestId('event-condition-preview')).toContainText('Runtime blocked');
  await page.getByRole('tab', { name: 'Debug' }).click();
  await debugPanel.getByRole('button', { name: 'Set Flag' }).click();
  await expect(debugPanel).toContainText('power_enabled: true');
  await page.getByRole('tab', { name: 'Event' }).click();
  await expect(page.getByTestId('event-condition-preview')).toContainText('Runtime pass');

  await page.getByRole('tab', { name: 'Debug' }).click();
  await debugPanel.getByRole('button', { name: 'Fire Selected Event' }).click();
  await expect(debugPanel).toContainText('ev_switch_a_open_gate');
  await expect(page.locator('.save-status')).toHaveText('Clean');
  await debugPanel.getByRole('button', { name: 'Clear Debug' }).click();
  await expect(debugPanel.locator('.inspector-list dd').first()).toHaveText('None');

  await debugPanel.getByRole('button', { name: 'Replay Timeline' }).click();
  await expect(
    page.getByTestId('timeline-panel').getByRole('button', { name: 'Pause' }),
  ).toBeVisible();
  await page.getByTestId('timeline-panel').getByRole('button', { name: 'Stop' }).click();
  await expect(page.locator('.save-status')).toHaveText('Clean');
  expect(browserErrors).toEqual([]);
});

test('audio assets drag to timeline as command-backed sound tracks', async ({ page }) => {
  const browserErrors = collectBrowserErrors(page);

  await page.goto('/');
  await expect(page.getByTestId('editor-shell')).toBeVisible();
  const timelinePanel = page.getByTestId('timeline-panel');
  await expect(timelinePanel.locator('.timeline-meta .status-pill')).toHaveText('Clean');
  const soundTrackCountBefore = await timelinePanel
    .locator('.timeline-track-list > li[data-track-kind="sound"]')
    .count();

  await page.getByLabel('Search assets').fill('audio');
  const audioAsset = page.getByRole('button', { name: /audio.switch_click/ });
  await expect(audioAsset).toBeVisible();
  await audioAsset.dragTo(page.getByTestId('timeline-lanes'), {
    targetPosition: { x: 420, y: 92 },
  });

  await expect
    .poll(() => timelinePanel.locator('.timeline-track-list > li[data-track-kind="sound"]').count())
    .toBe(soundTrackCountBefore + 1);
  await expect(page.locator('.asset-detail')).toContainText('audio.switch_click');
  await expect(timelinePanel.locator('.timeline-meta .status-pill')).toHaveText('Unsaved');
  await expect(page.getByTestId('timeline-selected-track')).toContainText('audio.switch_click');
  await expect(page.locator('.save-status')).toHaveText('Clean');
  await expect(page.locator('.domain-status').nth(0)).toHaveAttribute(
    'aria-label',
    'Timeline save state: Unsaved',
  );
  await expect(page.locator('.domain-status').nth(1)).toHaveAttribute(
    'aria-label',
    'Event save state: Clean',
  );
  await expect(page.locator('.domain-status').nth(2)).toHaveAttribute(
    'aria-label',
    'Camera save state: Clean',
  );
  expect(browserErrors).toEqual([]);
});

test('event action cards support drag reorder before command commit', async ({ page }) => {
  const browserErrors = collectBrowserErrors(page);

  await page.goto('/');
  await expect(page.getByTestId('editor-shell')).toBeVisible();
  await page.getByRole('tab', { name: 'Event' }).click();
  const eventInspector = page.locator('.event-inspector');
  await eventInspector.locator('#event-inspector-select').selectOption('ev_switch_a_open_gate');
  const actionCards = eventInspector.locator('.event-actions .event-list > li');
  await expect(actionCards).toHaveCount(7);
  const initialOrder = await readEventActionOrder(page);
  expect(initialOrder).toEqual([
    'switch.setState',
    'door.open',
    'camera.playShot',
    'entity.animateTransform',
    'flag.set',
    'material.setParameter',
    'timeline.play',
  ]);

  await actionCards.nth(0).scrollIntoViewIfNeeded();
  await actionCards.nth(1).scrollIntoViewIfNeeded();
  const sourceHandle = actionCards.nth(1).locator('.action-drag-handle');
  const sourceHandleBox = await sourceHandle.boundingBox();
  const targetCardBox = await actionCards.nth(0).boundingBox();
  expect(sourceHandleBox).not.toBeNull();
  expect(targetCardBox).not.toBeNull();

  if (sourceHandleBox && targetCardBox) {
    await page.mouse.move(
      sourceHandleBox.x + sourceHandleBox.width / 2,
      sourceHandleBox.y + sourceHandleBox.height / 2,
    );
    await page.mouse.down();
    await page.mouse.move(targetCardBox.x + 12, targetCardBox.y + 2, { steps: 4 });
    await page.mouse.up();
  }

  await expect
    .poll(() => readEventActionOrder(page))
    .toEqual([
      'door.open',
      'switch.setState',
      'camera.playShot',
      'entity.animateTransform',
      'flag.set',
      'material.setParameter',
      'timeline.play',
    ]);
  await expect(eventInspector.locator('.status-pill')).toHaveText('Clean');
  await expect(page.locator('.domain-status').nth(1)).toHaveAttribute(
    'aria-label',
    'Event save state: Clean',
  );

  await eventInspector.getByRole('button', { name: 'Apply' }).click();
  await expect(eventInspector.locator('.status-pill')).toHaveText('Unsaved');
  await expect(page.locator('.save-status')).toHaveText('Clean');
  await expect(page.locator('.domain-status').nth(0)).toHaveAttribute(
    'aria-label',
    'Timeline save state: Clean',
  );
  await expect(page.locator('.domain-status').nth(1)).toHaveAttribute(
    'aria-label',
    'Event save state: Unsaved',
  );
  await expect(page.locator('.domain-status').nth(2)).toHaveAttribute(
    'aria-label',
    'Camera save state: Clean',
  );

  await page.getByRole('button', { name: 'Undo' }).click();
  await expect.poll(() => readEventActionOrder(page)).toEqual(initialOrder);
  await expect(eventInspector.locator('.status-pill')).toHaveText('Clean');
  expect(browserErrors).toEqual([]);
});

test('material inspector edits public parameters and timeline scrub previews dissolve', async ({
  page,
}) => {
  const browserErrors = collectBrowserErrors(page);

  await page.goto('/');
  await expect(page.getByTestId('editor-shell')).toBeVisible();
  const canvas = page.locator('canvas.runtime-canvas');
  await expect(canvas).toBeVisible();
  const initialCanvas = await canvas.screenshot();

  await page.getByRole('button', { name: /^gate_a/ }).click();
  const materialInspector = page.locator('.material-inspector');
  await expect(materialInspector).toContainText('Gate Dissolve');
  await expect(materialInspector).toContainText('story.gate-dissolve');
  await expect(materialInspector).toContainText('Progress');
  const progressForm = materialInspector.locator(
    'form[aria-label="main Progress material parameter"]',
  );
  await expect(progressForm).toContainText('Current 0');
  const progressInput = progressForm.locator('input[name="value"]');
  await expect(progressInput).toHaveValue('0');

  await progressInput.fill('0.5');
  await progressForm.getByRole('button', { name: 'Apply' }).click();
  await expect(page.locator('.save-status')).toHaveText('Unsaved');
  await expect(progressInput).toHaveValue('0.5');
  await expect(materialInspector).not.toContainText('uProgress');
  await expect(materialInspector).not.toContainText('fragmentShader');

  await page.getByRole('button', { name: 'Undo' }).click();
  await expect(page.locator('.save-status')).toHaveText('Clean');
  await expect(progressInput).toHaveValue('0');

  const timelinePanel = page.getByTestId('timeline-panel');
  await timelinePanel.getByRole('button', { name: /^track_gate_dissolve_progress/ }).click();
  await expect(page.getByTestId('timeline-selected-track')).toContainText(
    'TimelinePanel -> MaterialParameterTrackPlayer',
  );
  await page.locator('#timeline-scrub').evaluate((element) => {
    const input = element as HTMLInputElement;
    input.value = '2.25';
    input.dispatchEvent(new Event('input', { bubbles: true }));
    input.dispatchEvent(new Event('change', { bubbles: true }));
  });
  await expect(timelinePanel.locator('.sequencer-controls .status-pill.is-preview')).toContainText(
    'tl_open_gate @ 2.25s',
  );
  await page.waitForTimeout(200);
  expect(sampleAveragePngDelta(initialCanvas, await canvas.screenshot())).toBeGreaterThan(1);
  expect(browserErrors).toEqual([]);
});

test('camera key strip drags keys with live preview and camera-only dirty state', async ({
  page,
}) => {
  const browserErrors = collectBrowserErrors(page);

  await page.goto('/');
  await expect(page.getByTestId('editor-shell')).toBeVisible();
  await page.getByRole('tab', { name: 'Camera' }).click();
  const cameraPanel = page.locator('.camera-shot-panel');
  const marker = page.getByTestId('camera-key-marker-0');
  const markerBox = await marker.boundingBox();
  const keyTime = cameraPanel.locator('#camera-key-time');
  const timeBefore = await readInputNumber(keyTime);
  expect(markerBox).not.toBeNull();
  await expect(cameraPanel.locator('.panel-title-row .status-pill').first()).toHaveText('Clean');

  if (markerBox) {
    const y = markerBox.y + markerBox.height / 2;

    await page.mouse.move(markerBox.x + markerBox.width / 2, y);
    await page.mouse.down();
    await page.mouse.move(markerBox.x + markerBox.width / 2 + 64, y, { steps: 5 });
    await expect.poll(() => readInputNumber(keyTime)).toBeGreaterThan(timeBefore);
    await expect(cameraPanel.locator('.preview-status')).toContainText('cam_gate_reveal @');
    await expect(cameraPanel.locator('.panel-title-row .status-pill').first()).toHaveText('Clean');
    await page.mouse.up();
  }

  await expect(cameraPanel.locator('.panel-title-row .status-pill').first()).toHaveText('Unsaved');
  await expect(page.locator('.save-status')).toHaveText('Clean');
  await expect(page.locator('.domain-status').nth(0)).toHaveAttribute(
    'aria-label',
    'Timeline save state: Clean',
  );
  await expect(page.locator('.domain-status').nth(1)).toHaveAttribute(
    'aria-label',
    'Event save state: Clean',
  );
  await expect(page.locator('.domain-status').nth(2)).toHaveAttribute(
    'aria-label',
    'Camera save state: Unsaved',
  );

  await page.getByRole('button', { name: 'Undo' }).click();
  await expect.poll(() => readInputNumber(keyTime)).toBe(timeBefore);
  await expect(cameraPanel.locator('.panel-title-row .status-pill').first()).toHaveText('Clean');
  expect(browserErrors).toEqual([]);
});

test('editor workflow loads, renders, and supports core timeline controls', async ({ page }) => {
  const browserErrors: string[] = [];
  const modelResponses = new Map<string, number>();

  page.on('console', (message) => {
    if (message.type() === 'error') {
      browserErrors.push(message.text());
    }
  });
  page.on('pageerror', (error) => {
    browserErrors.push(error.message);
  });
  page.on('response', (response) => {
    const url = new URL(response.url());
    if (url.pathname.startsWith('/models/') && url.pathname.endsWith('.glb')) {
      modelResponses.set(url.pathname, response.status());
    }
  });

  await page.goto('/');
  const invalidSave = await page.request.post('/__sinan/save-json', {
    data: {
      path: 'data/events/ev_invalid_smoke.json',
      data: { schemaVersion: 1, id: 'ev_invalid_smoke', actions: [] },
    },
  });
  const invalidSaveBody = await invalidSave.text();
  expect(invalidSave.status()).toBe(400);
  expect(invalidSaveBody).toContain('event validation');
  await expect(page.getByTestId('editor-shell')).toBeVisible();
  await expect(page.locator('.viewport-status')).toContainText('runtime ready');
  await expect(page.locator('.viewport-status')).toContainText('5 entities');
  await expect(page.locator('.domain-status')).toHaveText(['TL', 'EV', 'CAM']);
  const layout = await page.evaluate(() => {
    const shell = document.querySelector('[data-testid="editor-shell"]');
    const timeline = document.querySelector('[data-testid="timeline-panel"]');
    const timelineShell = document.querySelector('.timeline-shell');
    const topbar = document.querySelector('.editor-topbar');
    const lastDomainStatus = document.querySelector('.domain-status:last-of-type');

    return {
      viewportHeight: document.documentElement.clientHeight,
      pageScrollHeight: document.documentElement.scrollHeight,
      shellHeight: shell?.getBoundingClientRect().height ?? 0,
      topbarHeight: topbar?.getBoundingClientRect().height ?? 0,
      topbarRight: topbar?.getBoundingClientRect().right ?? 0,
      lastDomainStatusRight: lastDomainStatus?.getBoundingClientRect().right ?? 0,
      timelineTop: timeline?.getBoundingClientRect().top ?? Number.POSITIVE_INFINITY,
      timelineShellBottom:
        timelineShell?.getBoundingClientRect().bottom ?? Number.POSITIVE_INFINITY,
      timelineShellClientHeight: timelineShell?.clientHeight ?? 0,
      timelineShellScrollHeight: timelineShell?.scrollHeight ?? 0,
    };
  });
  expect(layout.pageScrollHeight).toBeLessThanOrEqual(layout.viewportHeight + 1);
  expect(layout.shellHeight).toBeLessThanOrEqual(layout.viewportHeight + 1);
  expect(layout.topbarHeight).toBeLessThanOrEqual(96);
  expect(layout.lastDomainStatusRight).toBeLessThanOrEqual(layout.topbarRight);
  expect(layout.timelineTop).toBeLessThan(layout.viewportHeight);
  expect(layout.timelineShellBottom).toBeLessThanOrEqual(layout.viewportHeight + 1);
  expect(layout.timelineShellClientHeight).toBeGreaterThan(0);
  expect(layout.timelineShellScrollHeight).toBeGreaterThanOrEqual(layout.timelineShellClientHeight);
  const shell = page.getByTestId('editor-shell');
  const modeNav = page.getByRole('navigation', { name: 'Editor modes' });
  const tools = page.getByRole('group', { name: 'Transform tools' });
  await expect(shell).toHaveAttribute('data-mode', 'edit');
  await expect(modeNav.getByRole('button', { name: 'Edit', exact: true })).toHaveAttribute(
    'aria-pressed',
    'true',
  );
  await modeNav.getByRole('button', { name: 'Preview', exact: true }).click();
  await expect(shell).toHaveAttribute('data-mode', 'preview');
  await expect(tools.getByRole('button', { name: 'Move', exact: true })).toBeDisabled();
  await modeNav.getByRole('button', { name: 'Edit', exact: true }).click();
  await expect(shell).toHaveAttribute('data-mode', 'edit');
  await expect(tools.getByRole('button', { name: 'Move', exact: true })).toBeEnabled();
  await expect(page.locator('.save-status')).toHaveText('Clean');
  await page.getByRole('tab', { name: 'Event' }).click();
  const eventInspector = page.locator('.event-inspector');
  await expect(eventInspector.locator('.status-pill')).toHaveText('Clean');
  await eventInspector.getByLabel('Name').fill('');
  await expect(eventInspector.getByRole('alert')).toContainText('name');
  await expect(eventInspector.locator('.status-pill')).toHaveText('1 issue');
  await eventInspector.getByLabel('Name').fill('Player Enters Gate Trigger');
  await expect(eventInspector.getByRole('alert')).toHaveCount(0);
  await expect(eventInspector.locator('.status-pill')).toHaveText('Clean');
  const conditionRows = eventInspector.locator('.event-conditions .event-list > li');
  await eventInspector.getByRole('button', { name: 'Add Condition' }).click();
  await expect(conditionRows).toHaveCount(1);
  await eventInspector.locator('#event-condition-type').selectOption('inventory.hasItem');
  await eventInspector
    .locator('.event-conditions')
    .getByRole('button', { name: 'Add Condition' })
    .click();
  await expect(conditionRows).toHaveCount(2);
  await expect(conditionRows.nth(1)).toContainText('inventory.hasItem');
  await conditionRows.nth(1).getByRole('button', { name: 'Up' }).click();
  await expect(conditionRows.nth(0)).toContainText('inventory.hasItem');
  await conditionRows.nth(0).getByRole('button', { name: 'Remove' }).click();
  await expect(conditionRows).toHaveCount(1);
  const actionRows = eventInspector.locator('.event-actions .event-list > li');
  await expect(actionRows).toHaveCount(1);
  await eventInspector.locator('#event-action-type').selectOption('flag.toggle');
  await eventInspector.getByRole('button', { name: 'Add Action' }).click();
  await expect(actionRows).toHaveCount(2);
  await expect(actionRows.nth(1)).toContainText('flag.toggle');
  await actionRows.nth(1).getByRole('button', { name: 'Up' }).click();
  await expect(actionRows.nth(0)).toContainText('flag.toggle');
  await actionRows.nth(0).getByRole('button', { name: 'Remove' }).click();
  await expect(actionRows).toHaveCount(1);
  await eventInspector.locator('#event-action-type').selectOption('flag.toggle');
  await eventInspector.getByRole('button', { name: 'Add Action' }).click();
  await eventInspector.getByRole('button', { name: 'Apply' }).click();
  await expect(eventInspector.locator('.status-pill')).toHaveText('Unsaved');
  await expect(conditionRows).toHaveCount(1);
  await expect(actionRows).toHaveCount(2);
  await page.getByRole('button', { name: 'Undo' }).click();
  await expect(conditionRows).toHaveCount(0);
  await expect(actionRows).toHaveCount(1);
  await expect(eventInspector.locator('.status-pill')).toHaveText('Clean');
  await page.getByRole('button', { name: 'Redo' }).click();
  await expect(conditionRows).toHaveCount(1);
  await expect(actionRows).toHaveCount(2);
  await expect(eventInspector.locator('.status-pill')).toHaveText('Unsaved');
  await expect
    .poll(() => Array.from(modelResponses.values()).filter((status) => status === 200).length)
    .toBeGreaterThanOrEqual(4);
  expect(Array.from(modelResponses.values()).every((status) => status === 200)).toBe(true);
  await expect(page.locator('.panel-count').filter({ hasText: '5 entities' })).toBeVisible();
  await expect(page.locator('.panel-count').filter({ hasText: '8 assets' })).toBeVisible();
  await page.getByLabel('Search assets').fill('audio');
  await expect(page.locator('.asset-list button')).toHaveCount(1);
  await expect(page.locator('.asset-list button')).toContainText('audio.switch_click');
  await page.getByLabel('Search assets').fill('');
  await expect(page.getByText('/models/props/switch_wall.glb')).toBeVisible();
  await page.getByRole('button', { name: /^model\.switch_wall\s/ }).click();
  await expect(page.locator('.asset-detail')).toContainText('model.switch_wall');
  await expect(page.getByRole('button', { name: /room_blockout_01/ })).toBeVisible();
  const switchClick = await page.request.get('/audio/switch_click.wav');
  expect(switchClick.ok()).toBe(true);
  expect(browserErrors).toEqual([]);

  const canvas = page.locator('canvas.runtime-canvas');
  await expect(canvas).toBeVisible();
  const initialCanvas = await canvas.screenshot();
  const canvasPixels = inspectPng(initialCanvas);
  expect(canvasPixels.sampledUniqueColors).toBeGreaterThan(8);
  expect(canvasPixels.maxLuma - canvasPixels.minLuma).toBeGreaterThan(20);

  const timelinePanel = page.getByTestId('timeline-panel');
  await expect(timelinePanel).toBeVisible();
  await expect(timelinePanel.locator('.timeline-meta .status-pill')).toHaveText('Clean');
  await expect(timelinePanel.locator('.sequencer-controls .status-pill.is-preview')).toHaveText(
    'Ready to scrub',
  );
  await page.locator('#timeline-scrub').evaluate((element) => {
    const input = element as HTMLInputElement;
    input.value = '2.25';
    input.dispatchEvent(new Event('input', { bubbles: true }));
    input.dispatchEvent(new Event('change', { bubbles: true }));
  });
  await expect(page.getByTestId('timeline-playhead')).toHaveAttribute('style', /left:\s*50%/);
  await expect(timelinePanel.locator('.sequencer-controls .status-pill.is-preview')).toContainText(
    'tl_open_gate @ 2.25s',
  );
  await page.waitForTimeout(200);
  await expect(page.getByTestId('runtime-subtitle')).toContainText('Gate open.');
  expect(sampleAveragePngDelta(initialCanvas, await canvas.screenshot())).toBeGreaterThan(1);

  const rulerBox = await page.getByTestId('timeline-ruler').boundingBox();
  expect(rulerBox).not.toBeNull();
  if (rulerBox) {
    await page.mouse.click(rulerBox.x + rulerBox.width * 0.75, rulerBox.y + 12);
  }
  await expect(page.getByTestId('timeline-timecode')).toContainText('00:03');
  await expect(timelinePanel.locator('.timeline-meta .status-pill')).toHaveText('Clean');

  await timelinePanel.getByRole('button', { name: 'Start' }).click();
  await expect(page.getByTestId('timeline-playhead')).toHaveAttribute('style', /left:\s*0%/);
  const playbackStartCanvas = await canvas.screenshot();
  await timelinePanel.getByRole('button', { name: 'Play', exact: true }).click();
  await expect(timelinePanel.getByRole('button', { name: 'Pause', exact: true })).toBeVisible();
  const sampledPlayheadLefts: number[] = [];

  for (let index = 0; index < 4; index += 1) {
    await page.waitForTimeout(140);
    sampledPlayheadLefts.push(
      await readComputedStyleNumber(page.getByTestId('timeline-playhead'), 'left'),
    );
  }

  expect(sampledPlayheadLefts[1]).toBeGreaterThan(sampledPlayheadLefts[0]);
  expect(sampledPlayheadLefts[2]).toBeGreaterThan(sampledPlayheadLefts[1]);
  expect(sampledPlayheadLefts[3]).toBeGreaterThan(sampledPlayheadLefts[2]);
  await page.waitForTimeout(800);
  await expect(page.getByTestId('runtime-audio-status')).toContainText('audio.switch_click');
  expect(sampleAveragePngDelta(playbackStartCanvas, await canvas.screenshot())).toBeGreaterThan(1);
  await timelinePanel.getByRole('button', { name: 'Stop' }).click();

  const cameraClip = timelinePanel.getByRole('button', { name: /^track_camera_gate_reveal/ });
  const cameraClipLeftBefore = await cameraClip.evaluate(
    (element) => getComputedStyle(element).left,
  );
  const cameraClipBox = await cameraClip.boundingBox();
  expect(cameraClipBox).not.toBeNull();
  if (cameraClipBox) {
    const y = cameraClipBox.y + cameraClipBox.height / 2;

    await page.mouse.move(cameraClipBox.x + cameraClipBox.width / 2, y);
    await page.mouse.down();
    await page.mouse.move(cameraClipBox.x + cameraClipBox.width / 2 + 48, y, { steps: 4 });
    await page.mouse.up();
  }
  await expect(cameraClip).not.toHaveCSS('left', cameraClipLeftBefore);
  await expect(timelinePanel.locator('.timeline-meta .status-pill')).toHaveText('Unsaved');

  const cameraClipWidthBefore = await cameraClip.evaluate(
    (element) => getComputedStyle(element).width,
  );
  const cameraResizeHandle = cameraClip.locator('.clip-resize-handle.is-right');
  const resizeHandleBox = await cameraResizeHandle.boundingBox();
  expect(resizeHandleBox).not.toBeNull();
  if (resizeHandleBox) {
    const y = resizeHandleBox.y + resizeHandleBox.height / 2;

    await page.mouse.move(resizeHandleBox.x + resizeHandleBox.width / 2, y);
    await page.mouse.down();
    await page.mouse.move(resizeHandleBox.x + resizeHandleBox.width / 2 - 42, y, { steps: 4 });
    await page.mouse.up();
  }
  await expect(cameraClip).not.toHaveCSS('width', cameraClipWidthBefore);

  await page.getByRole('button', { name: /track_set_flag/ }).click();
  await expect(page.getByTestId('timeline-selected-track')).toContainText('Action Marker');
  await page.getByRole('button', { name: /track_gate_open_amount/ }).click();
  await expect(timelinePanel.getByRole('heading', { name: 'Keyframe' })).toBeVisible();
  const timelineKeySelect = timelinePanel.locator('#timeline-key-select');
  await expect(timelineKeySelect.locator('option')).toHaveCount(2);
  await timelinePanel.getByRole('button', { name: 'Add Key', exact: true }).click();
  await expect(timelineKeySelect.locator('option')).toHaveCount(3);
  await expect(timelinePanel.locator('.timeline-meta .status-pill')).toHaveText('Unsaved');
  await timelinePanel.getByRole('button', { name: 'Move Up', exact: true }).click();
  await timelinePanel.getByRole('button', { name: 'Remove Key', exact: true }).click();
  await expect(timelineKeySelect.locator('option')).toHaveCount(2);
  await page.getByRole('button', { name: 'Undo' }).click();
  await expect(timelineKeySelect.locator('option')).toHaveCount(3);
  await page.getByRole('button', { name: 'Redo' }).click();
  await expect(timelineKeySelect.locator('option')).toHaveCount(2);

  await page.getByRole('tab', { name: 'Camera' }).click();
  const cameraPanel = page.locator('.camera-shot-panel');
  const cameraKeySelect = cameraPanel.locator('#camera-key-select');
  await expect(cameraKeySelect.locator('option')).toHaveCount(3);
  await cameraPanel.getByRole('button', { name: 'Add Key', exact: true }).click();
  await expect(cameraKeySelect.locator('option')).toHaveCount(4);
  await expect(cameraPanel.locator('.panel-title-row .status-pill').first()).toHaveText('Unsaved');
  await cameraPanel.getByRole('button', { name: 'Move Up', exact: true }).click();
  await cameraPanel.getByRole('button', { name: 'Remove Key', exact: true }).click();
  await expect(cameraKeySelect.locator('option')).toHaveCount(3);
  await page.getByRole('button', { name: 'Undo' }).click();
  await expect(cameraKeySelect.locator('option')).toHaveCount(4);
  await page.getByRole('button', { name: 'Redo' }).click();
  await expect(cameraKeySelect.locator('option')).toHaveCount(3);

  const triggerBounds = page.getByRole('button', { name: 'Trigger Bounds' });
  await expect(triggerBounds).toHaveAttribute('aria-pressed', 'true');
  await triggerBounds.click();
  await expect(triggerBounds).toHaveAttribute('aria-pressed', 'false');
  await triggerBounds.click();
  await expect(triggerBounds).toHaveAttribute('aria-pressed', 'true');

  await page.getByRole('button', { name: /^switch_a/ }).click();
  await expect(page.getByRole('button', { name: /^switch_a/ })).toHaveAttribute(
    'aria-pressed',
    'true',
  );
  await expect(page.getByText('2 components')).toBeVisible();
  const interactableForm = page.locator('form[aria-label="Interactable component editor"]');
  await expect(interactableForm.getByLabel('Prompt')).toHaveValue('Press E');
  await interactableForm.getByLabel('Prompt').fill('Open gate');
  await interactableForm.getByRole('button', { name: 'Apply Component' }).click();
  await expect(page.locator('.save-status')).toHaveText('Unsaved');
  await expect(interactableForm.getByLabel('Prompt')).toHaveValue('Open gate');
  await page.getByRole('button', { name: 'Undo' }).click();
  await expect(interactableForm.getByLabel('Prompt')).toHaveValue('Press E');
  await expect(page.locator('.save-status')).toHaveText('Clean');
  await page.getByRole('button', { name: 'Redo' }).click();
  await expect(interactableForm.getByLabel('Prompt')).toHaveValue('Open gate');
  await expect(page.locator('.save-status')).toHaveText('Unsaved');
  await page.getByRole('button', { name: 'X +', exact: true }).click();
  await expect(page.locator('.save-status')).toHaveText('Unsaved');
  await page.getByRole('button', { name: 'Interact' }).click();
  await page.getByRole('tab', { name: 'Camera' }).click();
  await expect(page.getByText('cam_gate_reveal runtime')).toBeVisible();
  await expect(timelinePanel.getByRole('button', { name: 'Pause', exact: true })).toBeVisible();
  await timelinePanel.getByRole('button', { name: 'Stop' }).click();
  expect(browserErrors).toEqual([]);
});

test('editor save and reload persists authoring changes across data domains', async ({ page }) => {
  const browserErrors = collectBrowserErrors(page);
  const originalLevel = await readSmokeFile('data/levels/level_01.json');
  const originalEvent = await readSmokeFile('data/events/ev_gate_trigger_enter.json');
  const originalTimeline = await readSmokeFile('data/timelines/tl_open_gate.json');
  const originalCameraShot = await readSmokeFile('data/cameraShots/cam_gate_reveal.json');

  try {
    await page.goto('/');
    await expect(page.getByTestId('editor-shell')).toBeVisible();
    await expect(page.locator('.save-status')).toHaveText('Clean');

    await page.getByRole('button', { name: /^switch_a/ }).click();
    const interactableForm = page.locator('form[aria-label="Interactable component editor"]');
    await expect(interactableForm.getByLabel('Prompt')).toHaveValue('Press E');
    await interactableForm.getByLabel('Prompt').fill('Phase 13 save smoke');
    await interactableForm.getByRole('button', { name: 'Apply Component' }).click();
    await expect(page.locator('.save-status')).toHaveText('Unsaved');
    await page.getByRole('button', { name: 'Save', exact: true }).click();
    await expect(page.locator('.save-status')).toHaveText('Saved');

    await page.getByRole('tab', { name: 'Event' }).click();
    const eventInspector = page.locator('.event-inspector');
    await expect(eventInspector.getByLabel('Name')).toHaveValue('Player Enters Gate Trigger');
    await eventInspector.getByLabel('Name').fill('Phase 13 Gate Trigger');
    await eventInspector.getByRole('button', { name: 'Apply' }).click();
    await expect(eventInspector.locator('.status-pill')).toHaveText('Unsaved');
    await eventInspector.getByRole('button', { name: 'Save Event' }).click();
    await expect(eventInspector.locator('.status-pill')).toHaveText('Saved');

    const timelinePanel = page.getByTestId('timeline-panel');
    await page.getByRole('button', { name: /track_gate_open_amount/ }).click();
    const timelineKeySelect = timelinePanel.locator('#timeline-key-select');
    await expect(timelineKeySelect.locator('option')).toHaveCount(2);
    await timelinePanel.getByRole('button', { name: 'Add Key', exact: true }).click();
    await expect(timelineKeySelect.locator('option')).toHaveCount(3);
    await expect(timelinePanel.locator('.timeline-meta .status-pill')).toHaveText('Unsaved');
    await timelinePanel.getByRole('button', { name: 'Save Timeline' }).click();
    await expect(timelinePanel.locator('.timeline-meta .status-pill')).toHaveText('Saved');

    await page.getByRole('tab', { name: 'Camera' }).click();
    const cameraPanel = page.locator('.camera-shot-panel');
    const cameraKeySelect = cameraPanel.locator('#camera-key-select');
    await expect(cameraKeySelect.locator('option')).toHaveCount(3);
    await cameraPanel.getByRole('button', { name: 'Add Key', exact: true }).click();
    await expect(cameraKeySelect.locator('option')).toHaveCount(4);
    await expect(cameraPanel.locator('.panel-title-row .status-pill').first()).toHaveText(
      'Unsaved',
    );
    await cameraPanel.getByRole('button', { name: 'Save Shot' }).click();
    await expect(cameraPanel.locator('.panel-title-row .status-pill').first()).toHaveText('Saved');

    await expect
      .poll(async () =>
        getSwitchPrompt(await readSmokeJson(page.request, 'data/levels/level_01.json')),
      )
      .toBe('Phase 13 save smoke');

    await page.reload();
    await expect(page.getByTestId('editor-shell')).toBeVisible();

    await page.getByRole('button', { name: /^switch_a/ }).click();
    await expect(interactableForm.getByLabel('Prompt')).toHaveValue('Phase 13 save smoke');
    await page.getByRole('tab', { name: 'Event' }).click();
    await expect(eventInspector.getByLabel('Name')).toHaveValue('Phase 13 Gate Trigger');

    await page.getByRole('button', { name: /track_gate_open_amount/ }).click();
    await expect(timelineKeySelect.locator('option')).toHaveCount(3);
    await page.getByRole('tab', { name: 'Camera' }).click();
    await expect(cameraKeySelect.locator('option')).toHaveCount(4);
    await expect(page.locator('.save-status')).toHaveText('Clean');
    expect(browserErrors).toEqual([]);
  } finally {
    await restoreSmokeFile('data/levels/level_01.json', originalLevel);
    await restoreSmokeFile('data/events/ev_gate_trigger_enter.json', originalEvent);
    await restoreSmokeFile('data/timelines/tl_open_gate.json', originalTimeline);
    await restoreSmokeFile('data/cameraShots/cam_gate_reveal.json', originalCameraShot);
  }
});

test('editor shell remains contained and readable on a narrow viewport', async ({ page }) => {
  const browserErrors = collectBrowserErrors(page);

  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/');
  await expect(page.getByTestId('editor-shell')).toBeVisible();
  await expect(page.locator('.save-status')).toHaveText('Clean');
  await expect(page.getByTestId('timeline-panel')).toBeVisible();
  await expect(page.locator('canvas.runtime-canvas')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Edit', exact: true })).toBeVisible();
  await expect(page.locator('.panel-count').filter({ hasText: '5 entities' })).toBeVisible();

  const layout = await page.evaluate(() => {
    const shell = document.querySelector('[data-testid="editor-shell"]');
    const topbarControls = document.querySelector('.topbar-controls');
    const editButton = document.querySelector('.mode-button.mode-edit');
    const viewportRegion = document.querySelector('.viewport-region');
    const canvas = document.querySelector('canvas.runtime-canvas');
    const timelineShell = document.querySelector('.timeline-shell');
    const timelinePanel = document.querySelector('[data-testid="timeline-panel"]');
    const leftPanel = document.querySelector('.editor-panel-left');
    const rightPanel = document.querySelector('.editor-panel-right');
    const rightRailTabs = document.querySelector('.right-rail-tabs');
    const rightRailPanel = document.querySelector('.right-rail-panel');
    const viewportHeight = document.documentElement.clientHeight;
    const topbarControlsRect = topbarControls?.getBoundingClientRect();
    const editRect = editButton?.getBoundingClientRect();
    const viewportRect = viewportRegion?.getBoundingClientRect();
    const canvasRect = canvas?.getBoundingClientRect();
    const timelineShellRect = timelineShell?.getBoundingClientRect();
    const rightPanelRect = rightPanel?.getBoundingClientRect();
    const rightRailTabsRect = rightRailTabs?.getBoundingClientRect();

    return {
      viewportHeight,
      pageScrollHeight: document.documentElement.scrollHeight,
      pageScrollWidth: document.documentElement.scrollWidth,
      viewportWidth: document.documentElement.clientWidth,
      shellHeight: shell?.getBoundingClientRect().height ?? 0,
      editVisibleInToolbar:
        topbarControlsRect && editRect
          ? editRect.left >= topbarControlsRect.left - 1 &&
            editRect.right <= topbarControlsRect.right + 1
          : false,
      canvasContained:
        viewportRect && canvasRect
          ? canvasRect.top >= viewportRect.top - 1 && canvasRect.bottom <= viewportRect.bottom + 1
          : false,
      timelineContained: timelineShellRect ? timelineShellRect.bottom <= viewportHeight + 1 : false,
      timelineHorizontalScroll:
        (timelineShell?.scrollWidth ?? 0) - (timelineShell?.clientWidth ?? 0),
      topbarControlsHorizontalScroll:
        (topbarControls?.scrollWidth ?? 0) - (topbarControls?.clientWidth ?? 0),
      rightRailHorizontalScroll:
        (rightRailPanel?.scrollWidth ?? 0) - (rightRailPanel?.clientWidth ?? 0),
      timelinePanelWidth: timelinePanel?.getBoundingClientRect().width ?? 0,
      leftPanelScrollable: (leftPanel?.scrollHeight ?? 0) > (leftPanel?.clientHeight ?? 0),
      rightRailTabsContained:
        rightPanelRect && rightRailTabsRect
          ? rightRailTabsRect.left >= rightPanelRect.left - 1 &&
            rightRailTabsRect.right <= rightPanelRect.right + 1
          : false,
    };
  });

  expect(layout.pageScrollHeight).toBeLessThanOrEqual(layout.viewportHeight + 1);
  expect(layout.pageScrollWidth).toBeLessThanOrEqual(layout.viewportWidth + 1);
  expect(layout.shellHeight).toBeLessThanOrEqual(layout.viewportHeight + 1);
  expect(layout.editVisibleInToolbar).toBe(true);
  expect(layout.canvasContained).toBe(true);
  expect(layout.timelineContained).toBe(true);
  expect(layout.timelineHorizontalScroll).toBeGreaterThan(0);
  expect(layout.topbarControlsHorizontalScroll).toBeLessThanOrEqual(1);
  expect(layout.rightRailHorizontalScroll).toBeLessThanOrEqual(1);
  expect(layout.timelinePanelWidth).toBeGreaterThan(320);
  expect(layout.leftPanelScrollable).toBe(true);
  expect(layout.rightRailTabsContained).toBe(true);
  expect(browserErrors).toEqual([]);
});

function collectBrowserErrors(page: Page): string[] {
  const browserErrors: string[] = [];

  page.on('console', (message) => {
    if (message.type() === 'error') {
      browserErrors.push(message.text());
    }
  });
  page.on('pageerror', (error) => {
    browserErrors.push(error.message);
  });

  return browserErrors;
}

interface RuntimeSmokeDiagnostics {
  lod: Array<{
    currentAsset: string | undefined;
    currentLevel: number | undefined;
    entityId: string;
  }>;
  scatter: Array<{
    fallbackUsed: boolean;
    groupId: string;
    instanceCount: number;
    sourceAsset: string;
  }>;
}

async function readRuntimeSmokeSignals(page: Page): Promise<{
  scatter: RuntimeSmokeDiagnostics['scatter'][number] | undefined;
  switchLod: RuntimeSmokeDiagnostics['lod'][number] | undefined;
}> {
  const diagnostics = await page.evaluate(() => {
    const runtimeDiagnostics = (
      window as unknown as {
        __SINAN_RUNTIME_DIAGNOSTICS__?: () => RuntimeSmokeDiagnostics;
      }
    ).__SINAN_RUNTIME_DIAGNOSTICS__;

    return runtimeDiagnostics?.();
  });

  return {
    switchLod: diagnostics?.lod.find((item) => item.entityId === 'switch_a'),
    scatter: diagnostics?.scatter.find((item) => item.groupId === 'scatter_switch_markers'),
  };
}

async function readSmokeJson(request: APIRequestContext, path: string): Promise<unknown> {
  const response = await request.get(`/${path}`);
  expect(response.ok()).toBe(true);

  return response.json();
}

async function readComputedStyleNumber(locator: Locator, property: string): Promise<number> {
  return locator.evaluate(
    (element, propertyName) =>
      Number.parseFloat(getComputedStyle(element).getPropertyValue(propertyName)),
    property,
  );
}

async function readInputNumber(locator: Locator): Promise<number> {
  return Number(await locator.inputValue());
}

async function captureRuntimeCanvas(page: Page): Promise<Buffer> {
  await expect(page.locator('.viewport-status')).toContainText('runtime ready');
  const canvas = page.locator('canvas.runtime-canvas');
  await expect(canvas).toBeVisible();
  await page.waitForTimeout(120);

  return canvas.screenshot();
}

async function readTrackStartFromAria(locator: Locator): Promise<number> {
  const label = await locator.getAttribute('aria-label');
  const match = label?.match(/\s([0-9]+(?:\.[0-9]+)?)s(?:\s|$)/);

  if (!match) {
    throw new Error(`Could not parse track timing from ${label ?? 'empty aria-label'}.`);
  }

  return Number(match[1]);
}

function isNearSnapIncrement(value: number, increment: number): boolean {
  return Math.abs(value / increment - Math.round(value / increment)) < 0.001;
}

async function readTimelineScrollLeft(page: Page): Promise<number> {
  return page.getByTestId('timeline-lanes').evaluate((element) => element.scrollLeft);
}

async function readTimelineCursorRatio(page: Page, viewportRatio: number): Promise<number> {
  return page.evaluate((ratio) => {
    const shell = document.querySelector('[data-testid="timeline-lanes"]');
    const content = document.querySelector('.timeline-content');

    if (!(shell instanceof HTMLElement) || !(content instanceof HTMLElement)) {
      return 0;
    }

    return (shell.scrollLeft + shell.clientWidth * ratio) / Math.max(1, content.clientWidth);
  }, viewportRatio);
}

async function projectDefaultCameraPointToCanvas(
  page: Page,
  position: [number, number, number],
): Promise<{ x: number; y: number }> {
  const canvasBox = await page.locator('canvas.runtime-canvas').boundingBox();
  expect(canvasBox).not.toBeNull();

  if (!canvasBox) {
    throw new Error('Expected runtime canvas bounds while projecting a viewport point.');
  }

  const camera = new PerspectiveCamera(64, canvasBox.width / canvasBox.height, 0.1, 1000);
  camera.position.set(4, 2.6, 0.35);
  camera.lookAt(4, 0.1, 6.2);
  camera.updateMatrixWorld();
  camera.updateProjectionMatrix();

  const projected = new Vector3(...position).project(camera);

  return {
    x: canvasBox.x + ((projected.x + 1) / 2) * canvasBox.width,
    y: canvasBox.y + ((-projected.y + 1) / 2) * canvasBox.height,
  };
}

async function readTransformPosition(page: Page): Promise<number[]> {
  return Promise.all([
    readInputNumber(page.locator('#position-0')),
    readInputNumber(page.locator('#position-1')),
    readInputNumber(page.locator('#position-2')),
  ]);
}

async function readHierarchyOrder(page: Page): Promise<string[]> {
  return page.evaluate(() =>
    Array.from(document.querySelectorAll('[data-testid^="hierarchy-row-"]')).map((element) =>
      element.getAttribute('data-testid')?.replace('hierarchy-row-', ''),
    ),
  ) as Promise<string[]>;
}

async function readEventActionOrder(page: Page): Promise<string[]> {
  return page.evaluate(() =>
    Array.from(
      document.querySelectorAll('.event-actions .event-action-card .component-card-header strong'),
    ).map((element) => element.textContent?.replace(/^\d+\.\s*/, '').trim() ?? ''),
  );
}

function readSmokeFile(path: string): Promise<string> {
  return readFile(path, 'utf8');
}

function restoreSmokeFile(path: string, text: string): Promise<void> {
  return writeFile(path, text, 'utf8');
}

function getSwitchPrompt(level: unknown): string | undefined {
  if (!isRecord(level) || !isUnknownArray(level.entities)) {
    return undefined;
  }

  const switchEntity = level.entities.find(
    (entity) => isRecord(entity) && entity.id === 'switch_a',
  );

  if (!isRecord(switchEntity) || !isRecord(switchEntity.components)) {
    return undefined;
  }

  const interactable = switchEntity.components.Interactable;

  return isRecord(interactable) && typeof interactable.prompt === 'string'
    ? interactable.prompt
    : undefined;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isUnknownArray(value: unknown): value is unknown[] {
  return Array.isArray(value);
}

interface PngInspection {
  sampledUniqueColors: number;
  minLuma: number;
  maxLuma: number;
}

function inspectPng(buffer: Buffer): PngInspection {
  const png = parsePng(buffer);
  const colors = new Set<string>();
  let minLuma = 255;
  let maxLuma = 0;

  for (let y = 0; y < png.height; y += 8) {
    for (let x = 0; x < png.width; x += 8) {
      const index = (y * png.width + x) * png.channels;
      const red = png.pixels[index];
      const green = png.pixels[index + 1];
      const blue = png.pixels[index + 2];
      const luma = 0.2126 * red + 0.7152 * green + 0.0722 * blue;

      colors.add(`${red},${green},${blue}`);
      minLuma = Math.min(minLuma, luma);
      maxLuma = Math.max(maxLuma, luma);
    }
  }

  return {
    sampledUniqueColors: colors.size,
    minLuma,
    maxLuma,
  };
}

function sampleAveragePngDelta(leftBuffer: Buffer, rightBuffer: Buffer): number {
  const left = parsePng(leftBuffer);
  const right = parsePng(rightBuffer);

  if (
    left.width !== right.width ||
    left.height !== right.height ||
    left.channels !== right.channels
  ) {
    throw new Error('PNG dimensions differ.');
  }

  let total = 0;
  let samples = 0;

  for (let y = 0; y < left.height; y += 8) {
    for (let x = 0; x < left.width; x += 8) {
      const index = (y * left.width + x) * left.channels;
      total += Math.abs(left.pixels[index] - right.pixels[index]);
      total += Math.abs(left.pixels[index + 1] - right.pixels[index + 1]);
      total += Math.abs(left.pixels[index + 2] - right.pixels[index + 2]);
      samples += 3;
    }
  }

  return total / samples;
}

interface ParsedPng {
  width: number;
  height: number;
  channels: number;
  pixels: Buffer;
}

function parsePng(buffer: Buffer): ParsedPng {
  if (buffer.subarray(0, 8).toString('hex') !== '89504e470d0a1a0a') {
    throw new Error('Expected a PNG screenshot.');
  }

  let offset = 8;
  let width = 0;
  let height = 0;
  let bitDepth = 0;
  let colorType = 0;
  const chunks: Buffer[] = [];

  while (offset < buffer.length) {
    const length = buffer.readUInt32BE(offset);
    const type = buffer.subarray(offset + 4, offset + 8).toString('ascii');
    const data = buffer.subarray(offset + 8, offset + 8 + length);
    offset += 12 + length;

    if (type === 'IHDR') {
      width = data.readUInt32BE(0);
      height = data.readUInt32BE(4);
      bitDepth = data[8];
      colorType = data[9];
    } else if (type === 'IDAT') {
      chunks.push(data);
    } else if (type === 'IEND') {
      break;
    }
  }

  if (bitDepth !== 8 || (colorType !== 2 && colorType !== 6)) {
    throw new Error(`Unsupported PNG format ${bitDepth}/${colorType}.`);
  }

  const channels = colorType === 6 ? 4 : 3;
  const stride = width * channels;
  const raw = inflateSync(Buffer.concat(chunks));
  const pixels = Buffer.alloc(width * height * channels);
  let source = 0;

  for (let y = 0; y < height; y += 1) {
    const filter = raw[source];
    source += 1;
    const rowOffset = y * stride;
    const prevOffset = (y - 1) * stride;

    for (let x = 0; x < stride; x += 1) {
      const left = x >= channels ? pixels[rowOffset + x - channels] : 0;
      const up = y > 0 ? pixels[prevOffset + x] : 0;
      const upLeft = y > 0 && x >= channels ? pixels[prevOffset + x - channels] : 0;
      const value = raw[source];
      source += 1;
      pixels[rowOffset + x] = reconstructPngByte(filter, value, left, up, upLeft);
    }
  }

  return { width, height, channels, pixels };
}

function reconstructPngByte(
  filter: number,
  value: number,
  left: number,
  up: number,
  upLeft: number,
): number {
  switch (filter) {
    case 0:
      return value;
    case 1:
      return (value + left) & 255;
    case 2:
      return (value + up) & 255;
    case 3:
      return (value + Math.floor((left + up) / 2)) & 255;
    case 4:
      return (value + paethPredictor(left, up, upLeft)) & 255;
    default:
      throw new Error(`Unsupported PNG filter ${filter}.`);
  }
}

function paethPredictor(left: number, up: number, upLeft: number): number {
  const estimate = left + up - upLeft;
  const leftDistance = Math.abs(estimate - left);
  const upDistance = Math.abs(estimate - up);
  const upLeftDistance = Math.abs(estimate - upLeft);

  if (leftDistance <= upDistance && leftDistance <= upLeftDistance) {
    return left;
  }

  return upDistance <= upLeftDistance ? up : upLeft;
}
