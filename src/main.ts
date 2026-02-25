import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Enable CORS
  app.enableCors({
    origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
    credentials: true,
  });

  // Global validation pipe
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: {
        enableImplicitConversion: true,
      },
    }),
  );

  // Swagger configuration
  const config = new DocumentBuilder()
    .setTitle('Lumi Energy Bills API')
    .setDescription(`
      API RESTful para processamento inteligente de faturas de energia elétrica brasileiras.
      
      Funcionalidades principais:
      - Upload e processamento de PDFs via LLM (Large Language Model)
      - Extração automática de dados estruturados das faturas
      - Cálculo de métricas de consumo e economia energética
      - Dashboard com dados consolidados e análises anuais
      - Sistema de filtros e paginação para consultas
      
      Tecnologias: NestJS, Prisma ORM, PostgreSQL, OpenAI GPT-4o, TypeScript
    `)
    .setVersion('1.0.0')
    .addTag('bills', 'Gerenciamento e processamento de faturas de energia elétrica')
    .addTag('dashboard', 'Dados consolidados, métricas e análises para dashboard')
    .addTag('auth', 'Autenticação e autorização (se implementado)')
    .setContact(
      'Equipe Lumi',
      'https://lumi.com.br',
      'contato@lumi.com.br'
    )
    .setLicense('MIT', 'https://opensource.org/licenses/MIT')
    .addServer(process.env.API_URL || 'http://localhost:3000', 'Servidor de Desenvolvimento')
    .addServer('https://api.lumi.com.br', 'Servidor de Produção')
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api-docs', app, document);

  const port = process.env.PORT || 3000;
  await app.listen(port);

  const environment = process.env.NODE_ENV || 'development';
  
  console.log('='.repeat(60));
  console.log('🚀 Lumi Energy Bills API - Servidor Iniciado');
  console.log('='.repeat(60));
  console.log(`🌐 Servidor: http://localhost:${port}`);
  console.log(`📚 Documentação Swagger: http://localhost:${port}/api-docs`);
  console.log(`⚙️  Ambiente: ${environment}`);
  console.log(`🗃️  Banco de Dados: ${process.env.DATABASE_URL ? 'Conectado' : 'Não configurado'}`);
  console.log(`🤖 OpenAI: ${process.env.OPENAI_API_KEY ? 'Configurado' : 'Não configurado'}`);
  console.log('='.repeat(60));
}

bootstrap();