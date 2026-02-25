import { AuthModule } from './modules/auth/auth.module';
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { MulterModule } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname } from 'node:path'; // Use node:path for extname
import { AppController } from './app.controller';
import { PrismaModule } from './modules/prisma/prisma.module';
import { LlmModule } from './modules/llm/llm.module';
import { BillsModule } from './modules/bills/bills.module';
import { DashboardModule } from './modules/dashboard/dashboard.module';
import { AppService } from './app.service';

@Module({
  imports: [
    // Configuration module
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    
    // File upload configuration
    MulterModule.register({
      storage: diskStorage({
        destination: process.env.UPLOAD_DIR || './uploads',
        filename: (req, file, callback) => {
          const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
          const ext = extname(file.originalname);
          const filename = `${file.fieldname}-${uniqueSuffix}${ext}`;
          callback(null, filename);
        },
      }),
      fileFilter: (req, file, callback) => {
        if (file.mimetype !== 'application/pdf') {
          return callback(new Error('Apenas arquivos PDF são permitidos!'), false);
        }
        callback(null, true);
      },
      limits: {
        fileSize: Number.parseInt(process.env.MAX_FILE_SIZE) || 10485760, // 10MB
      },
    }),
    
    // Application modules
    PrismaModule,
    LlmModule,
    BillsModule,
    DashboardModule,
    AuthModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}