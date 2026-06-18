export type ThreeCompressionHookState = 'configured' | 'not-configured' | 'unsupported-loader';

export interface CompressionCapableGltfLoader {
  setDRACOLoader?: (loader: unknown) => unknown;
  setMeshoptDecoder?: (decoder: unknown) => unknown;
  setKTX2Loader?: (loader: unknown) => unknown;
}

export interface ThreeDracoLoaderAdapter {
  setDecoderPath(path: string): unknown;
  preload?: () => unknown;
}

export interface ThreeKtx2LoaderAdapter {
  setTranscoderPath(path: string): unknown;
  detectSupport?: (renderer: unknown) => unknown;
}

export interface ThreeDracoCompressionConfig {
  decoderPath: string;
  createLoader: () => ThreeDracoLoaderAdapter;
  preload?: boolean;
}

export interface ThreeMeshoptCompressionConfig {
  decoder: unknown;
}

export interface ThreeKtx2CompressionConfig {
  transcoderPath: string;
  createLoader: () => ThreeKtx2LoaderAdapter;
  renderer?: unknown;
}

export interface ThreeGltfCompressionConfig {
  draco?: ThreeDracoCompressionConfig;
  meshopt?: ThreeMeshoptCompressionConfig;
  ktx2?: ThreeKtx2CompressionConfig;
}

export interface ThreeCompressedAssetLoaderStatus {
  draco: ThreeCompressionHookState;
  meshopt: ThreeCompressionHookState;
  ktx2: ThreeCompressionHookState;
  notes: string[];
}

export function configureCompressedGltfLoader(
  loader: CompressionCapableGltfLoader,
  config: ThreeGltfCompressionConfig = {},
): ThreeCompressedAssetLoaderStatus {
  const status: ThreeCompressedAssetLoaderStatus = {
    draco: 'not-configured',
    meshopt: 'not-configured',
    ktx2: 'not-configured',
    notes: [],
  };

  configureDraco(loader, config, status);
  configureMeshopt(loader, config, status);
  configureKtx2(loader, config, status);

  return status;
}

function configureDraco(
  loader: CompressionCapableGltfLoader,
  config: ThreeGltfCompressionConfig,
  status: ThreeCompressedAssetLoaderStatus,
): void {
  if (!config.draco) {
    status.notes.push('Draco decoder not configured; uncompressed GLB fallback remains active.');
    return;
  }

  if (!loader.setDRACOLoader) {
    status.draco = 'unsupported-loader';
    status.notes.push('GLTFLoader does not expose setDRACOLoader.');
    return;
  }

  const dracoLoader = config.draco.createLoader();
  dracoLoader.setDecoderPath(config.draco.decoderPath);
  if (config.draco.preload ?? true) {
    dracoLoader.preload?.();
  }
  loader.setDRACOLoader(dracoLoader);
  status.draco = 'configured';
}

function configureMeshopt(
  loader: CompressionCapableGltfLoader,
  config: ThreeGltfCompressionConfig,
  status: ThreeCompressedAssetLoaderStatus,
): void {
  if (!config.meshopt) {
    status.notes.push('Meshopt decoder not configured; uncompressed GLB fallback remains active.');
    return;
  }

  if (!loader.setMeshoptDecoder) {
    status.meshopt = 'unsupported-loader';
    status.notes.push('GLTFLoader does not expose setMeshoptDecoder.');
    return;
  }

  loader.setMeshoptDecoder(config.meshopt.decoder);
  status.meshopt = 'configured';
}

function configureKtx2(
  loader: CompressionCapableGltfLoader,
  config: ThreeGltfCompressionConfig,
  status: ThreeCompressedAssetLoaderStatus,
): void {
  if (!config.ktx2) {
    status.notes.push('KTX2 transcoder not configured; ordinary texture loading remains active.');
    return;
  }

  if (!loader.setKTX2Loader) {
    status.ktx2 = 'unsupported-loader';
    status.notes.push('GLTFLoader does not expose setKTX2Loader.');
    return;
  }

  const ktx2Loader = config.ktx2.createLoader();
  ktx2Loader.setTranscoderPath(config.ktx2.transcoderPath);
  if (config.ktx2.renderer) {
    ktx2Loader.detectSupport?.(config.ktx2.renderer);
  } else {
    status.notes.push('KTX2 renderer support detection deferred until a renderer is available.');
  }
  loader.setKTX2Loader(ktx2Loader);
  status.ktx2 = 'configured';
}
