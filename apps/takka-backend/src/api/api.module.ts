import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { AuthController } from '@gitroom/takka-backend/api/routes/auth.controller';
import { AuthService } from '@gitroom/takka-backend/services/auth/auth.service';
import { UsersController } from '@gitroom/takka-backend/api/routes/users.controller';
import { AuthMiddleware } from '@gitroom/takka-backend/services/auth/auth.middleware';
import { StripeController } from '@gitroom/takka-backend/api/routes/stripe.controller';
import { StripeService } from '@gitroom/nestjs-libraries/services/stripe.service';
import { AnalyticsController } from '@gitroom/takka-backend/api/routes/analytics.controller';
import { PoliciesGuard } from '@gitroom/takka-backend/services/auth/permissions/permissions.guard';
import { PermissionsService } from '@gitroom/takka-backend/services/auth/permissions/permissions.service';
import { IntegrationsController } from '@gitroom/takka-backend/api/routes/integrations.controller';
import { IntegrationManager } from '@gitroom/nestjs-libraries/integrations/integration.manager';
import { SettingsController } from '@gitroom/takka-backend/api/routes/settings.controller';
import { PostsController } from '@gitroom/takka-backend/api/routes/posts.controller';
import { MediaController } from '@gitroom/takka-backend/api/routes/media.controller';
import { UploadModule } from '@gitroom/nestjs-libraries/upload/upload.module';
import { BillingController } from '@gitroom/takka-backend/api/routes/billing.controller';
import { NotificationsController } from '@gitroom/takka-backend/api/routes/notifications.controller';
import { OpenaiService } from '@gitroom/nestjs-libraries/openai/openai.service';
import { ExtractContentService } from '@gitroom/nestjs-libraries/openai/extract.content.service';
import { CodesService } from '@gitroom/nestjs-libraries/services/codes.service';
import { CopilotController } from '@gitroom/takka-backend/api/routes/copilot.controller';
import { PublicController } from '@gitroom/takka-backend/api/routes/public.controller';
import { RootController } from '@gitroom/takka-backend/api/routes/root.controller';
import { TrackService } from '@gitroom/nestjs-libraries/track/track.service';
import { ShortLinkService } from '@gitroom/nestjs-libraries/short-linking/short.link.service';
import { WebhookController } from '@gitroom/takka-backend/api/routes/webhooks.controller';
import { SignatureController } from '@gitroom/takka-backend/api/routes/signature.controller';
import { AutopostController } from '@gitroom/takka-backend/api/routes/autopost.controller';
import { SetsController } from '@gitroom/takka-backend/api/routes/sets.controller';
import { PostRequestsController } from '@gitroom/takka-backend/api/routes/post-requests.controller';
import { ThirdPartyController } from '@gitroom/takka-backend/api/routes/third-party.controller';
import { MonitorController } from '@gitroom/takka-backend/api/routes/monitor.controller';
import { NoAuthIntegrationsController } from '@gitroom/takka-backend/api/routes/no.auth.integrations.controller';
import { EnterpriseController } from '@gitroom/takka-backend/api/routes/enterprise.controller';
import { OAuthAppController } from '@gitroom/takka-backend/api/routes/oauth-app.controller';
import { ApprovedAppsController } from '@gitroom/takka-backend/api/routes/approved-apps.controller';
import { OAuthController, OAuthAuthorizedController } from '@gitroom/takka-backend/api/routes/oauth.controller';
import { AnnouncementsController } from '@gitroom/takka-backend/api/routes/announcements.controller';
import { AdminController } from '@gitroom/takka-backend/api/routes/admin.controller';
import { AuthProviderManager } from '@gitroom/takka-backend/services/auth/providers/providers.manager';
import { GithubProvider } from '@gitroom/takka-backend/services/auth/providers/github.provider';
import { GoogleProvider } from '@gitroom/takka-backend/services/auth/providers/google.provider';
import { FarcasterProvider } from '@gitroom/takka-backend/services/auth/providers/farcaster.provider';
import { WalletProvider } from '@gitroom/takka-backend/services/auth/providers/wallet.provider';
import { OauthProvider } from '@gitroom/takka-backend/services/auth/providers/oauth.provider';

const authenticatedController = [
  UsersController,
  AnalyticsController,
  IntegrationsController,
  SettingsController,
  PostsController,
  MediaController,
  BillingController,
  NotificationsController,
  CopilotController,
  WebhookController,
  SignatureController,
  AutopostController,
  SetsController,
  PostRequestsController,
  ThirdPartyController,
  OAuthAppController,
  ApprovedAppsController,
  OAuthAuthorizedController,
  AnnouncementsController,
  AdminController,
];
@Module({
  imports: [UploadModule],
  controllers: [
    RootController,
    StripeController,
    AuthController,
    PublicController,
    MonitorController,
    EnterpriseController,
    NoAuthIntegrationsController,
    OAuthController,
    ...authenticatedController,
  ],
  providers: [
    AuthService,
    StripeService,
    OpenaiService,
    ExtractContentService,
    AuthMiddleware,
    PoliciesGuard,
    PermissionsService,
    CodesService,
    IntegrationManager,
    TrackService,
    ShortLinkService,
    AuthProviderManager,
    GithubProvider,
    GoogleProvider,
    FarcasterProvider,
    WalletProvider,
    OauthProvider,
  ],
  get exports() {
    return [...this.imports, ...this.providers];
  },
})
export class ApiModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(AuthMiddleware).forRoutes(...authenticatedController);
  }
}
