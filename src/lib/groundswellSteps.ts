/**
 * Plain labels for Groundswell's steps (api/_lib/groundswell/steps.ts), for the
 * admin queue and the partner app's progress list. No Supabase client here, so
 * the partner pages can import it.
 */
export const STEP_LABELS: Record<string, string> = {
  site: 'Website',
  maps: 'Google Maps',
  search: 'Search rankings',
  keywords: 'Keyword demand',
  social: 'Instagram',
  ads: 'Ads',
  model: 'Write-up and ROI',
  adplan: 'Ad plan and change ranking',
  adcopy: 'Ad copy',
  social_depth: 'Instagram posts and reels',
  ads_library: 'Ad libraries',
  pricing: 'Offers and prices',
  authority: 'Authority',
  benchmark: 'Scorecard and plan',
  deliver_benchmark: 'Benchmark PDF',
  deliver_prepare: 'Drive folder',
  deliver_audit: 'Full audit PDF',
  deliver_deck: 'Slides PDF',
  deliver_summary: 'Summary PDF',
  deliver_finish: 'Share and save links',
  // The checks (api/_lib/groundswell/verify.ts), for every round the worker supports.
  ...Object.fromEntries(
    [2, 3, 4, 5].flatMap((r) => [
      [`verify_read_${r}`, `Read again (round ${r})`],
      [`verify_check_${r}`, `Compare and review (round ${r})`],
    ])
  ),
};
