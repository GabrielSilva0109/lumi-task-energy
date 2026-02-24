import { IsString, IsOptional, IsDateString } from 'class-validator';

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