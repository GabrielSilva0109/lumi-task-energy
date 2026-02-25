import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

import {
  DashboardFilterDto,
  DashboardResponseDto,
  EnergyResultsDto,
  FinancialResultsDto,
  DashboardSummaryDto,
  AnnualFilterDto,
  AnnualDashboardDto,
  AnnualEconomyDto,
  AnnualComparisonDto,
  TopCustomersDto,
} from './dto/dashboard.dto';
import { ProcessingStatus } from '../bills/dto/bills.dto';

@Injectable()
export class DashboardService {
  private readonly logger = new Logger(DashboardService.name);

  constructor(private readonly prisma: PrismaService) {}

  async getDashboardData(filters: DashboardFilterDto = {}): Promise<DashboardResponseDto> {
    try {
      this.logger.log('Gerando dados do dashboard...');

      // Construir filtros base
      const whereClause = this.buildWhereClause(filters);

      // Buscar dados em paralelo para otimizar performance
      const [summary, energyResults, financialResults] = await Promise.all([
        this.getDashboardSummary(whereClause),
        this.getEnergyResults(whereClause),
        this.getFinancialResults(whereClause),
      ]);

      return {
        summary,
        energyResults,
        financialResults,
        period: {
          startDate: filters.startDate,
          endDate: filters.endDate,
          customerNumber: filters.customerNumber,
        },
      };

    } catch (error) {
      this.logger.error(`Erro ao gerar dashboard: ${error.message}`, error.stack);
      throw new BadRequestException(`Erro na geração do dashboard: ${error.message}`);
    }
  }

  async getEnergyResults(filters: DashboardFilterDto = {}): Promise<EnergyResultsDto> {
    try {
      const whereClause = this.buildWhereClause(filters);

      // Buscar dados agregados de energia
      const energyAggregation = await this.prisma.energyBill.aggregate({
        where: {
          ...whereClause,
          processingStatus: ProcessingStatus.COMPLETED,
        },
        _sum: {
          totalEnergyConsumption: true,
          compensatedEnergy: true,
        },
      });

      // Buscar dados mensais para gráficos
      const monthlyEnergyData = await this.prisma.energyBill.groupBy({
        by: ['referenceMonth'],
        where: {
          ...whereClause,
          processingStatus: ProcessingStatus.COMPLETED,
        },
        _sum: {
          totalEnergyConsumption: true,
          compensatedEnergy: true,
        },
        orderBy: {
          referenceMonth: 'asc',
        },
      });

      const totalConsumption = energyAggregation._sum.totalEnergyConsumption || 0;
      const totalCompensation = energyAggregation._sum.compensatedEnergy || 0;

      const consumptionPercentage = totalConsumption > 0 
        ? Math.round((totalCompensation / totalConsumption) * 100 * 100) / 100 
        : 0;

      return {
        totalEnergyConsumption: totalConsumption,
        totalCompensatedEnergy: totalCompensation,
        consumptionVsCompensation: {
          consumption: totalConsumption,
          compensation: totalCompensation,
          percentage: consumptionPercentage,
        },
        monthlyData: monthlyEnergyData.map(item => ({
          month: item.referenceMonth,
          consumption: item._sum.totalEnergyConsumption || 0,
          compensation: item._sum.compensatedEnergy || 0,
        })),
      };

    } catch (error) {
      this.logger.error(`Erro ao buscar dados de energia: ${error.message}`, error.stack);
      throw new BadRequestException(`Erro nos dados de energia: ${error.message}`);
    }
  }

  async getFinancialResults(filters: DashboardFilterDto = {}): Promise<FinancialResultsDto> {
    try {
      const whereClause = this.buildWhereClause(filters);

      // Buscar dados agregados financeiros
      const financialAggregation = await this.prisma.energyBill.aggregate({
        where: {
          ...whereClause,
          processingStatus: ProcessingStatus.COMPLETED,
        },
        _sum: {
          totalValueWithoutGD: true,
          gdEconomy: true,
        },
      });

      // Buscar dados mensais para gráficos
      const monthlyFinancialData = await this.prisma.energyBill.groupBy({
        by: ['referenceMonth'],
        where: {
          ...whereClause,
          processingStatus: ProcessingStatus.COMPLETED,
        },
        _sum: {
          totalValueWithoutGD: true,
          gdEconomy: true,
        },
        orderBy: {
          referenceMonth: 'asc',
        },
      });

      const totalValue = financialAggregation._sum.totalValueWithoutGD || 0;
      const totalEconomy = financialAggregation._sum.gdEconomy || 0;

      const economyPercentage = totalValue > 0 
        ? Math.round((totalEconomy / totalValue) * 100 * 100) / 100 
        : 0;

      return {
        totalValueWithoutGD: totalValue,
        totalGdEconomy: totalEconomy,
        economyVsTotal: {
          totalValue,
          economy: totalEconomy,
          economyPercentage,
        },
        monthlyData: monthlyFinancialData.map(item => ({
          month: item.referenceMonth,
          totalValue: item._sum.totalValueWithoutGD || 0,
          economy: item._sum.gdEconomy || 0,
        })),
      };

    } catch (error) {
      this.logger.error(`Erro ao buscar dados financeiros: ${error.message}`, error.stack);
      throw new BadRequestException(`Erro nos dados financeiros: ${error.message}`);
    }
  }

  private async getDashboardSummary(whereClause: any): Promise<DashboardSummaryDto> {
    try {
      // Contar bills por status
      const [totalBills, statusCounts, lastProcessed] = await Promise.all([
        this.prisma.energyBill.count({ where: whereClause }),
        this.prisma.energyBill.groupBy({
          by: ['processingStatus'],
          where: whereClause,
          _count: true,
        }),
        this.prisma.energyBill.findFirst({
          where: {
            ...whereClause,
            processingStatus: ProcessingStatus.COMPLETED,
          },
          orderBy: { updatedAt: 'desc' },
          select: { updatedAt: true },
        }),
      ]);

      // Agregação de tempo médio de processamento dos logs
      const avgProcessingTime = await this.prisma.processingLog.aggregate({
        where: {
          operation: 'processing_completed',
          status: 'success',
          duration: { not: null },
        },
        _avg: {
          duration: true,
        },
      });

      // Contar por status
      const processedBills = statusCounts.find(s => s.processingStatus === ProcessingStatus.COMPLETED)?._count || 0;
      const failedBills = statusCounts.find(s => s.processingStatus === ProcessingStatus.FAILED)?._count || 0;
      const pendingBills = statusCounts.find(s => s.processingStatus === ProcessingStatus.PROCESSING || s.processingStatus === ProcessingStatus.PENDING)?._count || 0;

      return {
        totalBills,
        processedBills,
        failedBills,
        pendingBills,
        averageProcessingTime: avgProcessingTime._avg.duration || undefined,
        lastProcessedAt: lastProcessed?.updatedAt,
      };

    } catch (error) {
      this.logger.error(`Erro ao gerar resumo do dashboard: ${error.message}`, error.stack);
      throw new BadRequestException(`Erro no resumo: ${error.message}`);
    }
  }
  // =========================
  // DADOS ANUAIS
  // =========================

  async getAnnualData(filters: AnnualFilterDto = {}): Promise<AnnualDashboardDto> {
    try {
      const year = filters.year || new Date().getFullYear();
      this.logger.log(`Gerando dados anuais para o ano ${year}...`);

      // Buscar dados do ano atual
      const yearData = await this.getYearEconomyData(year, filters.customerNumber);
      
      // Buscar dados do ano anterior para comparação
      const previousYearData = await this.getYearEconomyData(year - 1, filters.customerNumber);
      
      // Calcular comparação
      const comparison = this.calculateYearComparison(yearData, previousYearData);

      // Buscar top customers (sempre, mesmo com poucos clientes)
      const topCustomers = await this.getTopCustomersByEconomy(year, 5, filters.customerNumber);

      // Buscar dados de resumo
      const summary = await this.getAnnualSummary(year, filters.customerNumber);

      return {
        yearData,
        comparison,
        topCustomers,
        summary,
      };

    } catch (error) {
      this.logger.error(`Erro ao gerar dados anuais: ${error.message}`, error.stack);
      throw new BadRequestException(`Erro na geração dos dados anuais: ${error.message}`);
    }
  }

  private async getYearEconomyData(year: number, customerNumber?: string): Promise<AnnualEconomyDto> {
    const whereClause: any = {
      processingStatus: ProcessingStatus.COMPLETED,
      referenceMonth: {
        contains: year.toString()
      }
    };

    if (customerNumber) {
      whereClause.customerNumber = {
        contains: customerNumber,
        mode: 'insensitive'
      };
    }

    // Dados agregados do ano
    const yearAggregation = await this.prisma.energyBill.aggregate({
      where: whereClause,
      _sum: {
        totalEnergyConsumption: true,
        compensatedEnergy: true,
        totalValueWithoutGD: true,
        gdEconomy: true,
      },
      _count: true,
    });

    // Dados mensais
    const monthlyData = await this.prisma.energyBill.groupBy({
      by: ['referenceMonth'],
      where: whereClause,
      _sum: {
        totalEnergyConsumption: true,
        compensatedEnergy: true,
        totalValueWithoutGD: true,
        gdEconomy: true,
      },
      orderBy: {
        referenceMonth: 'asc',
      },
    });

    const totalConsumption = yearAggregation._sum.totalEnergyConsumption || 0;
    const totalCompensation = yearAggregation._sum.compensatedEnergy || 0;
    const totalValueWithoutGD = yearAggregation._sum.totalValueWithoutGD || 0;
    const totalEconomy = Math.abs(yearAggregation._sum.gdEconomy || 0);
    const economyPercentage = totalValueWithoutGD > 0 
      ? Math.round((totalEconomy / totalValueWithoutGD) * 100 * 100) / 100 
      : 0;

    return {
      year,
      totalEconomy,
      totalConsumption,
      totalCompensation,
      totalValueWithoutGD,
      economyPercentage,
      billsCount: yearAggregation._count,
      monthlyBreakdown: monthlyData.map(item => ({
        month: item.referenceMonth,
        consumption: item._sum.totalEnergyConsumption || 0,
        compensation: item._sum.compensatedEnergy || 0,
        economy: Math.abs(item._sum.gdEconomy || 0),
        valueWithoutGD: item._sum.totalValueWithoutGD || 0,
      })),
    };
  }

  private calculateYearComparison(currentYear: AnnualEconomyDto, previousYear: AnnualEconomyDto): AnnualComparisonDto {
    if (!previousYear || previousYear.billsCount === 0) {
      return {
        currentYear,
        previousYear,
      };
    }

    const economyDifference = currentYear.totalEconomy - previousYear.totalEconomy;
    const economyGrowthPercentage = previousYear.totalEconomy > 0
      ? Math.round((economyDifference / previousYear.totalEconomy) * 100 * 100) / 100
      : 0;

    const consumptionDifference = currentYear.totalConsumption - previousYear.totalConsumption;
    const compensationDifference = currentYear.totalCompensation - previousYear.totalCompensation;

    return {
      currentYear,
      previousYear,
      comparison: {
        economyDifference,
        economyGrowthPercentage,
        consumptionDifference,
        compensationDifference,
      },
    };
  }

  private async getTopCustomersByEconomy(year: number, limit: number = 5, customerFilter?: string): Promise<TopCustomersDto[]> {
    const whereClause: any = {
      processingStatus: ProcessingStatus.COMPLETED,
      referenceMonth: {
        contains: year.toString()
      }
    };

    // Se tem filtro de cliente, aplicar
    if (customerFilter) {
      whereClause.customerNumber = {
        contains: customerFilter,
        mode: 'insensitive'
      };
    }

    const topCustomers = await this.prisma.energyBill.groupBy({
      by: ['customerNumber'],
      where: whereClause,
      _sum: {
        totalEnergyConsumption: true,
        gdEconomy: true,
      },
      _count: true,
      orderBy: {
        _sum: {
          gdEconomy: 'asc' // Ordenar pelo maior valor absoluto de economia
        }
      },
      take: limit,
    });

    return topCustomers.map(customer => ({
      customerNumber: customer.customerNumber,
      totalEconomy: Math.abs(customer._sum.gdEconomy || 0),
      totalConsumption: customer._sum.totalEnergyConsumption || 0,
      billsCount: customer._count,
    }));
  }

  private async getAnnualSummary(year: number, customerNumber?: string) {
    // Anos disponíveis
    const yearsResult = await this.prisma.energyBill.findMany({
      where: {
        processingStatus: ProcessingStatus.COMPLETED,
        ...(customerNumber && {
          customerNumber: {
            contains: customerNumber,
            mode: 'insensitive'
          }
        })
      },
      select: { referenceMonth: true },
      distinct: ['referenceMonth'],
    });

    const availableYears = Array.from(new Set(
      yearsResult
        .map(bill => bill.referenceMonth.split('/')[1])
        .filter(y => y && !isNaN(parseInt(y)))
        .map(y => parseInt(y))
    )).sort((a, b) => b - a);

    // Clientes únicos do ano
    const customersCount = await this.prisma.energyBill.findMany({
      where: {
        processingStatus: ProcessingStatus.COMPLETED,
        referenceMonth: {
          contains: year.toString()
        },
        ...(customerNumber && {
          customerNumber: {
            contains: customerNumber,
            mode: 'insensitive'
          }
        })
      },
      select: { customerNumber: true },
      distinct: ['customerNumber'],
    });

    // Total de faturas processadas do ano
    const totalBills = await this.prisma.energyBill.count({
      where: {
        processingStatus: ProcessingStatus.COMPLETED,
        referenceMonth: {
          contains: year.toString()
        },
        ...(customerNumber && {
          customerNumber: {
            contains: customerNumber,
            mode: 'insensitive'
          }
        })
      },
    });

    // Economia média mensal
    const yearEconomyData = await this.prisma.energyBill.aggregate({
      where: {
        processingStatus: ProcessingStatus.COMPLETED,
        referenceMonth: {
          contains: year.toString()
        },
        ...(customerNumber && {
          customerNumber: {
            contains: customerNumber,
            mode: 'insensitive'
          }
        })
      },
      _sum: {
        gdEconomy: true,
      },
    });

    const totalYearEconomy = Math.abs(yearEconomyData._sum.gdEconomy || 0);
    const averageMonthlyEconomy = totalBills > 0 ? totalYearEconomy / Math.min(totalBills, 12) : 0;

    return {
      availableYears,
      totalCustomers: customersCount.length,
      totalBillsProcessed: totalBills,
      averageMonthlyEconomy: Math.round(averageMonthlyEconomy * 100) / 100,
    };
  }
  private buildWhereClause(filters: DashboardFilterDto): any {
    const where: any = {};

    if (filters.customerNumber) {
      where.customerNumber = {
        contains: filters.customerNumber,
        mode: 'insensitive',
      };
    }

    if (filters.startDate || filters.endDate) {
      where.createdAt = {};
      if (filters.startDate) {
        where.createdAt.gte = new Date(filters.startDate);
      }
      if (filters.endDate) {
        where.createdAt.lte = new Date(filters.endDate);
      }
    }

    return where;
  }
}