/** Reverse wordmarks need a dark backing in previews and printed reports. */
export function logoBackground(url: string | null | undefined): string {
  let path = '';
  try { path = new URL(url || '').pathname; } catch { /* Missing images use the ordinary background. */ }
  return /(?:^|[._/-])(?:light|white|reverse|reversed|negative)(?:[._/-]|$)/i.test(path) ? '#101e2d' : '#ffffff';
}
