import { createClient } from '@supabase/supabase-js';

const getEnv = (key: string) => {
  return import.meta.env[key] || 
         (typeof process !== 'undefined' ? process.env[key] : '') || 
         (typeof window !== 'undefined' && (window as any)._env_?.[key]) ||
         '';
};

const supabaseUrl = getEnv('VITE_SUPABASE_URL') || getEnv('SUPABASE_URL');
const supabaseAnonKey = getEnv('VITE_SUPABASE_ANON_KEY') || getEnv('SUPABASE_ANON_KEY');

console.log('Supabase Check:', {
  url: supabaseUrl ? `Found (${supabaseUrl.substring(0, 12)}...)` : 'MISSING',
  key: supabaseAnonKey ? 'Found' : 'MISSING'
});

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('CRITICAL: Supabase environment variables are missing!');
}

export const supabase = createClient(
  supabaseUrl || 'https://placeholder.supabase.co',
  supabaseAnonKey || 'placeholder-key'
);
