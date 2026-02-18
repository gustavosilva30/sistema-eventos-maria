# 🔍 Guia de Debug - Tela Branca no Vercel

## 🚨 Problema: Aplicação não carrega (tela branca)

## 📋 Passos para Diagnosticar

### 1. **Abrir Console do Navegador**
- No site: F12 → Aba "Console"
- Procure por erros em vermelho
- Anote todas as mensagens de erro

### 2. **Verificar Variáveis de Ambiente**
No console, cole:
```javascript
console.log('VITE_SUPABASE_URL:', import.meta.env.VITE_SUPABASE_URL);
console.log('VITE_SUPABASE_ANON_KEY:', import.meta.env.VITE_SUPABASE_ANON_KEY ? 'OK' : 'MISSING');
```

### 3. **Testar Conexão Supabase**
```javascript
import { supabase } from './services/supabaseService.js';
supabase.from('events').select('count').then(r => console.log('Conexão OK:', r)).catch(e => console.error('Erro:', e));
```

## 🔧 Soluções Possíveis

### **Caso 1: Variáveis não configuradas**
Se o console mostrar "MISSING":
1. Vá ao painel do Vercel
2. Settings → Environment Variables
3. Adicione EXATAMENTE:
   ```
   VITE_SUPABASE_URL
   https://gvfrpnkdsrvmvkirorhi.supabase.co
   
   VITE_SUPABASE_ANON_KEY
   eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imd2ZnJwbmtkc3J2bXZraXJvcmhpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzEzMTgwODQsImV4cCI6MjA4Njg5NDA4NH0.8isWR5PAMZ1GtCYp5ECz0Uz9McUYd5m1oje86g9DF_8
   ```
4. Save e Redeploy

### **Caso 2: Erro de Importação**
Se o erro for de módulo não encontrado:
1. Verifique se o build foi feito corretamente
2. Force um novo deploy manual no Vercel

### **Caso 3: Erro de Supabase**
Se a conexão falhar:
1. Verifique se as tabelas foram criadas
2. Execute o SQL `supabase-policies.sql` no painel

## 🧪 Teste com Versão Simplificada

### Opção A: Mudar entry point
1. No Vercel, vá para Settings → Build & Development Settings
2. Mudar "Build Command" para:
   ```
   npm run build && cp index-debug.tsx dist/index.js
   ```
3. Redeploy

### Opção B: Testar local com variáveis do Vercel
1. Crie `.env.production.local`:
   ```
   VITE_SUPABASE_URL=https://gvfrpnkdsrvmvkirorhi.supabase.co
   VITE_SUPABASE_ANON_KEY=sua_chave_aqui
   ```
2. `npm run build && npm run preview`

## 📱 Logs do Vercel

1. No dashboard Vercel
2. Clique no projeto
3. Vá para "Functions" → "Logs"
4. Procure por erros durante o build

## 🔎 Erros Comuns

### "Cannot read property 'env' of undefined"
- Problema: `import.meta.env` não disponível
- Solução: Arquivo `src/vite-env.d.ts` ausente

### "Missing Supabase environment variables"
- Problema: Variáveis não configuradas no Vercel
- Solução: Adicionar em Environment Variables

### "Network error"
- Problema: URL ou chave incorretas
- Solução: Verificar credenciais no Supabase

## 🚀 Comando de Emergência

Se nada funcionar, crie um arquivo `test.html`:

```html
<!DOCTYPE html>
<html>
<head>
    <title>Test</title>
</head>
<body>
    <h1>Teste de Deploy</h1>
    <p>Se você vê isto, o deploy funciona!</p>
    <script>
        console.log('HTML carregado');
        // Testar variáveis
        console.log('URL:', import.meta.env?.VITE_SUPABASE_URL);
    </script>
</body>
</html>
```

---

**Após identificar o erro específico, me avise para corrigir!** 🔧
