# 🔍 Checklist de Configuração Vercel

## ✅ Itens para Verificar no Painel Vercel:

### **1. Dashboard do Projeto**
- [ ] URL do projeto: `https://vercel.com/gustavos-projects-529c9dd1/sistema-eventos-maria/BooQUGPKUc6uqJ5HEh6gUwgJGs6K`
- [ ] Status: "Ready" ou "Building"

### **2. Settings → General**
- [ ] Project Name: `sistema-eventos-maria`
- [ ] Framework Preset: `Vite` (ou detectado automaticamente)
- [ ] Root Directory: `/` (vazio)
- [ ] Node.js Version: `18.x` ou superior

### **3. Settings → Build & Development**
- [ ] Build Command: `npm run build`
- [ ] Output Directory: `dist`
- [ ] Install Command: `npm install`

### **4. Settings → Git**
- [ ] Git Repository: `gustavosilva30/sistema-eventos-maria`
- [ ] Production Branch: `master` ⚠️ **IMPORTANTE**
- [ ] Root Directory: `/` (vazio)

### **5. Environment Variables**
- [ ] `VITE_SUPABASE_URL` configurada
- [ ] `VITE_SUPABASE_ANON_KEY` configurada
- [ ] Environment: `All` (Production, Preview, Development)

## 🚨 Se Algo Estiver Incorreto:

### **Branch Incorreta:**
Se "Production Branch" não for `master`:
1. Clique em "Edit"
2. Mude para `master`
3. Save
4. Redeploy

### **Root Directory Incorreto:**
Se não estiver vazio:
1. Clique em "Edit"
2. Mude para `/` (vazio)
3. Save
4. Redeploy

### **Git Desconectado:**
Se o repositório não estiver conectado:
1. Clique "Connect"
2. Autorize GitHub
3. Selecione o repositório correto
4. Redeploy

## 🔄 Passo a Passo:

1. **Verifique todos os itens** acima
2. **Corrija o que estiver errado**
3. **Salve as alterações**
4. **Vá para "Deployments" → "Redeploy"**
5. **Aguarde 2-3 minutos**

---

**O problema mais comum é a Production Branch!** 🔧
