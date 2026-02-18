// Script para debug no console do navegador
// Cole no console do site (F12) para verificar

console.log('=== DEBUG VERCEL ===');

// 1. Verificar variáveis de ambiente
console.log('VITE_SUPABASE_URL:', import.meta.env.VITE_SUPABASE_URL);
console.log('VITE_SUPABASE_ANON_KEY:', import.meta.env.VITE_SUPABASE_ANON_KEY ? 'DEFINIDA' : 'NÃO DEFINIDA');

// 2. Verificar se o Supabase client foi criado
import { supabase } from './services/supabaseService.js';
console.log('Supabase client:', supabase);

// 3. Tentar conexão simples
supabase.from('events').select('count').then(result => {
  console.log('Teste conexão Supabase:', result);
}).catch(error => {
  console.error('Erro conexão Supabase:', error);
});

// 4. Verificar erros gerais
window.addEventListener('error', (event) => {
  console.error('ERRO GERAL:', event.error);
});

window.addEventListener('unhandledrejection', (event) => {
  console.error('PROMISSE REJEITADA:', event.reason);
});
