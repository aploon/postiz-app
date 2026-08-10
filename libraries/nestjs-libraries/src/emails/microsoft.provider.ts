import { EmailInterface } from '@gitroom/nestjs-libraries/emails/email.interface';

type TokenCache = {
  accessToken: string;
  expiresAt: number;
};

/**
 * Microsoft Graph email provider (client credentials).
 *
 * Azure app needs application permission Mail.Send + admin consent.
 * Sends as EMAIL_MICROSOFT_USER via:
 * POST /v1.0/users/{user}/sendMail
 */
export class MicrosoftProvider implements EmailInterface {
  name = 'microsoft';
  validateEnvKeys = [
    'EMAIL_MICROSOFT_TENANT_ID',
    'EMAIL_MICROSOFT_CLIENT_ID',
    'EMAIL_MICROSOFT_CLIENT_SECRET',
    'EMAIL_MICROSOFT_USER',
  ];

  private tokenCache: TokenCache | null = null;

  async sendEmail(
    to: string,
    subject: string,
    html: string,
    emailFromName: string,
    emailFromAddress: string,
    replyTo?: string
  ) {
    try {
      const mailbox = process.env.EMAIL_MICROSOFT_USER!;
      const accessToken = await this.getAccessToken();

      const message: Record<string, unknown> = {
        subject,
        body: {
          contentType: 'HTML',
          content: html,
        },
        toRecipients: [
          {
            emailAddress: {
              address: to,
            },
          },
        ],
        from: {
          emailAddress: {
            address: emailFromAddress || mailbox,
            name: emailFromName || undefined,
          },
        },
      };

      if (replyTo) {
        message.replyTo = [
          {
            emailAddress: {
              address: replyTo,
            },
          },
        ];
      }

      const response = await fetch(
        `https://graph.microsoft.com/v1.0/users/${encodeURIComponent(
          mailbox
        )}/sendMail`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            message,
            saveToSentItems: true,
          }),
        }
      );

      if (!response.ok) {
        const errorBody = await response.text();
        console.log(
          `Microsoft Graph sendMail failed (${response.status}):`,
          errorBody
        );
        return { sent: false, status: response.status, error: errorBody };
      }

      return { sent: true };
    } catch (err) {
      console.log(err);
      return { sent: false };
    }
  }

  private async getAccessToken() {
    const now = Date.now();
    if (this.tokenCache && this.tokenCache.expiresAt > now + 60_000) {
      return this.tokenCache.accessToken;
    }

    const tenantId = process.env.EMAIL_MICROSOFT_TENANT_ID!;
    const clientId = process.env.EMAIL_MICROSOFT_CLIENT_ID!;
    const clientSecret = process.env.EMAIL_MICROSOFT_CLIENT_SECRET!;

    const body = new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      scope: 'https://graph.microsoft.com/.default',
      grant_type: 'client_credentials',
    });

    const response = await fetch(
      `https://login.microsoftonline.com/${encodeURIComponent(
        tenantId
      )}/oauth2/v2.0/token`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body,
      }
    );

    if (!response.ok) {
      const errorBody = await response.text();
      throw new Error(
        `Microsoft token request failed (${response.status}): ${errorBody}`
      );
    }

    const json = (await response.json()) as {
      access_token?: string;
      expires_in?: number;
    };

    if (!json.access_token) {
      throw new Error('Microsoft token response missing access_token');
    }

    this.tokenCache = {
      accessToken: json.access_token,
      expiresAt: now + (json.expires_in || 3600) * 1000,
    };

    return this.tokenCache.accessToken;
  }
}
