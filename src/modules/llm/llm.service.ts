import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import OpenAI from 'openai';
import { LlmExtractionResponseDto, ExtractBillDataDto } from './dto/llm-extraction.dto';
import { extname } from 'node:path';
const pdfParse = require('pdf-parse');

@Injectable()
export class LlmService {
  private readonly logger = new Logger(LlmService.name);
  private readonly openai: OpenAI;

  constructor(private readonly configService: ConfigService) {
    const apiKey = this.configService.get<string>('OPENAI_API_KEY');
    if (!apiKey) {
      throw new Error('OPENAI_API_KEY não configurada nas variáveis de ambiente');
    }

    this.openai = new OpenAI({ apiKey });
  }

async extractBillData(data: ExtractBillDataDto): Promise<LlmExtractionResponseDto> {
  try {
    this.logger.log(`Iniciando extração de dados do arquivo: ${data.fileName}`);

    // Validacoes basicas
    const fileExt = extname(data.fileName).toLowerCase();
    if (fileExt !== '.pdf') {
      throw new BadRequestException('Apenas arquivos PDF são suportados.');
    }

    if (!data.fileBuffer || !(data.fileBuffer instanceof Buffer)) {
      throw new BadRequestException('Arquivo PDF inválido ou ausente.');
    }

    // Extract text from PDF
    const extractedText = await this.extractPdfText(data.fileBuffer);
    this.logger.log(`Texto extraído do PDF (${extractedText.length} caracteres)`);

    if (!extractedText || extractedText.trim().length === 0) {
      throw new BadRequestException('Arquivo PDF não contém texto extraível.');
    }

    const response = await this.openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        {
          role: 'system',
          content: this.buildSystemPrompt()
        },
        {
          role: 'user',
          content: `${this.buildUserPrompt()}\n\nConteúdo extraído do arquivo PDF "${data.fileName}":\n\n${extractedText}`
        }
      ],
      max_tokens: 1000,
      temperature: 0.1
    });

    const outputText = response.choices[0]?.message?.content;
    if (!outputText) {
      throw new BadRequestException('OpenAI não retornou conteúdo válido.');
    }

    let extractedData: any;
    try {
      // Try to extract JSON from the response (in case there's extra text)
      const jsonMatch = outputText.match(/\{[\s\S]*\}/);
      const jsonString = jsonMatch ? jsonMatch[0] : outputText;
      extractedData = JSON.parse(jsonString);
    } catch (parseError) {
      this.logger.error(`Erro ao fazer parse do JSON. Resposta original: ${outputText}`);
      const preview = outputText.length > 300 ? `${outputText.slice(0, 300)}...` : outputText;
      throw new BadRequestException(`Resposta do LLM nao e JSON valido: ${preview}`);
    }

    const result = this.validateAndTransformData(extractedData);
    this.logger.log('Extração de dados concluída com sucesso');
    return result;
  } catch (error) {
    this.logger.error(`Erro na extração de dados: ${error.message}`);
    throw error;
  }
}

  private buildSystemPrompt(): string {
    return `You are an expert at extracting data from Brazilian electricity bills (PDFs). 
    
    IMPORTANT: You MUST respond ONLY with a valid JSON object. Do not include any explanations, comments, or additional text. 
    
    Extract the information and return ONLY a valid JSON object with this EXACT structure:
    {
      "customerNumber": "string",
      "referenceMonth": "string",
      "electricEnergy": { "quantity": number, "value": number },
      "sceeeEnergy": { "quantity": number, "value": number } or null,
      "compensatedEnergy": { "quantity": number, "value": number } or null,
      "publicLightingContrib": number or null
    }
    
    If any field is not found or not applicable, use null for optional fields or empty string/0 for required fields.`;
  }

  private buildUserPrompt(): string {
    return `Analise esta fatura de energia elétrica brasileira e extraia os seguintes dados:

1. Número do Cliente (Customer Number)
2. Mês de referência (Reference Month) - formato MMM/AAAA
3. Energia Elétrica (Electric Energy) - quantidade em kWh e valor em R$
4. Energia SCEEE s/ICMS - quantidade em kWh e valor em R$ (se existir)
5. Energia compensada GD I - quantidade em kWh e valor em R$ (se existir)
6. Contribuição de Iluminação Pública - valor em R$ (se existir)

RESPONDA APENAS COM O JSON. NÃO INCLUA EXPLICAÇÕES OU TEXTO ADICIONAL.`;
  }

  private validateAndTransformData(data: any): LlmExtractionResponseDto {
    try {
      const transformed: LlmExtractionResponseDto = {
        customerNumber: String(data.customerNumber || '').trim(),
        referenceMonth: String(data.referenceMonth || '').trim().toUpperCase(),
        electricEnergy: {
          quantity: Number(data.electricEnergy?.quantity || 0),
          value: Number(data.electricEnergy?.value || 0),
        },
        sceeeEnergy: data.sceeeEnergy
          ? {
              quantity: Number(data.sceeeEnergy.quantity || 0),
              value: Number(data.sceeeEnergy.value || 0),
            }
          : null,
        compensatedEnergy: data.compensatedEnergy
          ? {
              quantity: Number(data.compensatedEnergy.quantity || 0),
              value: Number(data.compensatedEnergy.value || 0),
            }
          : null,
        publicLightingContrib:
          data.publicLightingContrib !== null
            ? Number(data.publicLightingContrib)
            : null,
      };

      if (!transformed.customerNumber) {
        throw new Error('Número do cliente não encontrado');
      }

      if (!transformed.referenceMonth) {
        throw new Error('Mês de referência não encontrado');
      }

      if (!transformed.electricEnergy.quantity) {
        throw new Error('Energia elétrica não encontrada');
      }

      return transformed;
    } catch (error) {
      throw new BadRequestException(`Dados extraídos inválidos: ${error.message}`);
    }
  }

  // =========================  // PDF PROCESSING
  // =========================

  private async extractPdfText(buffer: Buffer): Promise<string> {
    try {
      const pdfData = await pdfParse(buffer);
      return pdfData.text || '';
    } catch (error) {
      this.logger.error(`Erro na extração de texto PDF: ${error.message}`);
      throw new BadRequestException('Não foi possível extrair texto do arquivo PDF.');
    }
  }

  // =========================  // MOCK (TESTES)
  // =========================

  async mockExtractBillData(
    mockData?: Partial<LlmExtractionResponseDto>,
  ): Promise<LlmExtractionResponseDto> {
    return {
      customerNumber: '7202210726',
      referenceMonth: 'SET/2024',
      electricEnergy: { quantity: 50, value: 45.67 },
      sceeeEnergy: { quantity: 476, value: 392.5 },
      compensatedEnergy: { quantity: 526, value: 438.17 },
      publicLightingContrib: 23.45,
      ...mockData,
    };
  }
}