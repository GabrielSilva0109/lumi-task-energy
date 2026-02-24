import {
  Controller,
  Post,
  Get,
  Param,
  Query,
  UseInterceptors,
  UploadedFile,
  BadRequestException,
  Delete,
  HttpCode,
  Patch
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiConsumes,
  ApiParam,
  ApiQuery,
} from '@nestjs/swagger';
import { BillsService } from './bills.service';
import {
  BillFilterDto,
  BillListResponseDto,
  UploadBillResponseDto,
  ProcessBillResponseDto,
  ProcessingStatus,
} from './dto/bills.dto';

@ApiTags('bills')
@Controller('bills')
export class BillsController {

  constructor(private readonly billsService: BillsService) {}

  @Patch(':id/reprocess')
  @ApiOperation({ summary: 'Reprocessar fatura FAILED', description: 'Tenta novamente processar uma fatura com status FAILED usando o arquivo já salvo.' })
  @ApiParam({ name: 'id', description: 'ID único da fatura' })
  @ApiResponse({ status: 200, description: 'Fatura reprocessada com sucesso' })
  @ApiResponse({ status: 400, description: 'Fatura não está em status FAILED ou não encontrada' })
  async reprocessBill(@Param('id') id: string): Promise<ProcessBillResponseDto> {
    return this.billsService.reprocessBill(id);
  }

  @Post('upload')
  @UseInterceptors(FileInterceptor('file'))
  @ApiOperation({ 
    summary: 'Upload e processamento de fatura de energia',
    description: 'Recebe um arquivo PDF de fatura de energia, processa com LLM e salva os dados'
  })
  @ApiConsumes('multipart/form-data')
  @ApiResponse({
    status: 200,
    description: 'Fatura processada com sucesso',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: true },
        message: { type: 'string', example: 'Fatura processada com sucesso' },
        billId: { type: 'string', example: 'clkj1234567890' },
        processingTime: { type: 'number', example: 1500 }
      }
    }
  })
  @ApiResponse({
    status: 400,
    description: 'Erro na validação do arquivo ou processamento',
    schema: {
      type: 'object',
      properties: {
        statusCode: { type: 'number', example: 400 },
        message: { type: 'string', example: 'Apenas arquivos PDF são aceitos' },
        error: { type: 'string', example: 'Bad Request' }
      }
    }
  })
  async uploadBill(
    @UploadedFile() file: Express.Multer.File,
  ): Promise<ProcessBillResponseDto> {
    if (!file) {
      throw new BadRequestException('Nenhum arquivo foi enviado');
    }

    return this.billsService.uploadAndProcessBill(file);
  }


  @Get()
  @ApiOperation({ 
    summary: 'Listar faturas processadas',
    description: 'Retorna uma lista paginada de faturas com filtros opcionais'
  })
  @ApiQuery({ name: 'customerNumber', required: false, type: String, description: 'Filtrar por número do cliente' })
  @ApiQuery({ name: 'referenceMonth', required: false, type: String, description: 'Filtrar por mês de referência (ex: SET/2024)' })
  @ApiQuery({ name: 'status', required: false, enum: ProcessingStatus, description: 'Filtrar por status de processamento' })
  @ApiQuery({ name: 'startDate', required: false, type: String, description: 'Data inicial (ISO 8601)' })
  @ApiQuery({ name: 'endDate', required: false, type: String, description: 'Data final (ISO 8601)' })
  @ApiQuery({ name: 'page', required: false, type: Number, description: 'Página (padrão: 1)' })
  @ApiQuery({ name: 'limit', required: false, type: Number, description: 'Itens por página (padrão: 20)' })
  @ApiResponse({
    status: 200,
    description: 'Lista de faturas retornada com sucesso',
    schema: {
      type: 'object',
      properties: {
        bills: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              id: { type: 'string', example: 'clkj1234567890' },
              customerNumber: { type: 'string', example: '7202210726' },
              referenceMonth: { type: 'string', example: 'SET/2024' },
              originalFileName: { type: 'string', example: 'fatura_setembro.pdf' },
              processingStatus: { type: 'string', example: 'COMPLETED' },
              createdAt: { type: 'string', example: '2024-12-19T10:30:00.000Z' },
              totalEnergyConsumption: { type: 'number', example: 526 },
              compensatedEnergy: { type: 'number', example: 526 },
              totalValueWithoutGD: { type: 'number', example: 461.62 },
              gdEconomy: { type: 'number', example: 438.17 }
            }
          }
        },
        total: { type: 'number', example: 150 },
        page: { type: 'number', example: 1 },
        limit: { type: 'number', example: 20 },
        totalPages: { type: 'number', example: 8 }
      }
    }
  })
  async getBills(
    @Query('customerNumber') customerNumber?: string,
    @Query('referenceMonth') referenceMonth?: string,
    @Query('status') status?: ProcessingStatus,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('page') pageRaw?: string,
    @Query('limit') limitRaw?: string,
  ): Promise<BillListResponseDto> {
    console.log('INICIO GET /bills');
    // Fallback robusto para page e limit
    let page = 1;
    let limit = 20;
    if (pageRaw && !Number.isNaN(Number(pageRaw)) && Number(pageRaw) > 0) {
      page = Number(pageRaw);
    }
    if (limitRaw && !Number.isNaN(Number(limitRaw)) && Number(limitRaw) > 0) {
      limit = Number(limitRaw);
    }

    const filters: BillFilterDto = {
      customerNumber,
      referenceMonth,
      status,
      startDate,
      endDate,
    };

    // LOGS PARA DEPURAÇÃO
    console.log('--- [GET /bills] Parâmetros recebidos ---');
    console.log('customerNumber:', customerNumber);
    console.log('referenceMonth:', referenceMonth);
    console.log('status:', status);
    console.log('startDate:', startDate);
    console.log('endDate:', endDate);
    console.log('page:', page);
    console.log('limit:', limit);

    const result = await this.billsService.getBills(filters, page, limit);
    console.log('--- [GET /bills] Resultado retornado ---');
    console.log(JSON.stringify(result, null, 2));
    return result;
  }

  @Get(':id')
  @ApiOperation({ 
    summary: 'Buscar fatura por ID',
    description: 'Retorna os dados detalhados de uma fatura específica'
  })
  @ApiParam({ name: 'id', description: 'ID único da fatura' })
  @ApiResponse({
    status: 200,
    description: 'Dados da fatura retornados com sucesso',
    schema: {
      type: 'object',
      properties: {
        id: { type: 'string', example: 'clkj1234567890' },
        customerNumber: { type: 'string', example: '7202210726' },
        referenceMonth: { type: 'string', example: 'SET/2024' },
        originalFileName: { type: 'string', example: 'fatura_setembro.pdf' },
        processingStatus: { type: 'string', example: 'COMPLETED' },
        createdAt: { type: 'string', example: '2024-12-19T10:30:00.000Z' },
        totalEnergyConsumption: { type: 'number', example: 526 },
        compensatedEnergy: { type: 'number', example: 526 },
        totalValueWithoutGD: { type: 'number', example: 461.62 },
        gdEconomy: { type: 'number', example: 438.17 }
      }
    }
  })
  @ApiResponse({
    status: 404,
    description: 'Fatura não encontrada',
    schema: {
      type: 'object',
      properties: {
        statusCode: { type: 'number', example: 404 },
        message: { type: 'string', example: 'Fatura não encontrada' },
        error: { type: 'string', example: 'Not Found' }
      }
    }
  })
  async getBillById(@Param('id') id: string): Promise<UploadBillResponseDto> {
    return this.billsService.getBillById(id);
  }

  @Delete(':id')
  @HttpCode(204)
  @ApiOperation({ summary: 'Excluir fatura', description: 'Remove uma fatura do banco de dados pelo ID' })
  @ApiParam({ name: 'id', description: 'ID único da fatura' })
  @ApiResponse({ status: 204, description: 'Fatura excluída com sucesso' })
  @ApiResponse({ status: 404, description: 'Fatura não encontrada' })
  async deleteBill(@Param('id') id: string): Promise<void> {
    await this.billsService.deleteBill(id);
  }
}