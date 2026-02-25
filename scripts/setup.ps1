
Write-Host "Configurando ambiente de desenvolvimento Lumi Energy Bills..." -ForegroundColor Green

# Verificar se Node.js está instalado
Write-Host "`Verificando Node.js..." -ForegroundColor Yellow
try {
    $nodeVersion = node --version
    Write-Host "✅ Node.js encontrado: $nodeVersion" -ForegroundColor Green
} catch {
    Write-Host "❌ Node.js não encontrado. Instale o Node.js 18+ e tente novamente." -ForegroundColor Red
    exit 1
}

# Verificar se npm está disponível
try {
    $npmVersion = npm --version
    Write-Host "✅ npm encontrado: $npmVersion" -ForegroundColor Green
} catch {
    Write-Host "❌ npm não encontrado. Verifique sua instalação do Node.js." -ForegroundColor Red
    exit 1
}

# Instalar dependências
Write-Host "`n📦 Instalando dependências..." -ForegroundColor Yellow
npm install
if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Erro ao instalar dependências." -ForegroundColor Red
    exit 1
}
Write-Host "✅ Dependências instaladas com sucesso!" -ForegroundColor Green

# Verificar se arquivo .env existe
Write-Host "`n🔧 Verificando configuração..." -ForegroundColor Yellow
if (-not (Test-Path ".env")) {
    Write-Host "📝 Arquivo .env não encontrado. Criando a partir do template..." -ForegroundColor Blue
    Copy-Item ".env.example" ".env"
    Write-Host "✅ Arquivo .env criado!" -ForegroundColor Green
    Write-Host "⚠️  IMPORTANTE: Configure as variáveis no arquivo .env antes de continuar" -ForegroundColor Yellow
    Write-Host "   - DATABASE_URL (PostgreSQL)" -ForegroundColor White
    Write-Host "   - OPENAI_API_KEY (sua chave da OpenAI)" -ForegroundColor White
} else {
    Write-Host "✅ Arquivo .env já existe!" -ForegroundColor Green
}

# Verificar se Docker está disponível (opcional)

# Gerar cliente Prisma
Write-Host "`n🗄️  Configurando Prisma..." -ForegroundColor Yellow
npm run prisma:generate
if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Erro ao gerar cliente Prisma." -ForegroundColor Red
    Write-Host "   Certifique-se que a DATABASE_URL esteja configurada corretamente." -ForegroundColor Yellow
} else {
    Write-Host "✅ Cliente Prisma gerado!" -ForegroundColor Green
}

# Instruções finais
Write-Host "`n🎉 Configuração concluída!" -ForegroundColor Green
Write-Host "`nPróximos passos:" -ForegroundColor Cyan
Write-Host "1. Configure as variáveis no arquivo .env" -ForegroundColor White
Write-Host "2. Configure seu banco PostgreSQL" -ForegroundColor White
Write-Host "3. Execute as migrations: npm run prisma:migrate" -ForegroundColor White
Write-Host "4. Inicie o servidor: npm run start:dev" -ForegroundColor White
Write-Host "`nComandos úteis:" -ForegroundColor Cyan
Write-Host "  npm run start:dev     - Inicia em modo desenvolvimento" -ForegroundColor White
Write-Host "  npm run test          - Executa testes unitários" -ForegroundColor White
Write-Host "  npm run test:e2e      - Executa testes e2e" -ForegroundColor White
Write-Host "  npm run prisma:studio - Interface visual do banco" -ForegroundColor White
Write-Host "`n📚 Documentação da API: http://localhost:3000/api-docs" -ForegroundColor Cyan
Write-Host "`n✨ Bom desenvolvimento! ✨" -ForegroundColor Green