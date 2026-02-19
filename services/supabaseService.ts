import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

console.log('Supabase check:', { url: !!supabaseUrl, key: !!supabaseAnonKey });

export const supabase = !supabaseUrl || !supabaseAnonKey 
  ? (() => {
      console.error('Missing Supabase environment variables. URL:', supabaseUrl, 'Key present:', !!supabaseAnonKey);
      return createClient('https://placeholder.supabase.co', 'placeholder-key');
    })()
  : createClient(supabaseUrl, supabaseAnonKey);
