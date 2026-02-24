import { Controller, Get, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiQuery } from '@nestjs/swagger';
import { DashboardService } from './dashboard.service';
import {
  DashboardFilterDto,
  DashboardResponseDto,
  EnergyResultsDto,
  FinancialResultsDto,
} from './dto/dashboard.dto';

@ApiTags('dashboard')
@Controller('dashboard')
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  @Get()
  @ApiOperation({ 
    summary: 'Dados completos do dashboard',
    description: 'Retorna todos os dados consolidados para o dashboard principal'
  })
  @ApiQuery({ name: 'customerNumber', required: false, type: String, description: 'Filtrar por número do cliente' })
  @ApiQuery({ name: 'startDate', required: false, type: String, description: 'Data inicial (ISO 8601)' })
  @ApiQuery({ name: 'endDate', required: false, type: String, description: 'Data final (ISO 8601)' })
  @ApiResponse({
    status: 200,
    description: 'Dados do dashboard retornados com sucesso',
    schema: {
      type: 'object',
      properties: {
        summary: {
          type: 'object',
          properties: {
            totalBills: { type: 'number', example: 150 },
            processedBills: { type: 'number', example: 145 },
            failedBills: { type: 'number', example: 3 },
            pendingBills: { type: 'number', example: 2 },
            averageProcessingTime: { type: 'number', example: 1500.5 },
            lastProcessedAt: { type: 'string', example: '2024-12-19T10:30:00.000Z' }
          }
        },
        energyResults: {
          type: 'object',
          properties: {
            totalEnergyConsumption: { type: 'number', example: 78650 },
            totalCompensatedEnergy: { type: 'number', example: 76234 },
            consumptionVsCompensation: {
              type: 'object',
              properties: {
                consumption: { type: 'number', example: 78650 },
                compensation: { type: 'number', example: 76234 },
                percentage: { type: 'number', example: 96.93 }
              }
            },
            monthlyData: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  month: { type: 'string', example: 'SET/2024' },
                  consumption: { type: 'number', example: 526 },
                  compensation: { type: 'number', example: 520 }
                }
              }
            }
          }
        },
        financialResults: {
          type: 'object',
          properties: {
            totalValueWithoutGD: { type: 'number', example: 65432.10 },
            totalGdEconomy: { type: 'number', example: 62876.45 },
            economyVsTotal: {
              type: 'object',
              properties: {
                totalValue: { type: 'number', example: 65432.10 },
                economy: { type: 'number', example: 62876.45 },
                economyPercentage: { type: 'number', example: 96.08 }
              }
            },
            monthlyData: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  month: { type: 'string', example: 'SET/2024' },
                  totalValue: { type: 'number', example: 461.62 },
                  economy: { type: 'number', example: 438.17 }
                }
              }
            }
          }
        },
        period: {
          type: 'object',
          properties: {
            startDate: { type: 'string', nullable: true },
            endDate: { type: 'string', nullable: true },
            customerNumber: { type: 'string', nullable: true }
          }
        }
      }
    }
  })
  async getDashboard(
    @Query('customerNumber') customerNumber?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ): Promise<DashboardResponseDto> {
    const filters: DashboardFilterDto = {
      customerNumber,
      startDate,
      endDate,
    };

    return this.dashboardService.getDashboardData(filters);
  }

  @Get('energy')
  @ApiOperation({ 
    summary: 'Resultados de energia (kWh)',
    description: 'Retorna dados consolidados de consumo vs energia compensada'
  })
  @ApiQuery({ name: 'customerNumber', required: false, type: String, description: 'Filtrar por número do cliente' })
  @ApiQuery({ name: 'startDate', required: false, type: String, description: 'Data inicial (ISO 8601)' })
  @ApiQuery({ name: 'endDate', required: false, type: String, description: 'Data final (ISO 8601)' })
  @ApiResponse({
    status: 200,
    description: 'Dados de energia retornados com sucesso',
    schema: {
      type: 'object',
      properties: {
        totalEnergyConsumption: { type: 'number', example: 78650, description: 'Total de energia consumida (kWh)' },
        totalCompensatedEnergy: { type: 'number', example: 76234, description: 'Total de energia compensada (kWh)' },
        consumptionVsCompensation: {
          type: 'object',
          description: 'Comparação consumo vs compensação',
          properties: {
            consumption: { type: 'number', example: 78650 },
            compensation: { type: 'number', example: 76234 },
            percentage: { type: 'number', example: 96.93, description: 'Percentual de compensação' }
          }
        },
        monthlyData: {
          type: 'array',
          description: 'Dados mensais para gráficos',
          items: {
            type: 'object',
            properties: {
              month: { type: 'string', example: 'SET/2024' },
              consumption: { type: 'number', example: 526 },
              compensation: { type: 'number', example: 520 }
            }
          }
        }
      }
    }
  })
  async getEnergyResults(
    @Query('customerNumber') customerNumber?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ): Promise<EnergyResultsDto> {
    const filters: DashboardFilterDto = {
      customerNumber,
      startDate,
      endDate,
    };

    return this.dashboardService.getEnergyResults(filters);
  }

  @Get('financial')
  @ApiOperation({ 
    summary: 'Resultados financeiros (R$)',
    description: 'Retorna dados consolidados de valor total vs economia GD'
  })
  @ApiQuery({ name: 'customerNumber', required: false, type: String, description: 'Filtrar por número do cliente' })
  @ApiQuery({ name: 'startDate', required: false, type: String, description: 'Data inicial (ISO 8601)' })
  @ApiQuery({ name: 'endDate', required: false, type: String, description: 'Data final (ISO 8601)' })
  @ApiResponse({
    status: 200,
    description: 'Dados financeiros retornados com sucesso',
    schema: {
      type: 'object',
      properties: {
        totalValueWithoutGD: { type: 'number', example: 65432.10, description: 'Valor total sem GD (R$)' },
        totalGdEconomy: { type: 'number', example: 62876.45, description: 'Total economia GD (R$)' },
        economyVsTotal: {
          type: 'object',
          description: 'Comparação valor total vs economia',
          properties: {
            totalValue: { type: 'number', example: 65432.10 },
            economy: { type: 'number', example: 62876.45 },
            economyPercentage: { type: 'number', example: 96.08, description: 'Percentual de economia' }
          }
        },
        monthlyData: {
          type: 'array',
          description: 'Dados mensais para gráficos',
          items: {
            type: 'object',
            properties: {
              month: { type: 'string', example: 'SET/2024' },
              totalValue: { type: 'number', example: 461.62 },
              economy: { type: 'number', example: 438.17 }
            }
          }
        }
      }
    }
  })
  async getFinancialResults(
    @Query('customerNumber') customerNumber?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ): Promise<FinancialResultsDto> {
    const filters: DashboardFilterDto = {
      customerNumber,
      startDate,
      endDate,
    };

    return this.dashboardService.getFinancialResults(filters);
  }
}