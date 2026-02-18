import React, { useState, useEffect } from 'react';

// Versão simplificada para debug

const AppSimple: React.FC = () => {
  const [message, setMessage] = useState('Carregando...');

  useEffect(() => {
    const checkEnvironment = () => {
      try {
        console.log('=== INICIANDO APP SIMPLES ===');
        
        // 1. Verificar variáveis de ambiente
        const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
        const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
        
        console.log('URL:', supabaseUrl);
        console.log('Key exists:', !!supabaseKey);
        
        if (!supabaseUrl || !supabaseKey) {
          setMessage('❌ Variáveis de ambiente não configuradas');
          return;
        }
        
        // 2. Tentar importar Supabase
        import('./services/supabaseService.js').then(({ supabase }) => {
          console.log('Supabase importado:', supabase);
          setMessage('✅ Supabase carregado com sucesso!');
        }).catch(error => {
          console.error('Erro importando Supabase:', error);
          setMessage('❌ Erro ao carregar Supabase');
        });
        
      } catch (error) {
        console.error('Erro geral:', error);
        setMessage('❌ Erro ao inicializar aplicação');
      }
    };
    
    checkEnvironment();
  }, []);

  return (
    <div style={{ 
      padding: '40px', 
      fontFamily: 'Arial, sans-serif',
      textAlign: 'center',
      fontSize: '18px'
    }}>
      <h1>🔍 Debug EventMaster AI</h1>
      <p>{message}</p>
      
      <div style={{ 
        marginTop: '20px', 
        padding: '20px', 
        backgroundColor: '#f5f5f5',
        borderRadius: '8px',
        textAlign: 'left'
      }}>
        <h3>Instruções:</h3>
        <p>1. Abra o console (F12)</p>
        <p>2. Verifique os logs acima</p>
        <p>3. Veja se há erros vermelhos</p>
      </div>
    </div>
  );
};

export default AppSimple;
