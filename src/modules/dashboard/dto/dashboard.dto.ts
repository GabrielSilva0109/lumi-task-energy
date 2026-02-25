import { IsString, IsOptional, IsDateString, IsNumber } from 'class-validator';

export class DashboardFilterDto {
  @IsOptional()
  @IsString()
  customerNumber?: string;

  @IsOptional()
  @IsDateString()
  startDate?: string;

  @IsOptional()
  @IsDateString()
  endDate?: string;
}

export class AnnualFilterDto {
  @IsOptional()
  @IsNumber()
  year?: number;

  @IsOptional()
  @IsString()
  customerNumber?: string;
}

export class EnergyResultsDto {
  totalEnergyConsumption: number; // Total consumo de energia elétrica (kWh)
  totalCompensatedEnergy: number; // Total energia compensada (kWh)
  consumptionVsCompensation: {
    consumption: number;
    compensation: number;
    percentage: number; // Percentual de compensação
  };
  monthlyData?: {
    month: string;
    consumption: number;
    compensation: number;
  }[];
}

export class FinancialResultsDto {
  totalValueWithoutGD: number; // Total valor sem GD (R$)
  totalGdEconomy: number; // Total economia GD (R$)
  economyVsTotal: {
    totalValue: number;
    economy: number;
    economyPercentage: number; // Percentual de economia
  };
  monthlyData?: {
    month: string;
    totalValue: number;
    economy: number;
  }[];
}

export class DashboardSummaryDto {
  totalBills: number;
  processedBills: number;
  failedBills: number;
  pendingBills: number;
  averageProcessingTime?: number;
  lastProcessedAt?: Date;
}

export class DashboardResponseDto {
  summary: DashboardSummaryDto;
  energyResults: EnergyResultsDto;
  financialResults: FinancialResultsDto;
  period: {
    startDate?: string;
    endDate?: string;
    customerNumber?: string;
  };
}

// =========================
// DTOs para Dados Anuais
// =========================

export class AnnualEconomyDto {
  year: number;
  totalEconomy: number; // Economia total em R$
  totalConsumption: number; // Consumo total em kWh
  totalCompensation: number; // Compensação total em kWh
  totalValueWithoutGD: number; // Valor total sem GD em R$
  economyPercentage: number; // Percentual de economia
  billsCount: number; // Quantidade de faturas processadas
  monthlyBreakdown: {
    month: string; // Ex: "JAN/2024"
    consumption: number;
    compensation: number;
    economy: number;
    valueWithoutGD: number;
  }[];
}

export class AnnualComparisonDto {
  currentYear: AnnualEconomyDto;
  previousYear?: AnnualEconomyDto;
  comparison?: {
    economyDifference: number; // Diferença em R$
    economyGrowthPercentage: number; // % de crescimento/redução
    consumptionDifference: number; // Diferença em kWh
    compensationDifference: number; // Diferença em kWh
  };
}

export class TopCustomersDto {
  customerNumber: string;
  totalEconomy: number;
  totalConsumption: number;
  billsCount: number;

}

export class AnnualDashboardDto {
  yearData: AnnualEconomyDto;
  comparison?: AnnualComparisonDto;
  topCustomers?: TopCustomersDto[];
  summary: {
    availableYears: number[];
    totalCustomers: number;
    totalBillsProcessed: number;
    averageMonthlyEconomy: number;
  };
}