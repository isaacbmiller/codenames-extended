function readEnv(name: string): string | undefined {
  const value = process.env[name];
  return value && value.trim() ? value : undefined;
}

export interface BrowserSupabaseConfig {
  url: string;
  clientKey: string;
}

function readSupabaseUrl(): string | undefined {
  return readEnv("NEXT_PUBLIC_SUPABASE_URL") ?? readEnv("SUPABASE_URL");
}

function readBrowserSupabaseKey(): string | undefined {
  return (
    readEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY") ??
    readEnv("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY") ??
    readEnv("SUPABASE_ANON_KEY")
  );
}

export function hasSupabaseEnv(): boolean {
  return Boolean(readSupabaseUrl() && readBrowserSupabaseKey() && requireOptionalServiceRoleKey());
}

export function requireBrowserSupabaseConfig(): BrowserSupabaseConfig {
  const url = readSupabaseUrl();
  const clientKey = readBrowserSupabaseKey();

  if (!url || !clientKey) {
    throw new Error(
      "Missing Supabase browser config. Expected NEXT_PUBLIC_SUPABASE_URL or SUPABASE_URL, plus a public Supabase client key."
    );
  }

  return { url, clientKey };
}

function requireOptionalServiceRoleKey(): string | undefined {
  return readEnv("SUPABASE_SERVICE_ROLE_KEY") ?? readEnv("SUPABASE_SECRET_KEY");
}

export function requireServiceRoleKey(): string {
  const serviceRoleKey = requireOptionalServiceRoleKey();

  if (!serviceRoleKey) {
    throw new Error("Missing SUPABASE_SERVICE_ROLE_KEY or SUPABASE_SECRET_KEY.");
  }

  return serviceRoleKey;
}
