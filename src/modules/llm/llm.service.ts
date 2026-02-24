import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import OpenAI from 'openai';
import { LlmExtractionResponseDto, ExtractBillDataDto } from './dto/llm-extraction.dto';
import { readFileSync } from 'fs';

@Injectable()
export class LlmService {
  private readonly logger = new Logger(LlmService.name);
  private readonly openai: OpenAI;

  constructor(private configService: ConfigService) {
    const apiKey = this.configService.get<string>('OPENAI_API_KEY');
    if (!apiKey) {
      throw new Error('OPENAI_API_KEY não configurada nas variáveis de ambiente');
    }

    this.openai = new OpenAI({
      apiKey: apiKey,
    });
  }

  async extractBillData(data: ExtractBillDataDto): Promise<LlmExtractionResponseDto> {
    try {
      this.logger.log(`Iniciando extração de dados do arquivo: ${data.fileName}`);

      // Convertendo o buffer para base64 para envio à OpenAI
      const base64Image = data.fileBuffer.toString('base64');

      const systemPrompt = this.buildSystemPrompt();
      const userPrompt = this.buildUserPrompt();

      this.logger.log('Enviando requisição para OpenAI GPT-4 Vision...');

      const response = await this.openai.chat.completions.create({
        model: 'gpt-4-vision-preview',
        max_tokens: 2000,
        messages: [
          {
            role: 'system',
            content: systemPrompt,
          },
          {
            role: 'user',
            content: [
              {
                type: 'text',
                text: userPrompt,
              },
              {
                type: 'image_url',
                image_url: {
                  url: `data:application/pdf;base64,${base64Image}`,
                },
              },
            ],
          },
        ],
        response_format: { type: 'json_object' },
      });

      const content = response.choices[0]?.message?.content;
      if (!content) {
        throw new BadRequestException('OpenAI não retornou conteúdo válido');
      }

      this.logger.log('Resposta recebida da OpenAI, processando JSON...');

      const extractedData = JSON.parse(content);
      
      // Validar e transformar os dados
      const validatedData = this.validateAndTransformData(extractedData);

      this.logger.log(`Extração concluída com sucesso para o cliente: ${validatedData.customerNumber}`);

      return validatedData;

    } catch (error) {
      this.logger.error(`Erro na extração de dados: ${error.message}`, error.stack);
      
      if (error instanceof BadRequestException) {
        throw error;
      }

      throw new BadRequestException(`Falha na extração de dados do LLM: ${error.message}`);
    }
  }

  private buildSystemPrompt(): string {
    return `Você é um especialista em análise de faturas de energia elétrica brasileiras. 
    Sua tarefa é extrair dados específicos de faturas de energia em formato PDF e retornar EXCLUSIVAMENTE um objeto JSON válido.

    REGRAS IMPORTANTES:
    1. Retorne APENAS JSON válido, sem explicações adicionais
    2. Use exatamente a estrutura especificada abaixo
    3. Para valores monetários, use números decimais (ex: 45.67, não "R$ 45,67")
    4. Para kWh, use números decimais (ex: 150.5, não "150,5 kWh")
    5. Para mês de referência, use formato "MMM/AAAA" (ex: "SET/2023")
    6. Se algum campo não for encontrado, use null
    
    ESTRUTURA JSON OBRIGATÓRIA:
    {
      "customerNumber": "string",
      "referenceMonth": "string",
      "electricEnergy": {
        "quantity": number,
        "value": number
      },
      "sceeeEnergy": {
        "quantity": number,
        "value": number
      },
      "compensatedEnergy": {
        "quantity": number,
        "value": number
      },
      "publicLightingContrib": number
    }`;
  }

  private buildUserPrompt(): string {
    return `Analise esta fatura de energia elétrica brasileira e extraia os seguintes dados:

    1. "Número do Cliente" (geralmente um número longo como 7202210726)
    2. "Mês de referência" (formato SET/2024, OUT/2023, etc.)
    3. "Energia Elétrica" - encontre a quantidade em kWh e valor em R$
    4. "Energia SCEEE s/ICMS" - encontre a quantidade em kWh e valor em R$
    5. "Energia compensada GD I" - encontre a quantidade em kWh e valor em R$
    6. "Contrib Ilum Publica Municipal" - encontre o valor em R$

    IMPORTANTE: Retorne apenas o JSON conforme especificado no sistema prompt.`;
  }

  private validateAndTransformData(data: any): LlmExtractionResponseDto {
    try {
      // Transformar os dados para o formato esperado
      const transformed: LlmExtractionResponseDto = {
        customerNumber: String(data.customerNumber || '').trim(),
        referenceMonth: String(data.referenceMonth || '').trim().toUpperCase(),
        electricEnergy: {
          quantity: Number(data.electricEnergy?.quantity || 0),
          value: Number(data.electricEnergy?.value || 0),
        },
        sceeeEnergy: data.sceeeEnergy ? {
          quantity: Number(data.sceeeEnergy.quantity || 0),
          value: Number(data.sceeeEnergy.value || 0),
        } : null,
        compensatedEnergy: data.compensatedEnergy ? {
          quantity: Number(data.compensatedEnergy.quantity || 0),
          value: Number(data.compensatedEnergy.value || 0),
        } : null,
        publicLightingContrib: data.publicLightingContrib ? 
          Number(data.publicLightingContrib) : null,
      };

      // Validações básicas
      if (!transformed.customerNumber) {
        throw new Error('Número do cliente não encontrado');
      }

      if (!transformed.referenceMonth) {
        throw new Error('Mês de referência não encontrado');
      }

      if (!transformed.electricEnergy.quantity || !transformed.electricEnergy.value) {
        throw new Error('Dados de energia elétrica incompletos');
      }

      return transformed;

    } catch (error) {
      this.logger.error(`Erro na validação dos dados extraídos: ${error.message}`);
      throw new BadRequestException(`Dados extraídos inválidos: ${error.message}`);
    }
  }

  // Método para testes - simula resposta do LLM
  async mockExtractBillData(mockData?: Partial<LlmExtractionResponseDto>): Promise<LlmExtractionResponseDto> {
    this.logger.log('Usando mock data para testes');
    
    const defaultMockData: LlmExtractionResponseDto = {
      customerNumber: '7202210726',
      referenceMonth: 'SET/2024',
      electricEnergy: {
        quantity: 50,
        value: 45.67,
      },
      sceeeEnergy: {
        quantity: 476,
        value: 392.50,
      },
      compensatedEnergy: {
        quantity: 526,
        value: 438.17,
      },
      publicLightingContrib: 23.45,
    };

    return { ...defaultMockData, ...mockData };
  }
}