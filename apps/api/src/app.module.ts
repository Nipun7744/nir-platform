import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ConfigModule } from '@nestjs/config';
import { ServeStaticModule } from '@nestjs/serve-static';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { join } from 'path';

import { PrismaModule } from './prisma/prisma.module';
import { CommonModule } from './common/common.module';
import { NotificationsModule } from './notifications/notifications.module';

import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { UploadsController } from './uploads/uploads.controller';
import { InnovationsModule } from './innovations/innovations.module';
import { EvaluationsModule } from './evaluations/evaluations.module';
import { ReferenceDataModule } from './reference-data/reference-data.module';
import { RepositoryModule } from './repository/repository.module';
import { FundingModule } from './funding/funding.module';
import { MentorshipModule } from './mentorship/mentorship.module';
import { PipelineModule } from './pipeline/pipeline.module';
import { MinistriesModule } from './ministries/ministries.module';
import { CmsModule } from './cms/cms.module';
import { ReportingModule } from './reporting/reporting.module';

import { JwtAuthGuard } from './common/guards/jwt-auth.guard';
import { RolesGuard } from './common/guards/roles.guard';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    ThrottlerModule.forRoot([{ ttl: 60_000, limit: 120 }]),
    ServeStaticModule.forRoot({
      rootPath: join(process.cwd(), process.env.UPLOAD_DIR ?? 'uploads'),
      serveRoot: '/uploads',
    }),
    PrismaModule,
    CommonModule,
    NotificationsModule,
    AuthModule,
    UsersModule,
    InnovationsModule,
    EvaluationsModule,
    ReferenceDataModule,
    RepositoryModule,
    FundingModule,
    MentorshipModule,
    PipelineModule,
    MinistriesModule,
    CmsModule,
    ReportingModule,
  ],
  controllers: [UploadsController],
  providers: [
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_GUARD, useClass: RolesGuard },
    { provide: APP_GUARD, useClass: ThrottlerGuard },
  ],
})
export class AppModule {}
