import { createClient } from "@supabase/supabase-js";

import { requirePublicSupabaseEnv, requireServiceRoleKey } from "@/lib/env";

export function createServerSupabaseClient() {
  const { url } = requirePublicSupabaseEnv();
  const serviceRoleKey = requireServiceRoleKey();

  return createClient(url, serviceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false
    }
  });
}
