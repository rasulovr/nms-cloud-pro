import { createClient } from '@supabase/supabase-js'

const supabaseUrl =
  import.meta.env.VITE_SAAS_SUPABASE_URL ||
  import.meta.env.VITE_SUPABASE_URL

const supabaseAnonKey =
  import.meta.env.VITE_SAAS_SUPABASE_PUBLISHABLE_KEY ||
  import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn('Missing Supabase env variables. Check Vercel environment settings.')
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey)
