import type { AssetManifestData } from '../../schemas/asset.schema';

export interface AssetPanelProps {
  assets: AssetManifestData | null;
}

export function AssetPanel({ assets }: AssetPanelProps) {
  const entries = assets
    ? Object.entries(assets.assets).sort(([leftId], [rightId]) => leftId.localeCompare(rightId))
    : [];

  return (
    <section aria-labelledby="assets-heading">
      <div className="panel-heading-row">
        <h2 id="assets-heading">Assets</h2>
        <span className="panel-count">
          {assets ? formatCount(entries.length, 'asset') : 'Loading'}
        </span>
      </div>
      <ul className="asset-list" aria-label="Asset manifest">
        {entries.length > 0 ? (
          entries.map(([assetId, asset]) => (
            <li key={assetId}>
              <span className="asset-id">{assetId}</span>
              <small>{asset.url}</small>
              <span className="panel-badge">{asset.type}</span>
            </li>
          ))
        ) : (
          <li className="panel-empty">Loading assets</li>
        )}
      </ul>
    </section>
  );
}

function formatCount(count: number, label: string): string {
  return `${count} ${label}${count === 1 ? '' : 's'}`;
}
