import { IsString, IsNumber, IsOptional, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

export class EnergyItemDto {
  @IsNumber()
  quantity: number; // kWh

  @IsNumber()
  value: number; // R$
}

export class LlmExtractionResponseDto {
  @IsString()
  customerNumber: string; // Número do cliente (ex: 7202210726)

  @IsString()
  referenceMonth: string; // Mês de referência (ex: SET/2024)

  @ValidateNested()
  @Type(() => EnergyItemDto)
  electricEnergy: EnergyItemDto; // Energia Elétrica

  @ValidateNested()
  @Type(() => EnergyItemDto)
  @IsOptional()
  sceeeEnergy?: EnergyItemDto; // Energia SCEEE s/ICMS

  @ValidateNested()
  @Type(() => EnergyItemDto)
  @IsOptional()
  compensatedEnergy?: EnergyItemDto; // Energia compensada GD I

  @IsNumber()
  @IsOptional()
  publicLightingContrib?: number; // Contrib Ilum Publica Municipal (R$)
}

export class ExtractBillDataDto {
  filePath: string;
  fileName: string;
  fileBuffer: Buffer;
}