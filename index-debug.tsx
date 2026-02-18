import React from 'react';
import ReactDOM from 'react-dom/client';
import AppSimple from './App-simple';
import './index.css';

// Versão de debug para isolar problemas
ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <AppSimple />
  </React.StrictMode>,
);
