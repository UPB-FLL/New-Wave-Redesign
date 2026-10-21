/**
 * Section descriptors: what each `site_content` section holds, block by
 * block, so one editor (`SectionPage`) can render every section. The keys
 * are exactly the ones the public components read; `sections.test.ts`
 * holds them to that. A descriptor never changes the stored shape: lists
 * stay JSON strings under their existing keys.
 */

export interface SelectOption {
  value: string;
  label: string;
}

/** A field that stores one value: on the section (a `site_content` row) or inside a list item. */
export interface ScalarField {
  key: string;
  label: string;
  /** `strings` is a list of plain strings (features, highlights, proof points). */
  kind: 'text' | 'textarea' | 'number' | 'color' | 'select' | 'checkbox' | 'strings';
  /** Where the value shows on the site, or an example; shown under the input. */
  hint?: string;
  options?: SelectOption[];
  placeholder?: string;
}

/** A list of items stored as one JSON string under `key`. */
export interface ListField {
  key: string;
  label: string;
  kind: 'list';
  /** What one item is called: "card", "tier", "service". */
  itemLabel: string;
  /** The item field shown as the row's title, and the one shown beside it. */
  titleKey: string;
  subtitleKey?: string;
  fields: ScalarField[];
  /** A new item's starting values. */
  newItem: Record<string, string | number | boolean | string[]>;
  /** The site's own defaults, offered when the stored list is empty. */
  defaults?: Record<string, string | number | boolean | string[]>[];
  hint?: string;
}

export type SectionField = ScalarField | ListField;

export interface SectionBlock {
  id: string;
  title: string;
  description?: string;
  /** The id of the element on the public page this block renders in, for "View on site" to land on. */
  anchor?: string;
  fields: SectionField[];
}

export interface SectionDescriptor {
  /** The `site_content.section` value. */
  section: string;
  title: string;
  description: string;
  /** The public page the section renders on, for "View on site". */
  url: string;
  blocks: SectionBlock[];
}

export const isListField = (f: SectionField): f is ListField => f.kind === 'list';
