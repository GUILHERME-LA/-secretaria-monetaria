import { createBrowserClient } from "@supabase/ssr";
import { createMockClient, isDemoMode } from "./supabase-mock";

export { isDemoMode } from "./supabase-mock";

export function createClient() {
  if (isDemoMode()) {
    return createMockClient() as any;
  }

  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}
