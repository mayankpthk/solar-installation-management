import { createClient } from "@supabase/supabase-js";

// PRIVILEGED ADMIN CLIENT: SERVER-ONLY
// This client bypasses RLS and MUST NEVER be exposed to or imported in client-side code.
export function createAdminClient() {
  if (typeof window !== "undefined") {
    throw new Error("FATAL SECURITY VIOLATION: createAdminClient() cannot be called from browser context.");
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error("Missing Supabase admin environment configuration.");
  }

  return createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}
