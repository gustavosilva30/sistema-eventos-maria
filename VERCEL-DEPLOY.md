# 🚀 Deploy no Vercel - Correção de Erros

## 🔍 Problema: Tela Branca

A tela branca ocorre quando as variáveis de ambiente não estão configuradas corretamente no Vercel.

## ✅ Soluções Implementadas

### 1. Correção no supabaseService.ts
- Removido `throw new Error()` que quebrava a aplicação
- Adicionado fallback com console.error para debug

### 2. Tipos TypeScript
- Criado `src/vite-env.d.ts` para tipar `import.meta.env`
- Atualizado `vite.config.ts` com as variáveis do Supabase

## 🔧 Configuração Obrigatória no Vercel

### Variáveis de Ambiente:
```
VITE_SUPABASE_URL=https://gvfrpnkdsrvmvkirorhi.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imd2ZnJwbmtkc3J2bXZraXJvcmhpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzEzMTgwODQsImV4cCI6MjA4Njg5NDA4NH0.8isWR5PAMZ1GtCYp5ECz0Uz9McUYd5m1oje86g9DF_8
```

## 📋 Passos no Vercel:

1. **Acessar**: [vercel.com](https://vercel.com)
2. **Selecionar** seu projeto
3. **Ir para**: Settings → Environment Variables
4. **Adicionar** as duas variáveis acima
5. **Save**
6. **Redeploy**: 
   - Vá para "Deployments"
   - Clique nos três pontos → "Redeploy"

## 🐛 Debug no Vercel

Se ainda der erro:

### 1. Verificar Logs:
- Vá para "Functions" → "Logs"
- Procure por "Missing Supabase environment variables"

### 2. Verificar Console:
- Abra o site no navegador
- F12 → Console
- Procure erros vermelhos

### 3. Verificar Network:
- F12 → Network
- Veja se há requisições falhando

## 🔄 Teste Local

Antes de fazer deploy novo:

```bash
npm run build
npm run preview
```

Acesse `http://localhost:4173` para testar o build.

## 📱 Arquivos Modificados

- ✅ `services/supabaseService.ts` - Tratamento de erro
- ✅ `src/vite-env.d.ts` - Tipos do ambiente
- ✅ `vite.config.ts` - Configuração das variáveis
- ✅ `VERCEL-DEPLOY.md` - Este guia

---

**Após configurar as variáveis no Vercel, faça um novo deploy!** 🚀
