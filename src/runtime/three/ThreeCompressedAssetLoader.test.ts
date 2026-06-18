import { describe, expect, it } from 'vitest';

import { configureCompressedGltfLoader } from './ThreeCompressedAssetLoader';

describe('configureCompressedGltfLoader', () => {
  it('keeps compressed hooks disabled when decoder config is absent', () => {
    const loader = new FakeCompressionCapableGltfLoader();
    const status = configureCompressedGltfLoader(loader);

    expect(status).toEqual({
      draco: 'not-configured',
      meshopt: 'not-configured',
      ktx2: 'not-configured',
      notes: [
        'Draco decoder not configured; uncompressed GLB fallback remains active.',
        'Meshopt decoder not configured; uncompressed GLB fallback remains active.',
        'KTX2 transcoder not configured; ordinary texture loading remains active.',
      ],
    });
    expect(loader.dracoLoader).toBeUndefined();
    expect(loader.meshoptDecoder).toBeUndefined();
    expect(loader.ktx2Loader).toBeUndefined();
  });

  it('configures Draco, Meshopt, and KTX2 hooks when factories are provided', () => {
    const loader = new FakeCompressionCapableGltfLoader();
    const dracoLoader = new FakeDracoLoader();
    const ktx2Loader = new FakeKtx2Loader();
    const renderer = { label: 'renderer' };
    const meshoptDecoder = { supported: true };
    const status = configureCompressedGltfLoader(loader, {
      draco: {
        decoderPath: '/decoders/draco/',
        createLoader: () => dracoLoader,
      },
      meshopt: {
        decoder: meshoptDecoder,
      },
      ktx2: {
        transcoderPath: '/decoders/basis/',
        createLoader: () => ktx2Loader,
        renderer,
      },
    });

    expect(status).toEqual({
      draco: 'configured',
      meshopt: 'configured',
      ktx2: 'configured',
      notes: [],
    });
    expect(dracoLoader.decoderPath).toBe('/decoders/draco/');
    expect(dracoLoader.preloaded).toBe(true);
    expect(loader.dracoLoader).toBe(dracoLoader);
    expect(loader.meshoptDecoder).toBe(meshoptDecoder);
    expect(ktx2Loader.transcoderPath).toBe('/decoders/basis/');
    expect(ktx2Loader.renderer).toBe(renderer);
    expect(loader.ktx2Loader).toBe(ktx2Loader);
  });

  it('reports unsupported hooks without throwing', () => {
    const status = configureCompressedGltfLoader(
      {},
      {
        draco: {
          decoderPath: '/decoders/draco/',
          createLoader: () => new FakeDracoLoader(),
        },
        meshopt: {
          decoder: {},
        },
        ktx2: {
          transcoderPath: '/decoders/basis/',
          createLoader: () => new FakeKtx2Loader(),
        },
      },
    );

    expect(status).toEqual({
      draco: 'unsupported-loader',
      meshopt: 'unsupported-loader',
      ktx2: 'unsupported-loader',
      notes: [
        'GLTFLoader does not expose setDRACOLoader.',
        'GLTFLoader does not expose setMeshoptDecoder.',
        'GLTFLoader does not expose setKTX2Loader.',
      ],
    });
  });
});

class FakeCompressionCapableGltfLoader {
  dracoLoader: unknown;
  meshoptDecoder: unknown;
  ktx2Loader: unknown;

  setDRACOLoader(loader: unknown): void {
    this.dracoLoader = loader;
  }

  setMeshoptDecoder(decoder: unknown): void {
    this.meshoptDecoder = decoder;
  }

  setKTX2Loader(loader: unknown): void {
    this.ktx2Loader = loader;
  }
}

class FakeDracoLoader {
  decoderPath = '';
  preloaded = false;

  setDecoderPath(path: string): void {
    this.decoderPath = path;
  }

  preload(): void {
    this.preloaded = true;
  }
}

class FakeKtx2Loader {
  transcoderPath = '';
  renderer: unknown;

  setTranscoderPath(path: string): void {
    this.transcoderPath = path;
  }

  detectSupport(renderer: unknown): void {
    this.renderer = renderer;
  }
}
