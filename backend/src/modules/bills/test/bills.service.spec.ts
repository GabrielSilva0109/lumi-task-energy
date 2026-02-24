import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { ProcessingStatus } from '../dto/bills.dto';
import { BillsService } from '../bills.service';
import { PrismaService } from '../../prisma/prisma.service';
import { LlmService } from '../../llm/llm.service';
import { LlmExtractionResponseDto } from '../../llm/dto/llm-extraction.dto';

describe('BillsService', () => {
  let service: BillsService;
  let prismaService: PrismaService;
  let llmService: LlmService;

  // Mock data
  const mockFile: Express.Multer.File = {
    fieldname: 'file',
    originalname: 'test-bill.pdf',
    encoding: '7bit',
    mimetype: 'application/pdf',
    buffer: Buffer.from('fake pdf content'),
    size: 1024,
    path: '/uploads/test-bill.pdf',
    filename: 'test-bill.pdf',
    destination: '/uploads',
    stream: null,
  };

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

  const mockBillRecord = {
    id: 'test-bill-id',
    customerNumber: '7202210726',
    referenceMonth: 'SET/2024',
    electricEnergyQuantity: 50,
    electricEnergyValue: 45.67,
    sceeeQuantity: 476,
    sceeeValue: 392.50,
    compensatedEnergyQuantity: 526,
    compensatedEnergyValue: 438.17,
    publicLightingContrib: 23.45,
    totalEnergyConsumption: 526,
    compensatedEnergy: 526,
    totalValueWithoutGD: 461.62,
    gdEconomy: 438.17,
    originalFileName: 'test-bill.pdf',
    filePath: '/uploads/test-bill.pdf',
    fileSize: 1024,
    fileHash: 'mock-hash',
    processingStatus: ProcessingStatus.COMPLETED,
    errorMessage: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockPrismaService = {
    energyBill: {
      findFirst: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      findMany: jest.fn(),
      count: jest.fn(),
      findUnique: jest.fn(),
    },
    processingLog: {
      create: jest.fn(),
    },
  };

  const mockLlmService = {
    extractBillData: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BillsService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
        {
          provide: LlmService,
          useValue: mockLlmService,
        },
      ],
    }).compile();

    service = module.get<BillsService>(BillsService);
    prismaService = module.get<PrismaService>(PrismaService);
    llmService = module.get<LlmService>(LlmService);

    // Reset mocks
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('uploadAndProcessBill', () => {
    it('should successfully process a valid PDF bill', async () => {
      mockPrismaService.energyBill.findFirst.mockResolvedValue(null); // No duplicate
      mockPrismaService.energyBill.create.mockResolvedValue({ ...mockBillRecord, id: 'initial-id' });
      mockPrismaService.energyBill.update.mockResolvedValue(mockBillRecord);
      mockPrismaService.processingLog.create.mockResolvedValue({});
      mockLlmService.extractBillData.mockResolvedValue(mockExtractedData);

      const result = await service.uploadAndProcessBill(mockFile);

      expect(result.success).toBe(true);
      expect(result.billId).toBe(mockBillRecord.id);
      expect(result.message).toBe('Fatura processada com sucesso');
      expect(mockLlmService.extractBillData).toHaveBeenCalledWith({
        filePath: mockFile.path,
        fileName: mockFile.originalname,
        fileBuffer: mockFile.buffer,
      });
    });

    it('should throw error if file is duplicate', async () => {
      mockPrismaService.energyBill.findFirst.mockResolvedValue(mockBillRecord);

      await expect(service.uploadAndProcessBill(mockFile)).rejects.toThrow(
        BadRequestException,
      );
      expect(mockPrismaService.energyBill.findFirst).toHaveBeenCalled();
    });

    it('should handle LLM extraction errors and update bill status', async () => {
      const llmError = new Error('LLM extraction failed');
      
      mockPrismaService.energyBill.findFirst.mockResolvedValue(null);
      mockPrismaService.energyBill.create.mockResolvedValue({ ...mockBillRecord, id: 'initial-id' });
      mockPrismaService.energyBill.update.mockResolvedValue({});
      mockPrismaService.processingLog.create.mockResolvedValue({});
      mockLlmService.extractBillData.mockRejectedValue(llmError);

      await expect(service.uploadAndProcessBill(mockFile)).rejects.toThrow(llmError);
      
      expect(mockPrismaService.energyBill.update).toHaveBeenCalledWith({
        where: { id: 'initial-id' },
        data: {
          processingStatus: ProcessingStatus.FAILED,
          errorMessage: llmError.message,
        },
      });
    });
  });

  describe('validateFile', () => {
    it('should throw error if no file provided', () => {
      expect(() => {
        (service as any).validateFile(null);
      }).toThrow(BadRequestException);
    });

    it('should throw error if file is not PDF', () => {
      const nonPdfFile = { ...mockFile, mimetype: 'image/jpeg' };
      
      expect(() => {
        (service as any).validateFile(nonPdfFile);
      }).toThrow('Apenas arquivos PDF são aceitos');
    });

    it('should throw error if file is too large', () => {
      const largeFile = { ...mockFile, size: 20 * 1024 * 1024 }; // 20MB
      
      expect(() => {
        (service as any).validateFile(largeFile);
      }).toThrow('Arquivo muito grande');
    });

    it('should pass validation for valid PDF file', () => {
      expect(() => {
        (service as any).validateFile(mockFile);
      }).not.toThrow();
    });
  });

  describe('calculateDerivedValues', () => {
    it('should calculate derived values correctly', () => {
      const result = (service as any).calculateDerivedValues(mockExtractedData);

      expect(result.totalEnergyConsumption).toBe(526); // 50 + 476
      expect(result.compensatedEnergy).toBe(526);
      expect(result.totalValueWithoutGD).toBe(461.62); // 45.67 + 392.50 + 23.45
      expect(result.gdEconomy).toBe(438.17);
    });

    it('should handle missing optional fields', () => {
      const dataWithoutOptionals = {
        ...mockExtractedData,
        sceeeEnergy: null,
        compensatedEnergy: null,
        publicLightingContrib: null,
      };

      const result = (service as any).calculateDerivedValues(dataWithoutOptionals);

      expect(result.totalEnergyConsumption).toBe(50); // Only electric energy
      expect(result.compensatedEnergy).toBe(0);
      expect(result.totalValueWithoutGD).toBe(45.67); // Only electric energy value
      expect(result.gdEconomy).toBe(0);
    });
  });

  describe('getBills', () => {
    it('should return paginated bills list', async () => {
      const mockBills = [mockBillRecord];
      const totalCount = 1;

      mockPrismaService.energyBill.findMany.mockResolvedValue(mockBills);
      mockPrismaService.energyBill.count.mockResolvedValue(totalCount);

      const result = await service.getBills({}, 1, 20);

      expect(result.bills).toHaveLength(1);
      expect(result.total).toBe(1);
      expect(result.page).toBe(1);
      expect(result.limit).toBe(20);
      expect(result.totalPages).toBe(1);
    });

    it('should apply filters correctly', async () => {
      const filters = {
        customerNumber: '7202210726',
        referenceMonth: 'SET/2024',
      };

      mockPrismaService.energyBill.findMany.mockResolvedValue([]);
      mockPrismaService.energyBill.count.mockResolvedValue(0);

      await service.getBills(filters, 1, 20);

      expect(mockPrismaService.energyBill.findMany).toHaveBeenCalledWith({
        where: {
          customerNumber: {
            contains: '7202210726',
            mode: 'insensitive',
          },
          referenceMonth: {
            contains: 'SET/2024',
            mode: 'insensitive',
          },
        },
        skip: 0,
        take: 20,
        orderBy: { createdAt: 'desc' },
      });
    });
  });

  describe('getBillById', () => {
    it('should return bill when found', async () => {
      mockPrismaService.energyBill.findUnique.mockResolvedValue(mockBillRecord);

      const result = await service.getBillById('test-bill-id');

      expect(result.id).toBe('test-bill-id');
      expect(result.customerNumber).toBe('7202210726');
    });

    it('should throw NotFoundException when bill not found', async () => {
      mockPrismaService.energyBill.findUnique.mockResolvedValue(null);

      await expect(service.getBillById('non-existent-id')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('generateFileHash', () => {
    it('should generate consistent hash for same buffer', () => {
      const buffer = Buffer.from('test content');
      
      const hash1 = (service as any).generateFileHash(buffer);
      const hash2 = (service as any).generateFileHash(buffer);

      expect(hash1).toBe(hash2);
      expect(hash1).toHaveLength(32); // MD5 hash length
    });

    it('should generate different hashes for different buffers', () => {
      const buffer1 = Buffer.from('test content 1');
      const buffer2 = Buffer.from('test content 2');
      
      const hash1 = (service as any).generateFileHash(buffer1);
      const hash2 = (service as any).generateFileHash(buffer2);

      expect(hash1).not.toBe(hash2);
    });
  });
});