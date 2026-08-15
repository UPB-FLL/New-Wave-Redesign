import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

type FallbackListResult = { data: never[]; error: null };
type FallbackSingleResult = { data: null; error: null };

type FallbackQuery = {
  select: (...args: unknown[]) => FallbackQuery;
  insert: (...args: unknown[]) => FallbackQuery;
  update: (...args: unknown[]) => FallbackQuery;
  delete: (...args: unknown[]) => FallbackQuery;
  upsert: (...args: unknown[]) => FallbackQuery;
  eq: (...args: unknown[]) => FallbackQuery;
  order: (...args: unknown[]) => FallbackQuery;
  single: () => Promise<FallbackSingleResult>;
  maybeSingle: () => Promise<FallbackSingleResult>;
  then: Promise<FallbackListResult>['then'];
  catch: Promise<FallbackListResult>['catch'];
  finally: Promise<FallbackListResult>['finally'];
};

type FallbackClient = {
  from: (_table: string) => FallbackQuery;
};

function createFallbackQuery(): FallbackQuery {
  const query = {} as FallbackQuery;
  const emptyList = (): Promise<FallbackListResult> => Promise.resolve({ data: [], error: null });
  const emptyResult = emptyList();

  Object.assign(query, {
    select: () => query,
    insert: () => query,
    update: () => query,
    delete: () => query,
    upsert: () => query,
    eq: () => query,
    order: () => query,
    single: () => Promise.resolve({ data: null, error: null }),
    maybeSingle: () => Promise.resolve({ data: null, error: null }),
    then: emptyResult.then.bind(emptyResult),
    catch: emptyResult.catch.bind(emptyResult),
    finally: emptyResult.finally.bind(emptyResult),
  });

  return query;
}

export function createUnconfiguredSupabaseClient(): FallbackClient {
  return {
    from: () => createFallbackQuery(),
  };
}

// Keep public pages usable in local previews when environment variables are absent.
export const supabase = (supabaseUrl && supabaseAnonKey)
  ? createClient(supabaseUrl, supabaseAnonKey)
  : createUnconfiguredSupabaseClient() as unknown as ReturnType<typeof createClient>;
