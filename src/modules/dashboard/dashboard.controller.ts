import { Controller, Get, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiQuery } from '@nestjs/swagger';
import { DashboardService } from './dashboard.service';
import {
  DashboardFilterDto,
  DashboardResponseDto,
  EnergyResultsDto,
  FinancialResultsDto,
  AnnualFilterDto,
  AnnualDashboardDto,
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

  @Get('annual')
  @ApiOperation({ 
    summary: 'Dados de economia anual',
    description: 'Retorna dados consolidados de economia por ano com comparações e rankings'
  })
  @ApiQuery({ name: 'year', required: false, type: Number, description: 'Ano para análise (padrão: ano atual)' })
  @ApiQuery({ name: 'customerNumber', required: false, type: String, description: 'Filtrar por número do cliente específico' })
  @ApiResponse({
    status: 200,
    description: 'Dados anuais retornados com sucesso',
    schema: {
      type: 'object',
      properties: {
        yearData: {
          type: 'object',
          properties: {
            year: { type: 'number', example: 2024 },
            totalEconomy: { type: 'number', example: 5250.75, description: 'Economia total em R$' },
            totalConsumption: { type: 'number', example: 12500, description: 'Consumo total em kWh' },
            totalCompensation: { type: 'number', example: 11800, description: 'Compensação total em kWh' },
            totalValueWithoutGD: { type: 'number', example: 8750.50, description: 'Valor total sem GD em R$' },
            economyPercentage: { type: 'number', example: 60.01, description: 'Percentual de economia' },
            billsCount: { type: 'number', example: 48, description: 'Faturas processadas' },
            monthlyBreakdown: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  month: { type: 'string', example: 'JAN/2024' },
                  consumption: { type: 'number', example: 520 },
                  compensation: { type: 'number', example: 490 },
                  economy: { type: 'number', example: 425.80 },
                  valueWithoutGD: { type: 'number', example: 680.90 }
                }
              }
            }
          }
        },
        comparison: {
          type: 'object',
          nullable: true,
          properties: {
            currentYear: { type: 'object' },
            previousYear: { type: 'object', nullable: true },
            comparison: {
              type: 'object',
              nullable: true,
              properties: {
                economyDifference: { type: 'number', example: 450.25, description: 'Diferença de economia em R$' },
                economyGrowthPercentage: { type: 'number', example: 9.38, description: '% crescimento da economia' },
                consumptionDifference: { type: 'number', example: 250, description: 'Diferença consumo em kWh' },
                compensationDifference: { type: 'number', example: 180, description: 'Diferença compensação em kWh' }
              }
            }
          }
        },
        topCustomers: {
          type: 'array',
          nullable: true,
          description: 'Top 5 clientes por economia (apenas quando não filtrado)',
          items: {
            type: 'object',
            properties: {
              customerNumber: { type: 'string', example: '7204076116' },
              totalEconomy: { type: 'number', example: 1250.80 },
              totalConsumption: { type: 'number', example: 2800 },
              billsCount: { type: 'number', example: 12 }
            }
          }
        },
        summary: {
          type: 'object',
          properties: {
            availableYears: { 
              type: 'array', 
              items: { type: 'number' }, 
              example: [2024, 2023, 2022] 
            },
            totalCustomers: { type: 'number', example: 150 },
            totalBillsProcessed: { type: 'number', example: 1200 },
            averageMonthlyEconomy: { type: 'number', example: 437.56 }
          }
        }
      }
    }
  })
  async getAnnualData(
    @Query('year') year?: number,
    @Query('customerNumber') customerNumber?: string,
  ): Promise<AnnualDashboardDto> {
    const filters: AnnualFilterDto = {
      year,
      customerNumber,
    };

    return this.dashboardService.getAnnualData(filters);
  }
}