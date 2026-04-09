"use client";

import { createClient } from "@supabase/supabase-js";

import type { BrowserSupabaseConfig } from "@/lib/env";

let browserClient: ReturnType<typeof createClient> | null = null;
let browserClientSignature: string | null = null;

export function getBrowserSupabaseClient(config: BrowserSupabaseConfig) {
  const signature = `${config.url}::${config.clientKey}`;

  if (browserClient && browserClientSignature === signature) {
    return browserClient;
  }

  browserClient = createClient(config.url, config.clientKey);
  browserClientSignature = signature;
  return browserClient;
}
