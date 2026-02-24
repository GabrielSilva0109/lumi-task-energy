-- Inicialização do banco de dados para desenvolvimento
-- Este arquivo é executado automaticamente pelo Docker Compose

-- Criar database principal se não existir
SELECT 'CREATE DATABASE lumi_energy_bills'
WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = 'lumi_energy_bills')\gexec

-- Criar database para testes se não existir
SELECT 'CREATE DATABASE lumi_energy_bills_test'
WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = 'lumi_energy_bills_test')\gexec

-- Conectar ao database principal
\c lumi_energy_bills;

-- Criar extensões úteis
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- Comentários informativos
COMMENT ON DATABASE lumi_energy_bills IS 'Banco de dados principal para a API de faturas de energia Lumi';

-- Conectar ao database de testes
\c lumi_energy_bills_test;

-- Criar extensões no banco de testes
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

COMMENT ON DATABASE lumi_energy_bills_test IS 'Banco de dados para testes automatizados';