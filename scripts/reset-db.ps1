# Reset do banco de dados para desenvolvimento
# ATENÇÃO: Este script apaga TODOS os dados do banco!

param(
    [switch]$Force,
    [switch]$TestDb
)

$dbName = if ($TestDb) { "lumi_energy_bills_test" } else { "lumi_energy_bills" }
$envSuffix = if ($TestDb) { "_TEST" } else { "" }

Write-Host "🗄️  Reset do banco de dados: $dbName" -ForegroundColor Yellow

if (-not $Force) {
    $confirmation = Read-Host "⚠️  ATENÇÃO: Todos os dados serão perdidos! Continuar? (s/N)"
    if ($confirmation -ne 's' -and $confirmation -ne 'S') {
        Write-Host "❌ Operação cancelada pelo usuário." -ForegroundColor Red
        exit 0
    }
}

Write-Host "`n🔄 Resetando banco de dados..." -ForegroundColor Blue

try {
    # Reset do banco usando Prisma
    if ($TestDb) {
        $env:DATABASE_URL = $env:DATABASE_URL_TEST
    }
    
    Write-Host "📝 Aplicando reset do Prisma..." -ForegroundColor White
    npx prisma db push --force-reset --accept-data-loss
    
    if ($LASTEXITCODE -ne 0) {
        throw "Erro no reset do Prisma"
    }
    
    Write-Host "🔄 Aplicando migrations..." -ForegroundColor White
    npx prisma migrate deploy
    
    if ($LASTEXITCODE -ne 0) {
        throw "Erro ao aplicar migrations"
    }
    
    Write-Host "🌱 Gerando cliente Prisma..." -ForegroundColor White
    npx prisma generate
    
    if ($LASTEXITCODE -ne 0) {
        throw "Erro ao gerar cliente Prisma"
    }
    
    Write-Host "`n✅ Reset concluído com sucesso!" -ForegroundColor Green
    Write-Host "📊 Use 'npm run prisma:studio' para visualizar o banco" -ForegroundColor Cyan
    
} catch {
    Write-Host "`n❌ Erro durante o reset: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}

Write-Host "`n🎯 Database $dbName está pronto para desenvolvimento!" -ForegroundColor Green