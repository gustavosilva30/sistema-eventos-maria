// Script para fazer deploy do arquivo de teste
const fs = require('fs');
const path = require('path');

// Copiar index-test.html para index.html temporariamente
const testHtml = fs.readFileSync('index-test.html', 'utf8');
fs.writeFileSync('index.html', testHtml);

console.log('✅ index-test.html copiado para index.html');
console.log('📦 Execute: npm run build');
console.log('🚀 Após o build, o index-test.html estará disponível em /index-test.html');
console.log('🔗 Teste: https://sistema-eventos-maria.vercel.app/index-test.html');
