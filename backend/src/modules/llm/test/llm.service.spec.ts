import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { BadRequestException } from '@nestjs/common';
import { LlmService } from '../llm.service';
import { LlmExtractionResponseDto } from '../dto/llm-extraction.dto';

describe('LlmService', () => {
  let service: LlmService;
  let configService: ConfigService;

  // Mock data para testes
  const mockExtractedData: LlmExtractionResponseDto = {
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
  };

  const mockConfigService = {
    get: jest.fn((key: string) => {
      if (key === 'OPENAI_API_KEY') return 'test-api-key';
      return undefined;
    }),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        LlmService,
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
      ],
    }).compile();

    service = module.get<LlmService>(LlmService);
    configService = module.get<ConfigService>(ConfigService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('mockExtractBillData', () => {
    it('should return default mock data when no parameters provided', async () => {
      const result = await service.mockExtractBillData();
      
      expect(result).toBeDefined();
      expect(result.customerNumber).toBe('7202210726');
      expect(result.referenceMonth).toBe('SET/2024');
      expect(result.electricEnergy).toBeDefined();
      expect(result.electricEnergy.quantity).toBe(50);
      expect(result.electricEnergy.value).toBe(45.67);
    });

    it('should merge provided mock data with defaults', async () => {
      const customMockData = {
        customerNumber: '1234567890',
        referenceMonth: 'OUT/2024',
      };

      const result = await service.mockExtractBillData(customMockData);
      
      expect(result.customerNumber).toBe('1234567890');
      expect(result.referenceMonth).toBe('OUT/2024');
      expect(result.electricEnergy.quantity).toBe(50); // Should keep default
    });
  });

  describe('validateAndTransformData', () => {
    it('should validate and transform valid data correctly', () => {
      const rawData = {
        customerNumber: '7202210726',
        referenceMonth: 'set/2024', // lowercase to test transformation
        electricEnergy: {
          quantity: '50.5', // string to test conversion
          value: '45.67'
        },
        sceeeEnergy: {
          quantity: 476,
          value: 392.50
        },
        compensatedEnergy: {
          quantity: 526,
          value: 438.17
        },
        publicLightingContrib: 23.45
      };

      // Use reflection to access private method for testing
      const result = (service as any).validateAndTransformData(rawData);

      expect(result.customerNumber).toBe('7202210726');
      expect(result.referenceMonth).toBe('SET/2024'); // Should be uppercase
      expect(result.electricEnergy.quantity).toBe(50.5); // Should be number
      expect(result.electricEnergy.value).toBe(45.67);
    });

    it('should throw error when customer number is missing', () => {
      const invalidData = {
        referenceMonth: 'SET/2024',
        electricEnergy: {
          quantity: 50,
          value: 45.67
        }
      };

      expect(() => {
        (service as any).validateAndTransformData(invalidData);
      }).toThrow(BadRequestException);
    });

    it('should throw error when reference month is missing', () => {
      const invalidData = {
        customerNumber: '7202210726',
        electricEnergy: {
          quantity: 50,
          value: 45.67
        }
      };

      expect(() => {
        (service as any).validateAndTransformData(invalidData);
      }).toThrow(BadRequestException);
    });

    it('should throw error when electric energy data is incomplete', () => {
      const invalidData = {
        customerNumber: '7202210726',
        referenceMonth: 'SET/2024',
        electricEnergy: {
          quantity: 0, // Invalid
          value: 45.67
        }
      };

      expect(() => {
        (service as any).validateAndTransformData(invalidData);
      }).toThrow(BadRequestException);
    });
  });

  describe('buildSystemPrompt', () => {
    it('should build a proper system prompt', () => {
      const prompt = (service as any).buildSystemPrompt();
      
      expect(prompt).toContain('especialista em análise de faturas');
      expect(prompt).toContain('JSON válido');
      expect(prompt).toContain('customerNumber');
      expect(prompt).toContain('referenceMonth');
    });
  });

  describe('buildUserPrompt', () => {
    it('should build a proper user prompt', () => {
      const prompt = (service as any).buildUserPrompt();
      
      expect(prompt).toContain('Analise esta fatura');
      expect(prompt).toContain('Número do Cliente');
      expect(prompt).toContain('Mês de referência');
      expect(prompt).toContain('Energia Elétrica');
    });
  });

  describe('constructor', () => {
    it('should throw error when OPENAI_API_KEY is not configured', () => {
      const badConfigService = {
        get: jest.fn(() => undefined),
      };

      expect(() => {
        new LlmService(badConfigService as any);
      }).toThrow('OPENAI_API_KEY não configurada');
    });
  });
});