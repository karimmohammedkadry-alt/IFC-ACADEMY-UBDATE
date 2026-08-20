import { createClient, SupabaseClient } from '@supabase/supabase-js';

let supabaseClient: SupabaseClient | null = null;
let dynamicUrl: string | null = null;
let dynamicKey: string | null = null;

export function setSupabaseConfig(url: string, key: string) {
  dynamicUrl = url.trim();
  dynamicKey = key.trim();
  supabaseClient = createClient(dynamicUrl, dynamicKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}

export function getSupabase(): SupabaseClient | null {
  const supabaseUrl = dynamicUrl || process.env.SUPABASE_URL;
  const supabaseKey = dynamicKey || process.env.SUPABASE_ANON_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseKey) {
    return null;
  }

  if (!supabaseClient) {
    supabaseClient = createClient(supabaseUrl, supabaseKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    });
  }

  return supabaseClient;
}

export function isSupabaseConfigured(): boolean {
  return Boolean((dynamicUrl || process.env.SUPABASE_URL) && (dynamicKey || process.env.SUPABASE_ANON_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY));
}
