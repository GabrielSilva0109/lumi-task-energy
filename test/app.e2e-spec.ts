import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from './../src/app.module';
import { PrismaService } from '../src/modules/prisma/prisma.service';
import { LlmService } from '../src/modules/llm/llm.service';
import { ConfigService } from '@nestjs/config';

describe('Energy Bills API (e2e)', () => {
  let app: INestApplication;
  let prismaService: PrismaService;
  let llmService: LlmService;

  // Mock LLM Service for e2e tests
  const mockLlmService = {
    extractBillData: jest.fn().mockResolvedValue({
      customerNumber: '7202210726',
      referenceMonth: 'SET/2024',
      electricEnergy: {
        quantity: 50,
        value: 45.67,
      },
      sceeeEnergy: {
        quantity: 476,
        value: 392.50,
      },
      compensatedEnergy: {
        quantity: 526,
        value: 438.17,
      },
      publicLightingContrib: 23.45,
    }),
    mockExtractBillData: jest.fn(),
  };

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(LlmService)
      .useValue(mockLlmService)
      .overrideProvider(ConfigService)
      .useValue({
        get: jest.fn((key: string) => {
          const config = {
            NODE_ENV: 'test',
            DATABASE_URL: 'postgresql://test:test@localhost:5432/test_db',
            OPENAI_API_KEY: 'test-key',
            MAX_FILE_SIZE: '10485760',
            UPLOAD_DIR: './test-uploads',
          };
          return config[key];
        }),
      })
      .compile();

    app = moduleFixture.createNestApplication();
    prismaService = moduleFixture.get<PrismaService>(PrismaService);
    llmService = moduleFixture.get<LlmService>(LlmService);

    await app.init();

    // Clean database before each test
    await prismaService.cleanDatabase();
  });

  afterEach(async () => {
    await prismaService.cleanDatabase();
    await app.close();
  });

  describe('/ (GET)', () => {
    it('should return API info', () => {
      return request(app.getHttpServer())
        .get('/')
        .expect(200)
        .expect((res) => {
          expect(res.body.message).toBe('Lumi Energy Bills API is running!');
          expect(res.body.version).toBeDefined();
          expect(res.body.timestamp).toBeDefined();
        });
    });
  });

  describe('/health (GET)', () => {
    it('should return health status', () => {
      return request(app.getHttpServer())
        .get('/health')
        .expect(200)
        .expect((res) => {
          expect(res.body.status).toBe('ok');
          expect(res.body.uptime).toBeDefined();
          expect(res.body.timestamp).toBeDefined();
        });
    });
  });

  describe('/bills (POST)', () => {
    it('should reject non-PDF files', () => {
      return request(app.getHttpServer())
        .post('/bills/upload')
        .attach('file', Buffer.from('fake content'), 'test.txt')
        .expect(400);
    });

    it('should process PDF file successfully', () => {
      const pdfBuffer = Buffer.from('%PDF-1.4 fake pdf content');
      
      return request(app.getHttpServer())
        .post('/bills/upload')
        .attach('file', pdfBuffer, 'test-bill.pdf')
        .expect(200)
        .expect((res) => {
          expect(res.body.success).toBe(true);
          expect(res.body.billId).toBeDefined();
          expect(res.body.message).toBe('Fatura processada com sucesso');
        });
    });
  });

  describe('/bills (GET)', () => {
    it('should return empty list initially', () => {
      return request(app.getHttpServer())
        .get('/bills')
        .expect(200)
        .expect((res) => {
          expect(res.body.bills).toEqual([]);
          expect(res.body.total).toBe(0);
          expect(res.body.page).toBe(1);
          expect(res.body.totalPages).toBe(0);
        });
    });

    it('should support pagination parameters', () => {
      return request(app.getHttpServer())
        .get('/bills?page=2&limit=10')
        .expect(200)
        .expect((res) => {
          expect(res.body.page).toBe(2);
          expect(res.body.limit).toBe(10);
        });
    });

    it('should support filtering by customer number', () => {
      return request(app.getHttpServer())
        .get('/bills?customerNumber=7202210726')
        .expect(200);
    });
  });

  describe('/dashboard (GET)', () => {
    it('should return dashboard data with empty results', () => {
      return request(app.getHttpServer())
        .get('/dashboard')
        .expect(200)
        .expect((res) => {
          expect(res.body.summary).toBeDefined();
          expect(res.body.energyResults).toBeDefined();
          expect(res.body.financialResults).toBeDefined();
          expect(res.body.period).toBeDefined();

          // Empty database should return zero values
          expect(res.body.summary.totalBills).toBe(0);
          expect(res.body.energyResults.totalEnergyConsumption).toBe(0);
          expect(res.body.financialResults.totalValueWithoutGD).toBe(0);
        });
    });

    it('should support filtering by customer number', () => {
      return request(app.getHttpServer())
        .get('/dashboard?customerNumber=7202210726')
        .expect(200)
        .expect((res) => {
          expect(res.body.period.customerNumber).toBe('7202210726');
        });
    });

    it('should support date range filtering', () => {
      return request(app.getHttpServer())
        .get('/dashboard?startDate=2024-01-01&endDate=2024-12-31')
        .expect(200)
        .expect((res) => {
          expect(res.body.period.startDate).toBe('2024-01-01');
          expect(res.body.period.endDate).toBe('2024-12-31');
        });
    });
  });

  describe('/dashboard/energy (GET)', () => {
    it('should return energy results', () => {
      return request(app.getHttpServer())
        .get('/dashboard/energy')
        .expect(200)
        .expect((res) => {
          expect(res.body.totalEnergyConsumption).toBeDefined();
          expect(res.body.totalCompensatedEnergy).toBeDefined();
          expect(res.body.consumptionVsCompensation).toBeDefined();
          expect(res.body.monthlyData).toBeDefined();
        });
    });
  });

  describe('/dashboard/financial (GET)', () => {
    it('should return financial results', () => {
      return request(app.getHttpServer())
        .get('/dashboard/financial')
        .expect(200)
        .expect((res) => {
          expect(res.body.totalValueWithoutGD).toBeDefined();
          expect(res.body.totalGdEconomy).toBeDefined();
          expect(res.body.economyVsTotal).toBeDefined();
          expect(res.body.monthlyData).toBeDefined();
        });
    });
  });

  describe('Error handling', () => {
    it('should return 404 for non-existent bill', () => {
      return request(app.getHttpServer())
        .get('/bills/non-existent-id')
        .expect(404);
    });

    it('should validate required fields in file upload', () => {
      return request(app.getHttpServer())
        .post('/bills/upload')
        .expect(400);
    });
  });

  describe('API Documentation', () => {
    it('should serve Swagger documentation', () => {
      return request(app.getHttpServer())
        .get('/api-docs')
        .expect(200);
    });

    it('should serve Swagger JSON', () => {
      return request(app.getHttpServer())
        .get('/api-docs-json')
        .expect(200);
    });
  });
});