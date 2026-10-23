import { useState } from 'react';
import { Loader2, RefreshCw } from 'lucide-react';
import type { DiscoveryResult } from '../../lib/groundswellDiscoveryTypes';
import { logoBackground } from '../../lib/groundswellBrandAssets';
import type { BusinessDiscovery } from './useBusinessDiscovery';

function publicLink(raw: string | null | undefined): string | undefined {
  if (!raw) return undefined;
  try {
    const url = new URL(raw);
    return /^https?:$/.test(url.protocol) ? url.href : undefined;
  } catch { return undefined; }
}

export function BusinessDiscoveryStatus({ discovery }: { discovery: BusinessDiscovery }) {
  const result = discovery.result;
  return (
    <div className="space-y-2 text-sm">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="gs-muted">We find the business details, brand and suggested competitors. Review anything we find before queuing.</p>
        <button type="button" className="gs-link inline-flex min-h-11 items-center gap-1.5" disabled={!discovery.canDiscover || discovery.loading} onClick={() => void discovery.refresh()}>
          {discovery.loading ? <Loader2 size={14} className="animate-spin" aria-hidden="true" /> : <RefreshCw size={14} aria-hidden="true" />}
          {discovery.error ? 'Retry lookup' : 'Refresh business details'}
        </button>
      </div>
      {discovery.pending || discovery.loading ? <p role="status" className="gs-notice">{discovery.loading ? 'Looking up business details, brand and competitors…' : 'Business lookup starts when you finish typing…'}</p> : null}
      {discovery.error ? <p role="alert" className="gs-alert">{discovery.error} You can enter the details below and continue.</p> : null}
      {result ? (
        <div className="gs-notice space-y-2">
          <p role="status">Business lookup finished. Review the details below; every field is editable.</p>
          {result.business.category ? <p className="gs-muted">Business category: {result.business.category}</p> : null}
          {result.sources.length ? <ul className="space-y-1" aria-label="Business lookup sources">{result.sources.map((source, i) => (
            <li key={`${source.name}-${i}`}>
              {publicLink(source.url) ? <a className="gs-link" href={publicLink(source.url)} target="_blank" rel="noreferrer">{source.name}</a> : source.name}
              {': '}{source.status === 'ok' ? 'read' : source.status === 'not_found' ? 'not found' : 'unavailable'}{source.detail ? ` · ${source.detail}` : ''}
            </li>
          ))}</ul> : null}
          {result.warnings.length ? <ul className="space-y-1 gs-muted" aria-label="Business lookup notes">{result.warnings.map((warning, i) => <li key={i}>{warning}</li>)}</ul> : null}
        </div>
      ) : null}
    </div>
  );
}

export function CompetitorDiscoverySource({ result, competitor }: { result: DiscoveryResult | null; competitor: { name: string; website: string; instagram: string; facebook?: string } }) {
  const suggestion = result?.competitors.find((c) => (c.website && c.website === competitor.website) || (c.instagram && c.instagram === competitor.instagram) || (c.facebook && c.facebook === competitor.facebook) || c.name.toLowerCase() === competitor.name.toLowerCase());
  if (!suggestion) return null;
  const url = publicLink(suggestion.source_url || suggestion.website || suggestion.facebook);
  return <p className="text-xs gs-muted">Suggested match{suggestion.reason ? ` · ${suggestion.reason}` : ''}{url ? <> · <a className="gs-link" href={url} target="_blank" rel="noreferrer">View source for {suggestion.name}</a></> : null}</p>;
}

export function BusinessBrandPreview({ name, logo, color, colors = [], onColor }: { name: string; logo?: string; color?: string; colors?: string[]; onColor: (value: string) => void }) {
  const palette = [...new Set([color, ...colors])].filter((value): value is string => Boolean(value && /^#[\da-f]{3}(?:[\da-f]{3})?$/i.test(value)));
  const image = publicLink(logo);
  const [failedImage, setFailedImage] = useState<string | null>(null);
  return (
    <div className="flex flex-wrap items-center gap-3 rounded-xl border p-3" style={{ borderColor: 'var(--nw-mist-gray)' }} aria-label="Business brand preview">
      {image && image !== failedImage ? <img src={image} alt={`${name || 'Business'} logo preview`} className="h-12 w-20 rounded object-contain p-1" style={{ backgroundColor: logoBackground(image) }} referrerPolicy="no-referrer" onError={() => setFailedImage(image)} /> : <span className="text-xs gs-muted">{image ? 'Logo preview unavailable' : 'Logo not found yet'}</span>}
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold">{name || 'Business brand'}</p>
        <p className="text-xs gs-muted">Logo and main colour will carry into the reports.</p>
      </div>
      {palette.length ? <div className="flex flex-wrap gap-2" aria-label="Detected brand colours">{palette.map((value) => (
        <button key={value} type="button" title={`Use ${value} as the main colour`} aria-label={`Use ${value} as the main colour`} aria-pressed={color?.toLowerCase() === value.toLowerCase()} className="flex min-h-11 items-center gap-1.5 rounded-lg border px-2 text-xs" style={{ borderColor: color?.toLowerCase() === value.toLowerCase() ? 'var(--gs-accent-deep)' : 'var(--nw-mist-gray)' }} onClick={() => onColor(value)}>
          <span className="h-5 w-5 rounded border" style={{ backgroundColor: value, borderColor: 'rgba(0,0,0,.15)' }} aria-hidden="true" />{value}
        </button>
      ))}</div> : <p className="text-xs gs-muted">You can add a main colour below.</p>}
    </div>
  );
}
