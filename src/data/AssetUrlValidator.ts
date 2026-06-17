import type { AssetManifestData, AssetType } from '../schemas/asset.schema';
import type { ReferenceValidationIssue } from './ReferenceResolver';

export interface AssetUrlValidationInput {
  assets: AssetManifestData;
  availablePublicUrls?: ReadonlySet<string>;
}

const ALLOWED_EXTENSIONS_BY_TYPE: Partial<Record<AssetType, readonly string[]>> = {
  audio: ['.mp3', '.ogg', '.wav'],
  image: ['.jpg', '.jpeg', '.png', '.webp'],
  model: ['.glb', '.gltf'],
  texture: ['.jpg', '.jpeg', '.png', '.webp'],
};

export function validateAssetUrls(input: AssetUrlValidationInput): ReferenceValidationIssue[] {
  const issues: ReferenceValidationIssue[] = [];

  for (const [assetId, asset] of Object.entries(input.assets.assets)) {
    const path = `data/assets.manifest.json.assets.${assetId}.url`;
    const urlIssue = getAssetUrlIssue(asset.url);

    if (urlIssue) {
      issues.push({
        severity: 'error',
        path,
        message: urlIssue,
      });
      continue;
    }

    const extensionIssue = getAssetExtensionIssue(asset.type, asset.url);
    if (extensionIssue) {
      issues.push({
        severity: 'error',
        path,
        message: extensionIssue,
      });
    }

    if (input.availablePublicUrls && !input.availablePublicUrls.has(asset.url)) {
      issues.push({
        severity: 'error',
        path,
        message: `Missing asset file "public${asset.url}".`,
      });
    }
  }

  return issues;
}

function getAssetUrlIssue(url: string): string | undefined {
  if (!url.startsWith('/')) {
    return `Asset URL "${url}" must be a root-relative public path.`;
  }

  if (url.includes('\\') || url.includes('\0')) {
    return `Asset URL "${url}" contains an invalid path separator.`;
  }

  if (url.split('/').includes('..')) {
    return `Asset URL "${url}" must not contain ".." segments.`;
  }

  if (url.startsWith('//')) {
    return `Asset URL "${url}" must not be protocol-relative.`;
  }

  return undefined;
}

function getAssetExtensionIssue(type: AssetType, url: string): string | undefined {
  const allowedExtensions = ALLOWED_EXTENSIONS_BY_TYPE[type];

  if (!allowedExtensions) {
    return undefined;
  }

  const lowerUrl = url.toLowerCase();

  if (allowedExtensions.some((extension) => lowerUrl.endsWith(extension))) {
    return undefined;
  }

  return `Asset type "${type}" expects one of ${allowedExtensions.join(', ')}.`;
}
