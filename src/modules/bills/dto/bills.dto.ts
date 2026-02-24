import { IsString, IsOptional, IsDateString, IsEnum } from 'class-validator';

export enum ProcessingStatus {
  PENDING = 'PENDING',
  PROCESSING = 'PROCESSING',
  COMPLETED = 'COMPLETED',
  FAILED = 'FAILED',
}

export class UploadBillResponseDto {
  id: string;
  customerNumber: string;
  referenceMonth: string;
  originalFileName: string;
  processingStatus: ProcessingStatus;
  createdAt: Date;
  
  totalEnergyConsumption?: number;
  compensatedEnergy?: number;
  totalValueWithoutGD?: number;
  gdEconomy?: number;
}

export class BillFilterDto {
  @IsOptional()
  @IsString()
  customerNumber?: string;

  @IsOptional()
  @IsString()
  referenceMonth?: string;

  @IsOptional()
  @IsDateString()
  startDate?: string;

  @IsOptional()
  @IsDateString()
  endDate?: string;

  @IsOptional()
  @IsEnum(ProcessingStatus)
  status?: ProcessingStatus;
}

export class BillListResponseDto {
  bills: UploadBillResponseDto[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export class ProcessBillResponseDto {
  success: boolean;
  message: string;
  billId: string;
  processingTime?: number;
}