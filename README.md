# Lumi Energy Bills API

## 🚀 Descrição

API RESTful para processamento automatizado de faturas de energia elétrica utilizando inteligência artificial (LLM). O sistema recebe PDFs de faturas, extrai dados estruturados através de análise multimodal e disponibiliza informações consolidadas através de endpoints para dashboard.

## 📋 Funcionalidades

### ✅ Processamento de Faturas

- **Upload de PDFs**: Recebe faturas de energia em formato PDF
- **Extração Inteligente**: Utiliza GPT-4 Vision para extrair dados dos documentos
- **Validação de Dados**: Verifica integridade e completude das informações extraídas
- **Cálculos Automáticos**: Computa variáveis derivadas (consumo total, economia GD, etc.)

### ✅ API RESTful

- **Endpoints de Upload**: Processamento de faturas com feedback em tempo real
- **Biblioteca de Faturas**: Listagem paginada com filtros avançados
- **Dashboard APIs**: Dados consolidados para visualização

### ✅ Dados Extraídos

- Número do Cliente
- Mês de Referência
- Energia Elétrica (kWh e R$)
- Energia SCEEE s/ICMS (kWh e R$)
- Energia Compensada GD I (kWh e R$)
- Contribuição Iluminação Pública Municipal (R$)

### ✅ Variáveis Calculadas

- **Consumo de Energia Elétrica**: Energia Elétrica + Energia SCEEE s/ICMS
- **Energia Compensada**: Energia Compensada GD I
- **Valor Total sem GD**: Energia Elétrica + Energia SCEEE + Contrib. Ilum. Pública
- **Economia GD**: Valor da Energia Compensada GD I

## 🛠️ Tecnologias Utilizadas

- **Backend**: Node.js + NestJS + TypeScript
- **Banco de Dados**: PostgreSQL + Prisma ORM
- **IA/LLM**: OpenAI GPT-4 Vision (análise multimodal de documentos)
- **Testes**: Jest (unitários) + Supertest (e2e)
- **Documentação**: Swagger/OpenAPI
- **Validação**: Class Validator + Class Transformer

## 🏗️ Arquitetura

```
src/
├── modules/
│   ├── bills/          # Processamento de faturas
│   ├── dashboard/      # Dados consolidades
│   ├── llm/           # Integração com IA
│   └── prisma/        # Configuração do banco
├── main.ts            # Ponto de entrada
└── app.module.ts      # Módulo principal
```

## ⚡ Quick Start

### 1. Instalação

```bash
npm install
```

### 2. Configuração do Ambiente

```bash
cp .env.example .env
# Configure as variáveis no arquivo .env
```

### 3. Banco de Dados

```bash
# Gerar cliente Prisma
npm run prisma:generate

# Aplicar migrations
npm run prisma:migrate

# (Opcional) Visualizar dados
npm run prisma:studio
```

### 4. Executar Aplicação

```bash
# Desenvolvimento
npm run start:dev

# Produção
npm run build
npm run start:prod
```

### 5. Testes

```bash
# Testes unitários
npm run test

# Testes e2e
npm run test:e2e

# Coverage
npm run test:cov
```

## 📊 API Endpoints

### 🔵 Processamento de Faturas

#### Upload e Processamento

```http
POST /bills/upload
Content-Type: multipart/form-data

[file: PDF da fatura]
```

**Response:**

```json
{
  "success": true,
  "message": "Fatura processada com sucesso",
  "billId": "clkj1234567890",
  "processingTime": 1500
}
```

#### Listar Faturas

```http
GET /bills?page=1&limit=20&customerNumber=7202210726&referenceMonth=SET/2024
```

**Response:**

```json
{
  "bills": [...],
  "total": 150,
  "page": 1,
  "limit": 20,
  "totalPages": 8
}
```

#### Buscar Fatura por ID

```http
GET /bills/{id}
```

### 📈 Dashboard APIs

#### Dashboard Completo

```http
GET /dashboard?customerNumber=7202210726&startDate=2024-01-01&endDate=2024-12-31
```

#### Resultados de Energia

```http
GET /dashboard/energy
```

**Response:**

```json
{
  "totalEnergyConsumption": 78650,
  "totalCompensatedEnergy": 76234,
  "consumptionVsCompensation": {
    "consumption": 78650,
    "compensation": 76234,
    "percentage": 96.93
  },
  "monthlyData": [...]
}
```

#### Resultados Financeiros

```http
GET /dashboard/financial
```

**Response:**

```json
{
  "totalValueWithoutGD": 65432.10,
  "totalGdEconomy": 62876.45,
  "economyVsTotal": {
    "totalValue": 65432.10,
    "economy": 62876.45,
    "economyPercentage": 96.08
  },
  "monthlyData": [...]
}
```

## 🔐 Variáveis de Ambiente

```bash
# Aplicação
NODE_ENV=development
PORT=3000

# Banco de Dados
DATABASE_URL="postgresql://username:password@localhost:5432/lumi_energy_bills?schema=public"

# OpenAI
OPENAI_API_KEY=sk-your-openai-api-key-here

# Upload
MAX_FILE_SIZE=10485760  # 10MB
UPLOAD_DIR=uploads

# CORS
CORS_ORIGIN=http://localhost:3000
```

## 🧪 Testes

### Cobertura de Testes

- ✅ **LLM Service**: Extração de dados, validação, mocks
- ✅ **Bills Service**: Upload, processamento, cálculos, filtros
- ✅ **Dashboard Service**: Agregações, estatísticas
- ✅ **E2E Tests**: Fluxo completo da API

### Executar Testes

```bash
# Todos os testes
npm test

# Modo watch
npm run test:watch

# Testes específicos
npm test -- --testPathPattern=llm.service

# E2E
npm run test:e2e
```

## 📚 Documentação da API

A documentação interativa da API está disponível em:

```
http://localhost:3000/api-docs
```

## 🔧 Estrutura do Banco de Dados

### Tabela: energy_bills

- Dados extraídos da fatura (cliente, mês, valores)
- Variáveis calculadas (consumo total, economia)
- Metadados (arquivo, hash, status)

### Tabela: processing_logs

- Auditoria de operações
- Logs de erro e sucesso
- Métricas de performance

## 🎨 Padrão Visual

A interface segue o padrão de cores da Lumi:

- **Principal**: Verde escuro/petróleo (#0F4F4F, #2D5A5A)
- **Destaque**: Verde claro para elementos interativos
- **Layout**: Limpo, moderno e profissional

## 📈 Performance e Escalabilidade

- **Processamento Assíncrono**: Upload não bloqueia a API
- **Consultas Otimizadas**: Índices no banco para filtros frequentes
- **Caching**: Preparado para implementação de cache
- **Logs Estruturados**: Monitoramento e debugging

## 🚀 Deploy

### Docker (Recomendado)

```dockerfile
# Dockerfile incluído no projeto
docker build -t lumi-energy-api .
docker run -p 3000:3000 lumi-energy-api
```

### Plataformas Cloud

- **Render**: Deploy direto do GitHub
- **Vercel**: Para aplicações Node.js
- **Railway**: PostgreSQL + API

## 🤝 Contribuição

1. Clone o repositório
2. Crie sua feature branch (`git checkout -b feature/nova-funcionalidade`)
3. Faça commit das mudanças (`git commit -am 'Adiciona nova funcionalidade'`)
4. Push para a branch (`git push origin feature/nova-funcionalidade`)
5. Abra um Pull Request

## 📄 Licença

Este projeto é privado e desenvolvido para o teste técnico da Lumi.

## 🆘 Suporte

Em caso de dúvidas ou problemas:

- Verifique os logs da aplicação
- Consulte a documentação da API em `/api-docs`
- Execute os testes para validar a instalação
