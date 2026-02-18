# EventMaster AI - Configuração com Supabase

## 📋 Resumo da Configuração

Este projeto foi migrado do localStorage para Supabase para armazenamento de dados persistente.

## ✅ Configurações Realizadas

### 1. Dependências
- ✅ `@supabase/supabase-js` instalado

### 2. Variáveis de Ambiente (.env.local)
```env
VITE_SUPABASE_URL=https://gvfrpnkdsrvmvkirorhi.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imd2ZnJwbmtkc3J2bXZraXJvcmhpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzEzMTgwODQsImV4cCI6MjA4Njg5NDA4NH0.8isWR5PAMZ1GtCYp5ECz0Uz9McUYd5m1oje86g9DF_8
```

### 3. Arquivos Criados/Modificados
- ✅ `services/supabaseService.ts` - Conexão com Supabase
- ✅ `services/supabaseStorageService.ts` - Serviço async completo
- ✅ `App.tsx` - Migrado para usar Supabase (funções async)
- ✅ `supabase-schema.sql` - Script SQL para criar tabelas

## 🗄️ Estrutura do Banco de Dados

### Tabelas Criadas:
- **events** - Eventos e suas informações
- **guests** - Convidados e check-ins
- **reminders** - Lembretes e tarefas
- **users** - Usuários (Admin/Staff)

## 🚀 Como Usar

### 1. Execute o SQL no Supabase
Copie e execute o conteúdo do arquivo `supabase-schema.sql` no painel SQL do seu projeto Supabase.

### 2. Inicie a Aplicação
```bash
npm run dev
```

### 3. Recursos Disponíveis
- ✅ Criação e gerenciamento de eventos
- ✅ Cadastro de convidados com QR codes
- ✅ Importação de convidados via Excel
- ✅ Sistema de check-in via QR code
- ✅ Gestão de lembretes
- ✅ Gestão de equipe (Admin/Staff)
- ✅ Dados persistidos em nuvem

## 🔧 Principais Mudanças Técnicas

### Antes (localStorage):
```typescript
// Síncrono
const events = Storage.getEvents();
Storage.saveEvent(event);
```

### Depois (Supabase):
```typescript
// Assíncrono
const events = await Storage.getEvents();
await Storage.saveEvent(event);
```

## 📝 Notas Importantes

1. **Performance**: O Supabase oferece melhor performance para grandes volumes de dados
2. **Persistência**: Dados são salvos na nuvem, não mais no navegador
3. **Segurança**: Configurado com Row Level Security (RLS)
4. **Escalabilidade**: Suporta múltiplos usuários simultaneamente
5. **Backup**: Dados podem ser backup facilmente pelo painel do Supabase

## 🐛 Troubleshooting

### Erros Comuns:
1. **"Missing Supabase environment variables"**
   - Verifique se o arquivo `.env.local` existe com as credenciais corretas

2. **"Permission denied"**
   - Execute o SQL completo no Supabase para criar as tabelas e políticas

3. **"Connection failed"**
   - Verifique a URL e a chave do Supabase no `.env.local`

### Logs de Erro:
Todos os erros são logados no console do navegador com detalhes para debugging.

## 🔄 Migração de Dados

Se você tinha dados no localStorage e quer migrar:
1. Use a função de exportação/importação de Excel
2. Ou contate o desenvolvedor para um script de migração

---

**Projeto pronto para produção com Supabase! 🎉**
