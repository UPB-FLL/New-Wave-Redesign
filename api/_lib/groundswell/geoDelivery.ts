import { getSupabaseAdmin } from '../supabaseAdmin.js';
import { storeAsset, type AssetRow } from './assetStore.js';
import { buildGeoBrief } from '../../../packages/groundswell/src/aiSearch.js';
import type { BusinessProfile } from './businessProfile.js';
import { isAiSearchOutput, type AiSearchOutput } from './currents/aiSearch.js';
import type { MapsOutput } from './currents/maps.js';
import { fileName } from './delivery.js';
import { formatDate, preparerFor } from './reports.js';
import type { StepContext } from './types.js';

/**
 * deliver_geo: the developer brief (phase 1). A Markdown file a
 * developer or an agent applies to the business's site: the AI-search
 * baseline this run measured, the improvements it supports, the owner's
 * question list, and the phases and rules of the work. Stored with the run as
 * an export (the workspace's Downloads), beside the Meta and Google files of
 * the later phases. Like every delivery step it is required, but a run whose
 * ai_search step was skipped has nothing to write: the step then finishes
 * with no file and says so, and the audit's gaps name the missing brief.
 */

export const GEO_BRIEF_TYPE = 'text/markdown; charset=utf-8';
export const GEO_BRIEF_TITLE = 'GEO Developer Brief';

export interface GeoDelivery {
  /** Null when the run had no AI search reading to write from. */
  file: Pick<AssetRow, 'path' | 'name' | 'content_type' | 'bytes'> | null;
  note: string | null;
}

/** The brief's text for a run, from its ai_search output and the facts around it. */
export function geoBriefFor(ctx: StepContext, out: AiSearchOutput): string {
  const maps = (ctx.outputs.maps as MapsOutput | undefined)?.business ?? null;
  const profile = (ctx.outputs.competitors as { profile?: BusinessProfile } | undefined)?.profile ?? null;
  return buildGeoBrief({
    business: { name: ctx.audit.business_name, city: ctx.audit.city, website: out.website ?? ctx.audit.website },
    date: formatDate(new Date(out.fetched_at)),
    evidence: out,
    improvements: out.improvements,
    questions: out.questions,
    profiles: out.profiles,
    listing: maps ? { name: maps.name, address: maps.address, phone: maps.phone, hours: maps.hours.length ? maps.hours.join('; ') : null, rating: maps.rating, reviews: maps.reviews, url: maps.url } : null,
    profile: profile ? { category: profile.category, services: profile.services } : null,
    preparer: preparerFor(ctx.audit.branding).name,
  });
}

export async function runDeliverGeo(ctx: StepContext): Promise<GeoDelivery> {
  const out = ctx.outputs.ai_search;
  if (!isAiSearchOutput(out)) return { file: null, note: 'The AI search step left no reading, so no developer brief was written.' };
  const name = fileName(ctx, GEO_BRIEF_TITLE, 'md');
  const row = await storeAsset(getSupabaseAdmin(), { audit_id: ctx.audit.id, kind: 'export', name, content_type: GEO_BRIEF_TYPE, meta: { format: 'geo-brief', improvements: out.improvements.length, questions: out.questions.length } }, new TextEncoder().encode(geoBriefFor(ctx, out)));
  return { file: { path: row.path, name: row.name, content_type: row.content_type, bytes: row.bytes }, note: null };
}
