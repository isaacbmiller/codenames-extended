function readEnv(name: string): string | undefined {
  const value = process.env[name];
  return value && value.trim() ? value : undefined;
}

export function hasSupabaseEnv(): boolean {
  return Boolean(
    readEnv("NEXT_PUBLIC_SUPABASE_URL") &&
      readEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY") &&
      readEnv("SUPABASE_SERVICE_ROLE_KEY")
  );
}

export function requirePublicSupabaseEnv() {
  const url = readEnv("NEXT_PUBLIC_SUPABASE_URL");
  const anonKey = readEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY");

  if (!url || !anonKey) {
    throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY.");
  }

  return { url, anonKey };
}

export function requireServiceRoleKey(): string {
  const serviceRoleKey = readEnv("SUPABASE_SERVICE_ROLE_KEY");

  if (!serviceRoleKey) {
    throw new Error("Missing SUPABASE_SERVICE_ROLE_KEY.");
  }

  return serviceRoleKey;
}
