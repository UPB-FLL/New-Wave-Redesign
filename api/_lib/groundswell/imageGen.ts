import { download } from './creative.js';
import { executeTool, findKey } from './composio.js';

/**
 * New images for posts (the owner's choice on 2026-10-27: the business's own
 * photos first, and new AI scenes where they run out, labelled as
 * AI-generated wherever they are used). One fal.ai text-to-image model,
 * reached the first way that answers:
 *
 * 1. Composio's `FAL_AI_RUN_MODEL_SYNC` (the consumer account when
 *    COMPOSIO_CONSUMER_API_KEY is set, else the project's fal connection);
 * 2. fal's own endpoint (`https://fal.run/<model>`) with FAL_KEY.
 *
 * Neither path has run against a live account from this code yet. Each call
 * is billed by fal; GROUNDSWELL_AI_IMAGES=off turns generation off.
 */

export const DEFAULT_IMAGE_MODEL = 'fal-ai/flux/dev';
export const imageModel = () => process.env.GROUNDSWELL_IMAGE_MODEL?.trim() || DEFAULT_IMAGE_MODEL;
export const aiImagesEnabled = () => (process.env.GROUNDSWELL_AI_IMAGES ?? '').trim().toLowerCase() !== 'off';

/** The pixel sizes asked of the model: 4:5 and 9:16 in multiples of 16, under two megapixels (the post render scales them to 1080 wide). */
export const GENERATION_SIZES = { feed: { width: 1024, height: 1280 }, vertical: { width: 864, height: 1536 } } as const;

export interface GeneratedImage {
  bytes: Uint8Array;
  width: number;
  height: number;
  type: string;
  provider: 'composio' | 'fal';
  model: string;
  /** The model's own hosted copy (fal's CDN), for the record. */
  url: string;
}

const message = (err: unknown) => (err instanceof Error ? err.message : String(err)).slice(0, 200);

/** The first image of a fal answer that the model's own safety check did not flag. */
export function falImageUrl(payload: unknown): string | null {
  const images = findKey<unknown[]>(payload, 'images') ?? [];
  const flagged = findKey<unknown[]>(payload, 'has_nsfw_concepts') ?? [];
  for (const [i, image] of images.entries()) {
    if (flagged[i] === true) continue;
    const url = (image as { url?: unknown })?.url;
    if (typeof url === 'string' && /^https:\/\//.test(url)) return url;
  }
  return null;
}

/**
 * One generated image, or an error naming what each path answered. The
 * prompt is the caller's; a flagged or missing image counts as no answer.
 */
export async function generateImage(prompt: string, size: keyof typeof GENERATION_SIZES, opts: { timeoutMs: number; fetchImpl?: typeof fetch }): Promise<GeneratedImage> {
  const model = imageModel();
  const input = { prompt, image_size: GENERATION_SIZES[size], num_images: 1, output_format: 'jpeg', enable_safety_checker: true };
  const fetchImpl = opts.fetchImpl ?? fetch;
  const deadline = Date.now() + opts.timeoutMs;
  const tried: string[] = [];

  const fetched = async (url: string | null, provider: GeneratedImage['provider']): Promise<GeneratedImage | null> => {
    if (!url) {
      tried.push(`${provider === 'composio' ? 'Composio' : 'fal'}: no usable image in the answer`);
      return null;
    }
    const image = await download(url, fetchImpl);
    if (!image) {
      tried.push(`${provider === 'composio' ? 'Composio' : 'fal'}: the image could not be downloaded`);
      return null;
    }
    return { ...image, provider, model, url };
  };

  try {
    const payload = await executeTool('FAL_AI_RUN_MODEL_SYNC', { model_id: model, input, timeout_seconds: 30 }, Math.max(1, deadline - Date.now()));
    const got = await fetched(falImageUrl(payload), 'composio');
    if (got) return got;
  } catch (err) {
    // A missing fal connection (or a refused Composio key) only means this path is closed: the direct key may still answer.
    tried.push(`Composio: ${message(err)}`);
  }

  const key = process.env.FAL_KEY?.trim();
  if (key && deadline - Date.now() > 1_000) {
    try {
      const response = await fetchImpl(`https://fal.run/${model}`, {
        method: 'POST',
        headers: { Authorization: `Key ${key}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(input),
        signal: AbortSignal.timeout(Math.max(1_000, deadline - Date.now())),
      });
      if (!response.ok) tried.push(`fal: answered ${response.status}`);
      else {
        const got = await fetched(falImageUrl(await response.json()), 'fal');
        if (got) return got;
      }
    } catch (err) {
      tried.push(`fal: ${message(err)}`);
    }
  } else if (!key) {
    tried.push('fal: FAL_KEY is not set');
  }
  throw new Error(`No image generator answered (${tried.join('; ')}).`);
}
