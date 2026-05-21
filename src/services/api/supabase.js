import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey);

/** Dev-safe mock when .env is missing — prevents white screen on import */
function createMockSupabase() {
  const noopSub = { unsubscribe: () => {} };

  return {
    auth: {
      getSession: async () => ({ data: { session: null }, error: null }),
      onAuthStateChange: (_callback) => ({
        data: { subscription: noopSub },
      }),
      signInWithPassword: async () => ({
        data: null,
        error: {
          message:
            'Supabase is not configured. Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY to .env',
        },
      }),
      signUp: async () => ({
        data: null,
        error: {
          message:
            'Supabase is not configured. Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY to .env',
        },
      }),
      signOut: async () => ({ error: null }),
      signInWithOAuth: async () => ({
        data: null,
        error: { message: 'Supabase is not configured.' },
      }),
      resetPasswordForEmail: async () => ({ error: null }),
      updateUser: async () => ({ error: null }),
    },
  };
}

export const supabase = isSupabaseConfigured
  ? createClient(supabaseUrl, supabaseAnonKey)
  : createMockSupabase();

if (!isSupabaseConfigured && import.meta.env.DEV) {
  console.warn(
    '[Insidr] Supabase env vars missing. Copy .env.example to .env and add your keys.'
  );
}
