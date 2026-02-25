import { Injectable, Logger, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { LlmService } from '../llm/llm.service';
import { 
  UploadBillResponseDto, 
  BillFilterDto, 
  BillListResponseDto,
  ProcessBillResponseDto, 
  ProcessingStatus
} from './dto/bills.dto';
import { LlmExtractionResponseDto } from '../llm/dto/llm-extraction.dto';
import { createHash } from 'node:crypto';

@Injectable()
export class BillsService {
    async reprocessBill(id: string): Promise<ProcessBillResponseDto> {
      this.logger.log(`[REPROCESS] Tentando reprocessar fatura ${id}`);
      const bill = await this.prisma.energyBill.findUnique({ where: { id } });
      if (!bill) {
        throw new NotFoundException('Fatura não encontrada');
      }
      if (bill.processingStatus !== ProcessingStatus.FAILED) {
        throw new BadRequestException('Só é possível reprocessar faturas com status FAILED');
      }
      // Simular arquivo para reprocessar
      const fakeFile: Express.Multer.File = {
        originalname: bill.originalFileName,
        buffer: await this.getFileBuffer(bill.filePath),
        path: bill.filePath,
        size: bill.fileSize,
        mimetype: 'application/pdf',
        fieldname: 'file',
        encoding: '7bit',
        stream: null,
        destination: '',
        filename: '',
      };
      return this.uploadAndProcessBill(fakeFile);
    }

    private async getFileBuffer(filePath: string): Promise<Buffer> {
      const fs = await import('node:fs/promises');
      try {
        return await fs.readFile(filePath);
      } catch (err) {
        this.logger.error(`[REPROCESS] Erro ao ler arquivo salvo: ${err.message}`);
        throw new BadRequestException('Não foi possível ler o arquivo salvo para reprocessamento.');
      }
    }
  private readonly logger = new Logger(BillsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly llmService: LlmService,
  ) {}

  async uploadAndProcessBill(
    file: Express.Multer.File,
  ): Promise<ProcessBillResponseDto> {
    const startTime = Date.now();
    
    this.logger.log('Chamou BillsService.getBills');
    try {
      this.logger.log(`[UPLOAD] Iniciando upload e processamento do arquivo: ${file.originalname}`);

      // Validar arquivo
      try {
        this.validateFile(file);
      } catch (validationError) {
        this.logger.error(`[UPLOAD] Falha na validação do arquivo: ${validationError.message}`);
        throw validationError;
      }

      // Criar hash do arquivo para evitar duplicatas
      const fileHash = this.generateFileHash(file.buffer);

      // Verificar se já existe uma fatura com este hash
      const existingBill = await this.prisma.energyBill.findFirst({
        where: { fileHash },
      });

      if (existingBill) {
        this.logger.warn(`[UPLOAD] Fatura duplicada detectada para hash: ${fileHash}`);
        throw new BadRequestException('Esta fatura já foi processada anteriormente');
      }

      // Criar registro inicial no banco
      let initialBill;
      try {
        initialBill = await this.prisma.energyBill.create({
          data: {
            customerNumber: 'PROCESSING',
            referenceMonth: 'PROCESSING',
            electricEnergyQuantity: 0,
            electricEnergyValue: 0,
            totalEnergyConsumption: 0,
            totalValueWithoutGD: 0,
            originalFileName: file.originalname,
            filePath: file.path,
            fileSize: file.size,
            fileHash,
            processingStatus: ProcessingStatus.PROCESSING,
          },
        });
      } catch (dbCreateError) {
        this.logger.error(`[UPLOAD] Erro ao criar registro inicial no banco: ${dbCreateError.message}`);
        throw dbCreateError;
      }

      // Log do início do processamento
      await this.createProcessingLog(
        initialBill.id,
        'upload_started',
        'success',
        'Arquivo recebido e salvo, iniciando processamento LLM',
        { fileName: file.originalname, fileSize: file.size }
      );

      try {
        // Extrair dados usando LLM
        const extractedData = await this.llmService.extractBillData({
          filePath: file.path,
          fileName: file.originalname,
          fileBuffer: file.buffer,
        });

        // Calcular variáveis derivadas
        const calculatedData = this.calculateDerivedValues(extractedData);

        // Atualizar registro no banco com os dados processados
        const updatedBill = await this.prisma.energyBill.update({
          where: { id: initialBill.id },
          data: {
            customerNumber: extractedData.customerNumber,
            referenceMonth: extractedData.referenceMonth,
            electricEnergyQuantity: extractedData.electricEnergy.quantity,
            electricEnergyValue: extractedData.electricEnergy.value,
            sceeeQuantity: extractedData.sceeeEnergy?.quantity || 0,
            sceeeValue: extractedData.sceeeEnergy?.value || 0,
            compensatedEnergyQuantity: extractedData.compensatedEnergy?.quantity || 0,
            compensatedEnergyValue: extractedData.compensatedEnergy?.value || 0,
            publicLightingContrib: extractedData.publicLightingContrib || 0,
            totalEnergyConsumption: calculatedData.totalEnergyConsumption,
            compensatedEnergy: calculatedData.compensatedEnergy,
            totalValueWithoutGD: calculatedData.totalValueWithoutGD,
            gdEconomy: calculatedData.gdEconomy,
            processingStatus: ProcessingStatus.COMPLETED,
          },
        });

        const processingTime = Date.now() - startTime;

        // Log do sucesso
        await this.createProcessingLog(
          updatedBill.id,
          'processing_completed',
          'success',
          'Fatura processada com sucesso',
          { 
            processingTime,
            customerNumber: updatedBill.customerNumber,
            referenceMonth: updatedBill.referenceMonth 
          }
        );

        this.logger.log(`[PROCESSAMENTO] Concluído para fatura ${updatedBill.id} em ${processingTime}ms`);

        return {
          success: true,
          message: 'Fatura processada com sucesso',
          billId: updatedBill.id,
          processingTime,
          fileName: file.originalname,
        };

      } catch (llmError) {
        this.logger.error(`[PROCESSAMENTO] Erro durante extração/processamento LLM: ${llmError.message}`);
        // Atualizar status para falha
        await this.prisma.energyBill.update({
          where: { id: initialBill.id },
          data: {
            processingStatus: ProcessingStatus.FAILED,
            errorMessage: llmError.message,
          },
        });

        // Log do erro
        await this.createProcessingLog(
          initialBill.id,
          'processing_failed',
          'error',
          `Falha no processamento: ${llmError.message}`,
          { error: llmError.message }
        );

        throw llmError;
      }

    } catch (error) {
      this.logger.error(`[FATAL] Erro no processamento da fatura: ${error.message}`, error.stack);
      throw error;
    }
  }

  // =========================
  // UPLOAD EM LOTE
  // =========================

  async uploadBillsBatch(
    files: Express.Multer.File[]
  ): Promise<ProcessBillResponseDto[]> {
    this.logger.log(`[BATCH] Processando ${files.length} arquivo(s) em lote`);
    
    const results: ProcessBillResponseDto[] = [];
    
    // Processar arquivos sequencialmente para evitar sobrecarga do LLM
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const startTime = Date.now();
      
      try {
        this.logger.log(`[BATCH] Processando arquivo ${i + 1}/${files.length}: ${file.originalname}`);
        
        const result = await this.uploadAndProcessBill(file);
        
        results.push({
          success: true,
          message: `Arquivo ${file.originalname} processado com sucesso`,
          billId: result.billId,
          processingTime: Date.now() - startTime,
          fileName: file.originalname
        });
        
        this.logger.log(`[BATCH] ✅ ${file.originalname} processado com sucesso (${Date.now() - startTime}ms)`);
        
      } catch (error) {
        this.logger.error(`[BATCH] ❌ Erro ao processar ${file.originalname}: ${error.message}`);
        
        results.push({
          success: false,
          message: `Erro ao processar arquivo ${file.originalname}`,
          billId: '',
          processingTime: Date.now() - startTime,
          fileName: file.originalname,
          error: error.message
        });
      }
      
      // Pequeno delay entre arquivos para não sobrecarregar a API do LLM
      if (i < files.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }
    
    const successCount = results.filter(r => r.success).length;
    const errorCount = results.filter(r => !r.success).length;
    
    this.logger.log(`[BATCH] Processamento concluído: ${successCount} sucessos, ${errorCount} erros`);
    
    return results;
  }

  // =========================
  // CONSULTAS
  // =========================

  async getBills(
    filters: BillFilterDto = {},
    page: number = 1,
    limit: number = 20,
  ): Promise<BillListResponseDto> {
    try {
      const skip = (page - 1) * limit;

      const where: any = {};

      if (filters.customerNumber) {
        where.customerNumber = {
          contains: filters.customerNumber,
          mode: 'insensitive',
        };
      }

      if (filters.referenceMonth) {
        where.referenceMonth = {
          contains: filters.referenceMonth,
          mode: 'insensitive',
        };
      }

      if (filters.status) {
        where.processingStatus = filters.status;
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

      const [bills, total] = await Promise.all([
        this.prisma.energyBill.findMany({
          where,
          skip,
          take: limit,
          orderBy: { createdAt: 'desc' },
        }),
        this.prisma.energyBill.count({ where }),
      ]);

      const billsResponse: UploadBillResponseDto[] = bills.map(bill => ({
        id: bill.id,
        customerNumber: bill.customerNumber,
        referenceMonth: bill.referenceMonth,
        originalFileName: bill.originalFileName,
        processingStatus: bill.processingStatus as ProcessingStatus,
        createdAt: bill.createdAt,
        
        // Campos extraídos do PDF
        electricEnergy: {
          quantity: bill.electricEnergyQuantity,
          value: bill.electricEnergyValue
        },
        sceeeEnergy: bill.sceeeQuantity && bill.sceeeValue ? {
          quantity: bill.sceeeQuantity,
          value: bill.sceeeValue
        } : null,
        compensatedEnergyGDI: bill.compensatedEnergyQuantity && bill.compensatedEnergyValue ? {
          quantity: bill.compensatedEnergyQuantity,
          value: bill.compensatedEnergyValue
        } : null,
        publicLightingContrib: bill.publicLightingContrib,
        
        // Campos calculados
        totalEnergyConsumption: bill.totalEnergyConsumption,
        compensatedEnergy: bill.compensatedEnergy || 0,
        totalValueWithoutGD: bill.totalValueWithoutGD,
        gdEconomy: bill.gdEconomy || 0,
      }));

      return {
        bills: billsResponse,
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      };

    } catch (error) {
      this.logger.error(`Erro ao buscar faturas: ${error.message}`, error.stack);
      throw new BadRequestException(`Erro na consulta de faturas: ${error.message}`);
    }
  }

  async getBillById(id: string): Promise<UploadBillResponseDto> {
    try {
      const bill = await this.prisma.energyBill.findUnique({
        where: { id },
      });

      if (!bill) {
        throw new NotFoundException('Fatura não encontrada');
      }

      return {
        id: bill.id,
        customerNumber: bill.customerNumber,
        referenceMonth: bill.referenceMonth,
        originalFileName: bill.originalFileName,
        processingStatus: bill.processingStatus as ProcessingStatus,
        createdAt: bill.createdAt,
        
        // Campos extraídos do PDF
        electricEnergy: {
          quantity: bill.electricEnergyQuantity,
          value: bill.electricEnergyValue
        },
        sceeeEnergy: bill.sceeeQuantity && bill.sceeeValue ? {
          quantity: bill.sceeeQuantity,
          value: bill.sceeeValue
        } : null,
        compensatedEnergyGDI: bill.compensatedEnergyQuantity && bill.compensatedEnergyValue ? {
          quantity: bill.compensatedEnergyQuantity,
          value: bill.compensatedEnergyValue
        } : null,
        publicLightingContrib: bill.publicLightingContrib,
        
        // Campos calculados
        totalEnergyConsumption: bill.totalEnergyConsumption,
        compensatedEnergy: bill.compensatedEnergy || 0,
        totalValueWithoutGD: bill.totalValueWithoutGD,
        gdEconomy: bill.gdEconomy || 0,
      };

    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      
      this.logger.error(`Erro ao buscar fatura por ID: ${error.message}`, error.stack);
      throw new BadRequestException(`Erro ao buscar fatura: ${error.message}`);
    }
  }

  async deleteBill(id: string): Promise<void> {
    const bill = await this.prisma.energyBill.findUnique({ where: { id } });
    if (!bill) {
      throw new NotFoundException('Fatura não encontrada');
    }
    await this.prisma.energyBill.delete({ where: { id } });
    // Opcional: deletar logs relacionados
    await this.prisma.processingLog.deleteMany({ where: { billId: id } });
    this.logger.log(`Fatura ${id} excluída com sucesso.`);
  }

  private validateFile(file: Express.Multer.File): void {
    if (!file) {
      throw new BadRequestException('Nenhum arquivo foi enviado');
    }

    if (file.mimetype !== 'application/pdf') {
      throw new BadRequestException('Apenas arquivos PDF são aceitos');
    }

    const maxSize = Number.parseInt(process.env.MAX_FILE_SIZE) || 10485760; // 10MB
    if (file.size > maxSize) {
      throw new BadRequestException(`Arquivo muito grande. Tamanho máximo: ${maxSize / 1024 / 1024}MB`);
    }
  }

  private generateFileHash(buffer: Buffer): string {
    return createHash('md5').update(buffer).digest('hex');
  }

  private calculateDerivedValues(extractedData: LlmExtractionResponseDto) {
    // 1. Consumo de Energia Elétrica (kWh) = Energia Elétrica + Energia SCEEE s/ICMS
    const totalEnergyConsumption = 
      extractedData.electricEnergy.quantity + 
      (extractedData.sceeeEnergy?.quantity || 0);

    // 2. Energia Compensada (kWh) = Energia Compensada GD I (quantidade)
    const compensatedEnergy = extractedData.compensatedEnergy?.quantity || 0;

    // 3. Valor Total sem GD (R$) = Energia Elétrica + Energia SCEEE + Contrib Ilum Publica
    const totalValueWithoutGD = 
      extractedData.electricEnergy.value + 
      (extractedData.sceeeEnergy?.value || 0) + 
      (extractedData.publicLightingContrib || 0);

    // 4. Economia GD (R$) = Energia compensada GD I (valor)
    // Nota: Se o valor for negativo, significa crédito/desconto aplicado
    const gdEconomy = extractedData.compensatedEnergy?.value || 0;

    this.logger.log(`[CÁLCULOS] Energia Total: ${totalEnergyConsumption} kWh, ` +
                   `Compensada: ${compensatedEnergy} kWh, ` +
                   `Valor sem GD: R$ ${totalValueWithoutGD}, ` + 
                   `Economia GD: R$ ${gdEconomy}`);

    return {
      totalEnergyConsumption,
      compensatedEnergy,
      totalValueWithoutGD,
      gdEconomy,
    };
  }

  private async createProcessingLog(
    billId: string,
    operation: string,
    status: string,
    message: string,
    metadata?: any,
  ): Promise<void> {
    try {
      await this.prisma.processingLog.create({
        data: {
          billId,
          operation,
          status,
          message,
          metadata,
        },
      });
    } catch (error) {
      this.logger.error(`Erro ao criar log de processamento: ${error.message}`);
    }
  }
}