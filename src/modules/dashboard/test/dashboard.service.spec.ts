import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException } from '@nestjs/common';
enum ProcessingStatus {
  PENDING = 'PENDING',
  PROCESSING = 'PROCESSING',
  COMPLETED = 'COMPLETED',
  FAILED = 'FAILED',
}
import { DashboardService } from '../dashboard.service';
import { PrismaService } from '../../prisma/prisma.service';
import { DashboardFilterDto } from '../dto/dashboard.dto';

describe('DashboardService', () => {
  let service: DashboardService;
  let prismaService: PrismaService;

  // Mock data
  const mockEnergyAggregation = {
    _sum: {
      totalEnergyConsumption: 1000,
      compensatedEnergy: 950,
      totalValueWithoutGD: 800.5,
      gdEconomy: 750.25,
    },
  };

  const mockMonthlyData = [
    {
      referenceMonth: 'SET/2024',
      _sum: {
        totalEnergyConsumption: 526,
        compensatedEnergy: 520,
        totalValueWithoutGD: 461.62,
        gdEconomy: 438.17,
      },
    },
    {
      referenceMonth: 'OUT/2024',
      _sum: {
        totalEnergyConsumption: 474,
        compensatedEnergy: 430,
        totalValueWithoutGD: 338.88,
        gdEconomy: 312.08,
      },
    },
  ];

  const mockStatusCounts = [
    { processingStatus: ProcessingStatus.COMPLETED, _count: 145 },
    { processingStatus: ProcessingStatus.FAILED, _count: 3 },
    { processingStatus: ProcessingStatus.PENDING, _count: 2 },
  ];

  const mockPrismaService = {
    energyBill: {
      aggregate: jest.fn(),
      groupBy: jest.fn(),
      count: jest.fn(),
      findFirst: jest.fn(),
    },
    processingLog: {
      aggregate: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DashboardService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
      ],
    }).compile();

    service = module.get<DashboardService>(DashboardService);

    // Reset mocks
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('getDashboardData', () => {
    it('should return complete dashboard data', async () => {
      // Mock all required calls
      mockPrismaService.energyBill.count.mockResolvedValue(150);
      mockPrismaService.energyBill.groupBy.mockResolvedValueOnce(mockStatusCounts);
        // Garante que groupBy sempre retorna array, nunca undefined
        mockPrismaService.energyBill.groupBy.mockResolvedValue([]);
      mockPrismaService.energyBill.findFirst.mockResolvedValue({
        updatedAt: new Date('2024-12-19T10:30:00.000Z'),
      });
      mockPrismaService.processingLog.aggregate.mockResolvedValue({
        _avg: { duration: 1500.5 },
      });
      mockPrismaService.energyBill.aggregate.mockResolvedValue(mockEnergyAggregation);
      mockPrismaService.energyBill.groupBy.mockResolvedValueOnce(mockMonthlyData);

      const filters: DashboardFilterDto = {
        customerNumber: '7202210726',
      };

      const result = await service.getDashboardData(filters);

      expect(result).toBeDefined();
      expect(result.summary).toBeDefined();
      expect(result.energyResults).toBeDefined();
      expect(result.financialResults).toBeDefined();
      expect(result.period.customerNumber).toBe('7202210726');
    });

    it('should handle empty filters', async () => {
      mockPrismaService.energyBill.count.mockResolvedValue(0);
      mockPrismaService.energyBill.groupBy.mockResolvedValue([]);
      mockPrismaService.energyBill.findFirst.mockResolvedValue(null);
      mockPrismaService.processingLog.aggregate.mockResolvedValue({
        _avg: { duration: null },
      });
      mockPrismaService.energyBill.aggregate.mockResolvedValue({
        _sum: {
          totalEnergyConsumption: null,
          compensatedEnergy: null,
          totalValueWithoutGD: null,
          gdEconomy: null,
        },
      });

      const result = await service.getDashboardData();

      expect(result).toBeDefined();
      expect(result.summary.totalBills).toBe(0);
      expect(result.energyResults.totalEnergyConsumption).toBe(0);
    });
  });

  describe('getEnergyResults', () => {
    it('should return energy results with calculations', async () => {
      mockPrismaService.energyBill.aggregate.mockResolvedValue(mockEnergyAggregation);
      mockPrismaService.energyBill.groupBy.mockResolvedValue(mockMonthlyData);

      const result = await service.getEnergyResults();

      expect(result.totalEnergyConsumption).toBe(1000);
      expect(result.totalCompensatedEnergy).toBe(950);
      expect(result.consumptionVsCompensation.percentage).toBe(95); // 950/1000 * 100
      expect(result.monthlyData).toHaveLength(2);
      expect(result.monthlyData[0].month).toBe('SET/2024');
    });

    it('should handle zero consumption correctly', async () => {
      mockPrismaService.energyBill.aggregate.mockResolvedValue({
        _sum: {
          totalEnergyConsumption: 0,
          compensatedEnergy: 100,
        },
      });
      mockPrismaService.energyBill.groupBy.mockResolvedValue([]);

      const result = await service.getEnergyResults();

      expect(result.consumptionVsCompensation.percentage).toBe(0);
    });

    it('should apply filters correctly', async () => {
      const filters: DashboardFilterDto = {
        customerNumber: '7202210726',
        startDate: '2024-01-01',
        endDate: '2024-12-31',
      };

      mockPrismaService.energyBill.aggregate.mockResolvedValue(mockEnergyAggregation);
      mockPrismaService.energyBill.groupBy.mockResolvedValue([]);

      await service.getEnergyResults(filters);

      expect(mockPrismaService.energyBill.aggregate).toHaveBeenCalledWith({
        where: {
          customerNumber: {
            contains: '7202210726',
            mode: 'insensitive',
          },
          createdAt: {
            gte: new Date('2024-01-01'),
            lte: new Date('2024-12-31'),
          },
          processingStatus: ProcessingStatus.COMPLETED,
        },
        _sum: {
          totalEnergyConsumption: true,
          compensatedEnergy: true,
        },
      });
    });
  });

  describe('getFinancialResults', () => {
    it('should return financial results with calculations', async () => {
      mockPrismaService.energyBill.aggregate.mockResolvedValue(mockEnergyAggregation);
      mockPrismaService.energyBill.groupBy.mockResolvedValue(mockMonthlyData);

      const result = await service.getFinancialResults();

      expect(result.totalValueWithoutGD).toBe(800.5);
      expect(result.totalGdEconomy).toBe(750.25);
      expect(result.economyVsTotal.economyPercentage).toBeCloseTo(93.71, 1); // 750.25/800.50 * 100 rounded
        // Garante que groupBy sempre retorna array, nunca undefined
        mockPrismaService.energyBill.groupBy.mockResolvedValue([]);
      expect(result.monthlyData).toHaveLength(2);
    });

    it('should handle zero total value correctly', async () => {
      mockPrismaService.energyBill.aggregate.mockResolvedValue({
        _sum: {
          totalValueWithoutGD: 0,
          gdEconomy: 100,
        },
      });
      mockPrismaService.energyBill.groupBy.mockResolvedValue([]);

      const result = await service.getFinancialResults();

      expect(result.economyVsTotal.economyPercentage).toBe(0);
    });
  });

  describe('buildWhereClause', () => {
    it('should build where clause with customer number filter', () => {
      const filters: DashboardFilterDto = {
        customerNumber: '7202210726',
      };

      const whereClause = (service as any).buildWhereClause(filters);

      expect(whereClause).toEqual({
        customerNumber: {
          contains: '7202210726',
          mode: 'insensitive',
        },
      });
    });

    it('should build where clause with date filters', () => {
      const filters: DashboardFilterDto = {
        startDate: '2024-01-01',
        endDate: '2024-12-31',
      };

      const whereClause = (service as any).buildWhereClause(filters);

      expect(whereClause).toEqual({
        createdAt: {
          gte: new Date('2024-01-01'),
          lte: new Date('2024-12-31'),
        },
      });
    });

    it('should build where clause with all filters', () => {
      const filters: DashboardFilterDto = {
        customerNumber: '7202210726',
        startDate: '2024-01-01',
        endDate: '2024-12-31',
      };

      const whereClause = (service as any).buildWhereClause(filters);

      expect(whereClause).toEqual({
        customerNumber: {
          contains: '7202210726',
          mode: 'insensitive',
        },
        createdAt: {
          gte: new Date('2024-01-01'),
          lte: new Date('2024-12-31'),
        },
      });
    });

    it('should return empty object for no filters', () => {
      const whereClause = (service as any).buildWhereClause({});
      expect(whereClause).toEqual({});
    });
  });

  describe('error handling', () => {
    it('should handle database errors gracefully', async () => {
      mockPrismaService.energyBill.aggregate.mockRejectedValue(new Error('Database error'));

      await expect(service.getEnergyResults()).rejects.toThrow(BadRequestException);
    });

    it('should handle null aggregation results', async () => {
      mockPrismaService.energyBill.aggregate.mockResolvedValue({
        _sum: {
          totalEnergyConsumption: null,
          compensatedEnergy: null,
        },
      });
      mockPrismaService.energyBill.groupBy.mockResolvedValue([]);

      const result = await service.getEnergyResults();

      expect(result.totalEnergyConsumption).toBe(0);
      expect(result.totalCompensatedEnergy).toBe(0);
    });
  });
});