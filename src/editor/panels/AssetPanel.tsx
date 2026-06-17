import type { AssetManifestData } from '../../schemas/asset.schema';

export interface AssetPanelProps {
  assets: AssetManifestData | null;
}

export function AssetPanel({ assets }: AssetPanelProps) {
  const entries = assets ? Object.entries(assets.assets) : [];

  return (
    <section aria-labelledby="assets-heading">
      <h2 id="assets-heading">Assets</h2>
      <ul className="asset-list">
        {entries.length > 0 ? (
          entries.map(([assetId, asset]) => (
            <li key={assetId}>
              <span>{assetId}</span>
              <small>{asset.type}</small>
            </li>
          ))
        ) : (
          <li className="panel-empty">Loading assets</li>
        )}
      </ul>
    </section>
  );
}
