"use client";

import { createClient } from "@supabase/supabase-js";

import { requirePublicSupabaseEnv } from "@/lib/env";

let browserClient: ReturnType<typeof createClient> | null = null;

export function getBrowserSupabaseClient() {
  if (browserClient) {
    return browserClient;
  }

  const { url, anonKey } = requirePublicSupabaseEnv();
  browserClient = createClient(url, anonKey);
  return browserClient;
}
