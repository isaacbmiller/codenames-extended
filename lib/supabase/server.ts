import { createClient } from "@supabase/supabase-js";

import { requireBrowserSupabaseConfig, requireServiceRoleKey } from "@/lib/env";

export function createServerSupabaseClient() {
  const { url } = requireBrowserSupabaseConfig();
  const serviceRoleKey = requireServiceRoleKey();

  return createClient(url, serviceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false
    }
  });
}
