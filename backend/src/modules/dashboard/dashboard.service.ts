import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

import {
  DashboardFilterDto,
  DashboardResponseDto,
  EnergyResultsDto,
  FinancialResultsDto,
  DashboardSummaryDto,
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