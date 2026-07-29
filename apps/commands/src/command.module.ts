import { Module } from '@nestjs/common';
import { CommandModule as ExternalCommandModule } from 'nestjs-command';
import { DatabaseModule } from '@gitroom/nestjs-libraries/database/prisma/database.module';
import { RefreshTokens } from './tasks/refresh.tokens';
import { ConfigurationTask } from './tasks/configuration';
import { AgentRun } from './tasks/agent.run';
import { CreateSuperAdmin } from './tasks/create.superadmin';
import { AgentModule } from '@gitroom/nestjs-libraries/agent/agent.module';
import { getTemporalModule } from '@gitroom/nestjs-libraries/temporal/temporal.module';

@Module({
  imports: [
    ExternalCommandModule,
    DatabaseModule,
    AgentModule,
    // Same as backend/takka-backend — required by NotificationService in DatabaseModule
    getTemporalModule(false),
  ],
  controllers: [],
  providers: [RefreshTokens, ConfigurationTask, AgentRun, CreateSuperAdmin],
  get exports() {
    return [...this.imports, ...this.providers];
  },
})
export class CommandModule {}
