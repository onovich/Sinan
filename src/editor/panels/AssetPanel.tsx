import { useState, type DragEvent } from 'react';

import type { AssetManifestData } from '../../schemas/asset.schema';

export interface AssetPanelProps {
  assets: AssetManifestData | null;
  selectedAssetId: string | undefined;
  onSelectAsset: (assetId: string) => void;
}

export function AssetPanel({ assets, selectedAssetId, onSelectAsset }: AssetPanelProps) {
  const [query, setQuery] = useState('');
  const entries = assets
    ? Object.entries(assets.assets).sort(([leftId], [rightId]) => leftId.localeCompare(rightId))
    : [];
  const normalizedQuery = query.trim().toLowerCase();
  const filteredEntries = entries.filter(([assetId, asset]) => {
    if (!normalizedQuery) {
      return true;
    }

    return (
      assetId.toLowerCase().includes(normalizedQuery) ||
      asset.type.toLowerCase().includes(normalizedQuery) ||
      asset.url.toLowerCase().includes(normalizedQuery)
    );
  });
  const groupedEntries = groupAssetsByType(filteredEntries);
  const selectedAsset = selectedAssetId && assets ? assets.assets[selectedAssetId] : undefined;

  return (
    <section aria-labelledby="assets-heading">
      <div className="panel-heading-row">
        <h2 id="assets-heading">Assets</h2>
        <span className="panel-count">
          {assets ? formatCount(entries.length, 'asset') : 'Loading'}
        </span>
      </div>
      <label className="asset-search" htmlFor="asset-search">
        <span>Search assets</span>
        <input
          id="asset-search"
          type="search"
          value={query}
          placeholder="Filter by id, type, or path"
          onChange={(event) => setQuery(event.target.value)}
        />
      </label>
      <ul className="asset-list" aria-label="Asset manifest">
        {filteredEntries.length > 0 ? (
          groupedEntries.flatMap(([type, items]) => [
            <li key={`${type}-heading`} className="asset-group-heading">
              {type}
            </li>,
            ...items.map(([assetId, asset]) => (
              <li key={assetId}>
                <button
                  type="button"
                  className={`${assetId === selectedAssetId ? 'is-selected' : ''}${
                    asset.type === 'audio' ? ' is-draggable' : ''
                  }`.trim()}
                  aria-pressed={assetId === selectedAssetId}
                  draggable={asset.type === 'audio'}
                  onClick={() => onSelectAsset(assetId)}
                  onDragStart={(event) => {
                    onSelectAsset(assetId);
                    handleAssetDragStart(event, assetId, asset.type);
                  }}
                >
                  <span className="asset-id">{assetId}</span>
                  <small>{asset.url}</small>
                  <span className="panel-badge">{asset.type}</span>
                </button>
              </li>
            )),
          ])
        ) : (
          <li className="panel-empty">{assets ? 'No matching assets' : 'Loading assets'}</li>
        )}
      </ul>
      {selectedAssetId && selectedAsset ? (
        <dl className="asset-detail" aria-label="Selected asset metadata">
          <div>
            <dt>Selected</dt>
            <dd>{selectedAssetId}</dd>
          </div>
          <div>
            <dt>Type</dt>
            <dd>{selectedAsset.type}</dd>
          </div>
          <div>
            <dt>URL</dt>
            <dd>{selectedAsset.url}</dd>
          </div>
        </dl>
      ) : null}
    </section>
  );
}

function handleAssetDragStart(
  event: DragEvent<HTMLButtonElement>,
  assetId: string,
  assetType: string,
): void {
  if (assetType !== 'audio') {
    event.preventDefault();
    return;
  }

  event.dataTransfer.effectAllowed = 'copy';
  event.dataTransfer.setData('application/x-sinan-asset-id', assetId);
  event.dataTransfer.setData('application/x-sinan-asset-type', assetType);
}

function formatCount(count: number, label: string): string {
  return `${count} ${label}${count === 1 ? '' : 's'}`;
}

function groupAssetsByType(
  entries: Array<[string, AssetManifestData['assets'][string]]>,
): Array<[string, Array<[string, AssetManifestData['assets'][string]]>]> {
  const groups = new Map<string, Array<[string, AssetManifestData['assets'][string]]>>();

  for (const entry of entries) {
    const [, asset] = entry;
    const group = groups.get(asset.type) ?? [];
    group.push(entry);
    groups.set(asset.type, group);
  }

  return [...groups.entries()].sort(([left], [right]) => left.localeCompare(right));
}
