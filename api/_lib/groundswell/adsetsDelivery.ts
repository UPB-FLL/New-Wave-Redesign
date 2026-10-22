import { getSupabaseAdmin } from '../supabaseAdmin.js';
import { isAdplanOutput } from './adplan.js';
import { isAdsetsOutput, type AdsetsOutput } from './adsets.js';
import { readAsset, storeAsset, type AssetRow } from './assetStore.js';
import { brandFrom } from './brand.js';
import { withBrowser } from './browser.js';
import { isCreativeOutput } from './creative.js';
import { adImageHtml, dataUri, renderImage, slideHtml } from './creativeRender.js';
import type { SiteScan } from './currents/site.js';
import { fileName, own, printAndStore, type Stored } from './delivery.js';
import { buildXlsx, CSV_TYPE, toCsv, XLSX_TYPE, ZIP_TYPE, zipFiles } from './files.js';
import { buildAdsetsHtml, forecastRows, googleEditorRows, metaBulkRows, metaSetupRows, type CreativeFiles } from './reportsAdsets.js';
import { formatDate, preparerFor } from './reports.js';
import { PermanentStepError, type StepContext } from './types.js';

/**
 * Delivery of the ad sets (phases 2 and 3):
 * - deliver_creatives prints each Meta ad's image (the business's own photo
 *   with the ad's words, 1080 × 1350 JPEG) and the engagement carousel (PNG
 *   slides and caption.txt), and stores them with the run;
 * - deliver_adsets builds the import files (Meta's bulk sheet with the ad-set
 *   settings and the forecast, Google Ads Editor's CSV, the images and the
 *   carousel as zips) and prints the ad-sets PDF.
 */

export interface CreativesOutput {
  /** The ad image each Meta ad carries, by ad name. */
  ads: Record<string, { path: string; name: string }>;
  carousel: { slides: { path: string; name: string }[]; caption: { path: string; name: string } | null };
}

export interface AdsetsDelivery {
  report: Stored;
  exports: Pick<AssetRow, 'path' | 'name' | 'content_type' | 'bytes'>[];
}

function adsetsOf(ctx: StepContext): AdsetsOutput {
  const out = own<AdsetsOutput>(ctx, 'adsets') ?? (ctx.outputs.adsets as AdsetsOutput | undefined);
  if (!isAdsetsOutput(out)) throw new PermanentStepError('There are no ad sets to deliver.');
  return out;
}

const brandOf = (ctx: StepContext) => brandFrom((ctx.outputs.site as { business?: SiteScan | null } | undefined)?.business, ctx.audit.branding);

export async function runDeliverCreatives(ctx: StepContext): Promise<CreativesOutput> {
  const out = adsetsOf(ctx);
  const db = getSupabaseAdmin();
  const brand = brandOf(ctx);
  const handle = (ctx.outputs.social as { business?: { handle?: string } | null } | undefined)?.business?.handle ?? ctx.audit.instagram ?? null;
  const photos = new Map<string, string>();
  const photo = async (path: string | undefined) => {
    if (!path) return null;
    if (!photos.has(path)) {
      const bytes = await readAsset(db, path).catch(() => null);
      if (!bytes) return null;
      photos.set(path, dataUri(bytes, /\.png$/i.test(path) ? 'image/png' : /\.webp$/i.test(path) ? 'image/webp' : 'image/jpeg'));
    }
    return photos.get(path) ?? null;
  };

  const ads: CreativesOutput['ads'] = {};
  const carousel: CreativesOutput['carousel'] = { slides: [], caption: null };
  await withBrowser(async (browser) => {
    for (const set of out.sets.meta) {
      for (const ad of set.ads) {
        const html = adImageHtml(brand, { headline: ad.image_headline || ad.headline, handle, photo: await photo(ad.image?.path) });
        const name = `${out.code}_${ad.name}.jpg`;
        const row = await storeAsset(db, { audit_id: ctx.audit.id, kind: 'creative', name, content_type: 'image/jpeg', meta: { ad: ad.name, set: set.name, from: ad.image?.path ?? null } }, await renderImage(browser, html, 'jpeg'));
        ads[ad.name] = { path: row.path, name };
      }
    }
    const c = out.sets.carousel;
    if (c && c.slides.length) {
      const first = isCreativeOutput(ctx.outputs.creative) ? ctx.outputs.creative.images[0]?.path : undefined;
      const total = c.slides.length;
      for (const [i, slide] of c.slides.entries()) {
        const html = slideHtml(brand, { kicker: c.title, headline: slide.headline, body: slide.body, business: ctx.audit.business_name, index: i + 1, total, photo: i === 0 ? await photo(first) : null });
        const name = `${out.code.toLowerCase()}_carousel_${String(i + 1).padStart(2, '0')}.png`;
        const row = await storeAsset(db, { audit_id: ctx.audit.id, kind: 'carousel', name, content_type: 'image/png', meta: { slide: i + 1 } }, await renderImage(browser, html, 'png'));
        carousel.slides.push({ path: row.path, name });
      }
      if (c.caption) {
        const row = await storeAsset(db, { audit_id: ctx.audit.id, kind: 'carousel', name: 'caption.txt', content_type: 'text/plain', meta: {} }, new TextEncoder().encode(c.caption));
        carousel.caption = { path: row.path, name: 'caption.txt' };
      }
    }
  });
  return { ads, carousel };
}

export async function runDeliverAdsets(ctx: StepContext): Promise<AdsetsDelivery> {
  const out = adsetsOf(ctx);
  const creatives = own<CreativesOutput>(ctx, 'deliver_creatives') ?? { ads: {}, carousel: { slides: [], caption: null } };
  const db = getSupabaseAdmin();
  const read = async (path: string) => readAsset(db, path).catch(() => null);

  const files: CreativeFiles = {};
  const images: Record<string, string> = {};
  const imageEntries: { name: string; data: Uint8Array }[] = [];
  for (const [ad, ref] of Object.entries(creatives.ads)) {
    const bytes = await read(ref.path);
    if (!bytes) continue;
    files[ad] = { file: ref.name };
    images[ad] = dataUri(bytes, 'image/jpeg');
    imageEntries.push({ name: ref.name, data: bytes });
  }
  const slides: string[] = [];
  const carouselEntries: { name: string; data: Uint8Array | string }[] = [];
  for (const s of creatives.carousel.slides) {
    const bytes = await read(s.path);
    if (!bytes) continue;
    slides.push(dataUri(bytes, 'image/png'));
    carouselEntries.push({ name: s.name, data: bytes });
  }
  const caption = out.sets.carousel?.caption ?? null;
  if (caption) carouselEntries.push({ name: 'caption.txt', data: caption });

  const exports: AdsetsDelivery['exports'] = [];
  const put = async (name: string, content_type: string, bytes: Uint8Array, meta: Record<string, unknown>) => {
    const row = await storeAsset(db, { audit_id: ctx.audit.id, kind: 'export', name, content_type, meta }, bytes);
    exports.push({ path: row.path, name: row.name, content_type, bytes: row.bytes });
  };
  if (out.sets.meta.length) {
    await put(
      fileName(ctx, 'Meta Bulk Import', 'xlsx'),
      XLSX_TYPE,
      buildXlsx([
        { name: 'Ads', rows: metaBulkRows(out, files) },
        { name: 'Ad sets', rows: metaSetupRows(out) },
        { name: 'Forecast', rows: forecastRows(out) },
      ]),
      { platform: 'meta', format: 'bulk-import' }
    );
  }
  if (out.sets.google) {
    await put(fileName(ctx, 'Google Ads Editor', 'csv'), CSV_TYPE, new TextEncoder().encode(toCsv(googleEditorRows(out))), { platform: 'google', format: 'editor-csv', budget: 'medium' });
  }
  if (imageEntries.length) await put(fileName(ctx, 'Ad Images', 'zip'), ZIP_TYPE, zipFiles(imageEntries), { platform: 'meta', format: 'images', count: imageEntries.length });
  if (carouselEntries.length) await put(fileName(ctx, 'Carousel', 'zip'), ZIP_TYPE, zipFiles(carouselEntries), { platform: 'instagram', format: 'carousel', slides: slides.length });

  const plan = isAdplanOutput(ctx.outputs.adplan) ? ctx.outputs.adplan : null;
  const siteChanges = (plan?.ranked ?? []).filter((c) => c.area === 'website' || c.area === 'google' || c.area === 'seo').slice(0, 6);
  const report = await printAndStore(
    ctx,
    'adsets',
    'Ad Sets',
    buildAdsetsHtml({
      business: ctx.audit.business_name,
      brand: brandOf(ctx),
      date: formatDate(new Date(out.generated_at)),
      phase: ctx.audit.phase === 'integrated' ? 'integrated' : 'competitors',
      adsets: out,
      images,
      carousel: slides,
      carouselCaption: caption,
      siteChanges,
      preparer: preparerFor(ctx.audit.branding),
    })
  );
  return { report, exports };
}
