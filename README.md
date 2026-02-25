# Lumi Energy Bills API

## Visão Geral

API RESTful desenvolvida para processamento automatizado de faturas de energia elétrica brasileiras utilizando tecnologias de Inteligência Artificial. O sistema oferece extração inteligente de dados estruturados a partir de documentos PDF, cálculo de métricas energéticas e disponibilização de dados consolidados através de endpoints para dashboards analíticos.

## Funcionalidades Principais

### Processamento de Faturas

- Upload e processamento de faturas em formato PDF
- Extração automática de dados via Large Language Model (GPT-4o)
- Validação e estruturação de informações extraídas
- Cálculo automático de variáveis derivadas de consumo e economia energética
- Processamento em lote com controle de status individual
- Sistema de reprocessamento para faturas com falhas

### Sistema de Consultas

- Listagem paginada de faturas processadas
- Filtros por número do cliente, período e status de processamento
- Consulta individual de faturas por ID
- Busca por intervalos de datas específicos

### Dashboard Analítico

- Dados consolidados para painéis de controle
- Análise de consumo vs compensação energética
- Métricas financeiras de economia com geração distribuída
- Dados anuais com comparações históricas
- Ranking de clientes por economia
- Estatísticas mensais e anuais detalhadas

## Dados Extraídos das Faturas

### Informações Básicas

- Número do Cliente
- Mês de Referência (formato MMM/AAAA)

### Dados Energéticos

- **Energia Elétrica**: Quantidade (kWh) e Valor (R$)
- **Energia SCEEE s/ICMS**: Quantidade (kWh) e Valor (R$)
- **Energia Compensada GD I**: Quantidade (kWh) e Valor (R$)
- **Contribuição de Iluminação Pública Municipal**: Valor (R$)

### Métricas Calculadas

- **Consumo Total de Energia**: Somatório Energia Elétrica + Energia SCEEE
- **Energia Compensada**: Energia Compensada GD I (quantidade)
- **Valor Total sem GD**: Energia Elétrica + SCEEE + Contrib. Ilum. Pública
- **Economia GD**: Valor da Energia Compensada GD I

## Stack Tecnológica

### Backend

- **Node.js** - Runtime JavaScript server-side
- **NestJS** - Framework Node.js para aplicações escaláveis
- **TypeScript** - Superset tipado do JavaScript
- **Prisma ORM** - Mapeamento objeto-relacional moderno

### Banco de Dados

- **PostgreSQL** - Sistema de gerenciamento de banco de dados relacional
- **Prisma Client** - Cliente de banco de dados type-safe

### Inteligência Artificial

- **OpenAI GPT-4o** - Modelo de linguagem para análise de documentos
- **PDF Parse** - Biblioteca para extração de texto de arquivos PDF

### Ferramentas de Desenvolvimento

- **Jest** - Framework de testes unitários
- **Swagger/OpenAPI** - Documentação interativa da API
- **Class Validator** - Validação de dados baseada em decorators
- **Multer** - Middleware para upload de arquivos

## Estrutura da Aplicação

```
src/
├── modules/
│   ├── bills/          # Gerenciamento de faturas
│   │   ├── bills.controller.ts
│   │   ├── bills.service.ts
│   │   ├── bills.module.ts
│   │   └── dto/
│   ├── dashboard/      # Dados consolidados
│   │   ├── dashboard.controller.ts
│   │   ├── dashboard.service.ts
│   │   ├── dashboard.module.ts
│   │   └── dto/
│   ├── llm/           # Integração com LLM
│   │   ├── llm.service.ts
│   │   ├── llm.module.ts
│   │   └── dto/
│   ├── prisma/        # Configuração do banco
│   │   ├── prisma.service.ts
│   │   └── prisma.module.ts
│   └── auth/          # Autenticação (opcional)
├── prisma/            # Schema e migrações
├── test/              # Testes automatizados
└── uploads/           # Armazenamento temporário
```

## Principais Endpoints

### Faturas (/bills)

- `POST /bills/upload` - Upload e processamento individual
- `POST /bills/upload/batch` - Upload e processamento em lote
- `GET /bills` - Listagem com filtros e paginação
- `GET /bills/:id` - Consulta individual de fatura
- `PATCH /bills/:id/reprocess` - Reprocessamento de faturas com falha
- `DELETE /bills/:id` - Remoção de fatura

### Dashboard (/dashboard)

- `GET /dashboard` - Dados gerais consolidados
- `GET /dashboard/energy` - Resultados energéticos
- `GET /dashboard/financial` - Resultados financeiros
- `GET /dashboard/annual` - Análise anual com comparações

## Configuração do Ambiente

### Pré-requisitos

- Node.js (versão 18 ou superior)
- PostgreSQL (versão 12 ou superior)
- Conta OpenAI com acesso à API

### Variáveis de Ambiente

```env
# Banco de Dados
DATABASE_URL="postgresql://usuario:senha@localhost:5432/lumi_energy"

# OpenAI
OPENAI_API_KEY="sua_chave_da_openai"

# Servidor
PORT=3000
NODE_ENV="development"
CORS_ORIGIN="http://localhost:3000"

# API URLs (opcional)
API_URL="http://localhost:3000"
```

### Instalação e Execução

```bash
# Clonar o repositório
git clone <url-do-repositorio>
cd lumi-task-energy

# Instalar dependências
npm install

# Configurar banco de dados
npx prisma generate
npx prisma migrate deploy

# Executar em modo de desenvolvimento
npm run start:dev

# Executar em modo de produção
npm run build
npm run start:prod
```

## Utilização da API

### Upload Individual de Fatura

```bash
curl -X POST http://localhost:3000/bills/upload \
  -F "file=@fatura.pdf" \
  -H "Content-Type: multipart/form-data"
```

### Upload em Lote

```bash
curl -X POST http://localhost:3000/bills/upload/batch \
  -F "files=@fatura1.pdf" \
  -F "files=@fatura2.pdf" \
  -F "files=@fatura3.pdf"
```

### Listagem com Filtros

```bash
# Por cliente específico
GET /bills?customerNumber=7204076116&page=1&limit=10

# Por período
GET /bills?startDate=2024-01-01&endDate=2024-12-31

# Por status
GET /bills?status=COMPLETED
```

### Dados Anuais do Dashboard

```bash
# Ano específico
GET /dashboard/annual?year=2024

# Cliente específico no ano
GET /dashboard/annual?year=2024&customerNumber=7204076116
```

## Estrutura de Resposta da API

### Fatura Individual

```json
{
  "id": "cm123abc...",
  "customerNumber": "7204076116",
  "referenceMonth": "ABR/2024",
  "electricEnergy": {
    "quantity": 50,
    "value": 47.75
  },
  "sceeeEnergy": {
    "quantity": 476,
    "value": 242.63
  },
  "compensatedEnergyGDI": {
    "quantity": 476,
    "value": -231.96
  },
  "publicLightingContrib": 49.43,
  "totalEnergyConsumption": 526,
  "compensatedEnergy": 476,
  "totalValueWithoutGD": 339.81,
  "gdEconomy": 231.96
}
```

### Dashboard Anual

```json
{
  "yearData": {
    "year": 2024,
    "totalEconomy": 1305.55,
    "totalConsumption": 3246,
    "totalCompensation": 2560,
    "economyPercentage": 53.98,
    "billsCount": 7,
    "monthlyBreakdown": [...]
  },
  "comparison": {
    "economyDifference": 450.25,
    "economyGrowthPercentage": 9.38
  },
  "topCustomers": [...],
  "summary": {
    "availableYears": [2024],
    "totalCustomers": 1,
    "averageMonthlyEconomy": 186.51
  }
}
```

## Testes

### Executar Testes Unitários

```bash
npm run test
```

### Executar Testes com Coverage

```bash
npm run test:cov
```

### Executar Testes End-to-End

```bash
npm run test:e2e
```

## Documentação Interativa

A documentação completa da API está disponível via Swagger:

- **Desenvolvimento**: http://localhost:3000/api-docs
- **Produção**: https://api.lumi.com.br/api-docs

## Monitoramento e Logs

### Logs Estruturados

O sistema utiliza logging estruturado com níveis:

- **INFO**: Operações normais e marcos importantes
- **WARN**: Situações que requerem atenção
- **ERROR**: Falhas e exceções com stack trace completo

### Métricas de Performance

- Tempo de processamento por fatura
- Taxa de sucesso/falha das extrações LLM
- Uso de tokens da API OpenAI
- Performance de queries do banco de dados

## Considerações de Segurança

### Validação de Entrada

- Validação rigorosa de tipos de arquivo (apenas PDF)
- Sanitização de parâmetros de consulta
- Limitação de tamanho de arquivos
- Rate limiting para prevenir abuso

### Tratamento de Erros

- Logs detalhados sem exposição de dados sensíveis
- Respostas padronizadas de erro
- Retry automático para falhas temporárias
- Timeouts apropriados para requisições externas

### Processo de Desenvolvimento

1. Criar branch a partir de `main`
2. Implementar funcionalidade com testes
3. Executar suite completa de testes
4. Submeter pull request com descrição detalhada

## Changelog

### v1.0.0 (Atual)

- Implementação inicial da API
- Processamento de faturas via GPT-4o
- Dashboard com métricas consolidadas
- Sistema de upload em lote
- Análise anual com comparações históricas
- Documentação Swagger completa
- Suite de testes automatizados
