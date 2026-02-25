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
  
  // Campos extraídos do PDF (conforme especificação do teste)
  electricEnergy: {
    quantity: number; // kWh
    value: number;    // R$
  };
  
  sceeeEnergy?: {
    quantity: number; // kWh
    value: number;    // R$
  } | null;
  
  compensatedEnergyGDI?: {
    quantity: number; // kWh  
    value: number;    // R$
  } | null;
  
  publicLightingContrib?: number; // R$
  
  // Campos calculados (conforme especificação do teste)
  totalEnergyConsumption: number;  // Consumo de Energia Elétrica (kWh)
  compensatedEnergy: number;       // Energia Compensada (kWh)
  totalValueWithoutGD: number;     // Valor Total sem GD (R$)
  gdEconomy: number;               // Economia GD (R$)
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