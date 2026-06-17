import { expect, test } from '@playwright/test';
import { inflateSync } from 'node:zlib';

test('editor workflow loads, renders, and supports core timeline controls', async ({ page }) => {
  const browserErrors: string[] = [];

  page.on('console', (message) => {
    if (message.type() === 'error') {
      browserErrors.push(message.text());
    }
  });
  page.on('pageerror', (error) => {
    browserErrors.push(error.message);
  });

  await page.goto('/');
  await expect(page.getByTestId('editor-shell')).toBeVisible();
  await expect(page.getByText('Level loaded')).toBeVisible();
  expect(browserErrors).toEqual([]);

  const canvas = page.locator('canvas.runtime-canvas');
  await expect(canvas).toBeVisible();
  const canvasPixels = inspectPng(await canvas.screenshot());
  expect(canvasPixels.sampledUniqueColors).toBeGreaterThan(8);
  expect(canvasPixels.maxLuma - canvasPixels.minLuma).toBeGreaterThan(20);

  await expect(page.getByTestId('timeline-panel')).toBeVisible();
  await page.locator('#timeline-scrub').evaluate((element) => {
    const input = element as HTMLInputElement;
    input.value = '2.25';
    input.dispatchEvent(new Event('input', { bubbles: true }));
    input.dispatchEvent(new Event('change', { bubbles: true }));
  });
  await expect(page.getByTestId('timeline-playhead')).toHaveAttribute('style', /left:\s*50%/);

  await page.getByRole('button', { name: /track_set_flag/ }).click();
  await expect(page.getByText('Action Marker')).toBeVisible();

  const triggerBounds = page.getByRole('button', { name: 'Trigger Bounds' });
  await expect(triggerBounds).toHaveAttribute('aria-pressed', 'true');
  await triggerBounds.click();
  await expect(triggerBounds).toHaveAttribute('aria-pressed', 'false');
  await triggerBounds.click();
  await expect(triggerBounds).toHaveAttribute('aria-pressed', 'true');
  expect(browserErrors).toEqual([]);
});

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
