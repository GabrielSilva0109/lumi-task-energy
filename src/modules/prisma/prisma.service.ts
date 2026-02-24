import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  constructor() {
    super({
      log: ['query', 'info', 'warn', 'error'],
    });
  }

  async onModuleInit() {
    await this.$connect();
    console.log('Database connected successfully');
  }

  async onModuleDestroy() {
    await this.$disconnect();
    console.log('Database disconnected');
  }

  async cleanDatabase() {
    // Útil para testes - remove todos os dados
    if (process.env.NODE_ENV === 'test') {
      const modelNames = Object.keys(this).filter(
        (key) => !key.startsWith('_') && !key.startsWith('$'),
      );

      return Promise.all(
        modelNames.map((modelName) => {
          const model = (this as any)[modelName];
          if (model && typeof model.deleteMany === 'function') {
            return model.deleteMany();
          }
        }),
      );
    }
  }
}