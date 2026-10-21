/**
 * A small in-memory stand-in for the supabase-js query builder, enough for the
 * Groundswell partner routes: select/insert/update/delete with eq, is, gt, in,
 * order, limit, single and maybeSingle. Rows are plain objects; ids are made up.
 */
type Row = Record<string, unknown>;

export function fakeSupabase(seed: Record<string, Row[]> = {}) {
  const tables: Record<string, Row[]> = Object.fromEntries(Object.entries(seed).map(([k, v]) => [k, v.map((r) => ({ ...r }))]));
  let nextId = 1;
  const unique: Record<string, string[]> = { groundswell_partners: ['email'], groundswell_partner_sessions: ['token_hash'], groundswell_partner_tokens: ['token_hash'] };

  const from = (table: string) => {
    tables[table] ??= [];
    const filters: ((r: Row) => boolean)[] = [];
    let op: 'select' | 'insert' | 'update' | 'delete' = 'select';
    let payload: Row | null = null;
    let columns: string | null = null;
    let limitTo: number | null = null;

    const project = (r: Row) => {
      if (!columns || columns === '*') return { ...r };
      return Object.fromEntries(columns.split(',').map((c) => c.trim()).map((c) => [c, r[c] ?? null]));
    };
    const matching = () => tables[table].filter((r) => filters.every((f) => f(r)));

    const run = (): { data: Row[] | null; error: { message: string; code?: string } | null } => {
      if (op === 'insert') {
        const row = { id: `id-${nextId++}`, created_at: new Date().toISOString(), ...payload } as Row;
        for (const col of unique[table] ?? []) {
          if (tables[table].some((r) => r[col] === row[col])) return { data: null, error: { message: 'duplicate key', code: '23505' } };
        }
        tables[table].push(row);
        return { data: [project(row)], error: null };
      }
      const rows = matching();
      if (op === 'update') rows.forEach((r) => Object.assign(r, payload));
      if (op === 'delete') tables[table] = tables[table].filter((r) => !rows.includes(r));
      const out = rows.map(project);
      return { data: limitTo === null ? out : out.slice(0, limitTo), error: null };
    };

    const chain = {
      select(cols?: string) {
        columns = cols ?? '*';
        return chain;
      },
      insert(row: Row) {
        op = 'insert';
        payload = row;
        return chain;
      },
      update(patch: Row) {
        op = 'update';
        payload = patch;
        return chain;
      },
      delete() {
        op = 'delete';
        return chain;
      },
      eq(col: string, v: unknown) {
        filters.push((r) => r[col] === v);
        return chain;
      },
      is(col: string, v: unknown) {
        filters.push((r) => (r[col] ?? null) === v);
        return chain;
      },
      gt(col: string, v: string) {
        filters.push((r) => String(r[col]) > v);
        return chain;
      },
      in(col: string, vs: unknown[]) {
        filters.push((r) => vs.includes(r[col]));
        return chain;
      },
      order() {
        return chain;
      },
      limit(n: number) {
        limitTo = n;
        return chain;
      },
      async single() {
        const { data, error } = run();
        return { data: data?.[0] ?? null, error: error ?? (data?.length ? null : { message: 'no rows' }) };
      },
      async maybeSingle() {
        const { data, error } = run();
        return { data: data?.[0] ?? null, error };
      },
      then(resolve: (v: unknown) => void, reject?: (e: unknown) => void) {
        try {
          resolve(run());
        } catch (e) {
          reject?.(e);
        }
      },
    };
    return chain;
  };

  return { client: { from }, tables };
}
