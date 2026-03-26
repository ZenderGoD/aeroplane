import { createClient, SupabaseClient } from "@supabase/supabase-js";

const globalForSupabase = globalThis as unknown as {
  supabaseAdmin: SupabaseClient | undefined;
};

/** Server/worker client — bypasses RLS, used for writes */
export function getSupabaseAdmin(): SupabaseClient {
  if (globalForSupabase.supabaseAdmin) return globalForSupabase.supabaseAdmin;

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !key) {
    throw new Error(
      "Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY"
    );
  }

  const client = createClient(url, key, {
    auth: { persistSession: false },
  });

  if (process.env.NODE_ENV !== "production") {
    globalForSupabase.supabaseAdmin = client;
  }

  return client;
}

/** Browser client — respects RLS, used for reads */
export function getSupabaseBrowser(): SupabaseClient {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !key) {
    throw new Error(
      "Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY"
    );
  }

  return createClient(url, key);
}
