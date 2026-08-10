import { Injectable } from '@nestjs/common';
import { existsSync, readFileSync } from 'fs';
import { join } from 'path';
import { Readable } from 'stream';
import { UploadFactory } from '@gitroom/nestjs-libraries/upload/upload.factory';

export type RequestsReportPdfRow = {
  title: string;
  type: string;
  status: string;
  priority?: string;
  createdAt: Date;
};

export type RequestsReportPdfInput = {
  organizationName: string;
  periodLabel: string;
  rows: RequestsReportPdfRow[];
  reference?: string;
};

@Injectable()
export class MonthlyRequestsReportPdfService {
  private storage = UploadFactory.createStorage();

  async generateAndUpload(input: RequestsReportPdfInput) {
    const buffer = await this.renderPdf(input);
    const filename = this.buildFilename(input);

    const uploaded = await this.storage.uploadFile({
      buffer,
      mimetype: 'application/pdf',
      size: buffer.length,
      path: '',
      fieldname: '',
      destination: '',
      stream: Readable.from(buffer),
      filename,
      originalname: filename,
      encoding: '',
    } as Express.Multer.File);

    return {
      url: uploaded.path as string,
      filename,
    };
  }

  private async renderPdf(input: RequestsReportPdfInput) {
    // Lazy load — Chromium is heavy; only needed when sending reports.
    const puppeteer = await import('puppeteer');
    const browser = await puppeteer.default.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
    });

    try {
      const page = await browser.newPage();
      await page.setContent(this.buildHtml(input), {
        waitUntil: 'networkidle0',
      });
      const pdf = await page.pdf({
        format: 'A4',
        printBackground: true,
        // Margins are handled in HTML so the footer bar can sit flush
        // at the bottom of the page.
        margin: {
          top: '0',
          right: '0',
          bottom: '0',
          left: '0',
        },
      });
      return Buffer.from(pdf);
    } finally {
      await browser.close();
    }
  }

  private buildHtml(input: RequestsReportPdfInput) {
    const sentOn = new Date().toLocaleString('en-GB', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      timeZone: 'UTC',
    });
    const reference =
      input.reference ||
      `RR-${new Date().getUTCFullYear()}-${String(
        new Date().getUTCMonth() + 1
      ).padStart(2, '0')}`;
    const logoDataUrl = this.loadLogoDataUrl();

    const rows = input.rows
      .map(
        (row, index) => `
      <tr>
        <td>${index + 1}</td>
        <td>${this.escape(row.title)}</td>
        <td>${this.escape(row.type)}</td>
        <td>${this.escape(row.status)}</td>
        <td>${this.escape(row.priority || '—')}</td>
        <td>${this.formatDate(row.createdAt)}</td>
      </tr>`
      )
      .join('');

    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <style>
    @page { size: A4; margin: 0; }
    * { box-sizing: border-box; }
    html, body {
      margin: 0;
      padding: 0;
      color: #111;
      font-family: Arial, Helvetica, sans-serif;
      font-size: 12px;
      line-height: 1.45;
    }
    .page {
      width: 210mm;
      min-height: 297mm;
      display: flex;
      flex-direction: column;
      padding: 16mm 14mm 0;
    }
    .content {
      flex: 1 0 auto;
    }
    .center { text-align: center; }
    .logo {
      width: 56px;
      height: 56px;
      object-fit: contain;
      margin: 0 auto 6px;
      display: block;
    }
    .brand {
      font-size: 22px;
      font-weight: 700;
      letter-spacing: 0.02em;
      margin: 0 0 8px;
    }
    .meta {
      color: #666;
      font-size: 12px;
      margin-bottom: 18px;
    }
    .title {
      font-family: Georgia, "Times New Roman", serif;
      font-size: 28px;
      font-weight: 700;
      margin: 0 0 18px;
    }
    .project-line {
      margin: 0 0 4px;
      font-size: 13px;
    }
    .project-line strong { font-weight: 700; }
    .parties {
      display: flex;
      gap: 24px;
      margin: 22px 0 26px;
    }
    .party { flex: 1; }
    .party-label {
      color: #5b9bd5;
      font-weight: 700;
      text-transform: uppercase;
      font-size: 11px;
      letter-spacing: 0.06em;
      margin-bottom: 6px;
    }
    .party-name { font-weight: 700; margin-bottom: 2px; }
    .party-line { color: #333; }
    .section-label {
      color: #5b9bd5;
      font-weight: 700;
      text-transform: uppercase;
      font-size: 11px;
      letter-spacing: 0.06em;
      margin: 0 0 8px;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      border: 1px solid #cfcfcf;
    }
    th, td {
      border: 1px solid #cfcfcf;
      padding: 8px 10px;
      text-align: left;
      vertical-align: top;
      font-size: 11px;
    }
    th {
      background: #f7f7f7;
      font-weight: 700;
    }
    .signatures {
      display: flex;
      gap: 24px;
      margin-top: 40px;
    }
    .signature { flex: 1; }
    .sign-name {
      color: #5b9bd5;
      font-weight: 700;
      margin-bottom: 2px;
    }
    .sign-role {
      color: #1f4e79;
      font-weight: 700;
      font-size: 11px;
    }
    .footer-block {
      flex-shrink: 0;
      margin-top: auto;
      padding-top: 24px;
    }
    .footer {
      padding-top: 12px;
      border-top: 1px solid #cfcfcf;
      display: flex;
      gap: 16px;
      font-size: 10px;
      color: #444;
    }
    .footer > div { flex: 1; }
    .footer-bar {
      margin: 14px -14mm 0;
      height: 10px;
      background: #111;
    }
  </style>
</head>
<body>
  <div class="page">
    <div class="content">
      <div class="center">
        ${
          logoDataUrl
            ? `<img class="logo" src="${logoDataUrl}" alt="Takkatech" />`
            : ''
        }
        <div class="brand">Takkatech</div>
        <div class="meta">#Ref: ${this.escape(reference)} &nbsp;&nbsp; Date: ${sentOn}</div>
        <div class="title">Monthly requests report</div>
      </div>

      <p class="project-line"><strong>Project:</strong> Requests report — ${this.escape(
        input.organizationName
      )}</p>
      <p class="project-line"><strong>Period:</strong> ${this.escape(
        input.periodLabel
      )} (UTC)</p>

      <div class="parties">
        <div class="party">
          <div class="party-label">Delivery from</div>
          <div class="party-name">Takka Technologies</div>
          <div class="party-line">38 rue 114 Avakpa Kpodji, Porto-Novo, Bénin</div>
          <div class="party-line">infos@takkatech.com</div>
          <div class="party-line">+1 438 558 2652 / 01 20 60 00 50</div>
        </div>
        <div class="party">
          <div class="party-label">Delivery to</div>
          <div class="party-name">${this.escape(input.organizationName)}</div>
          <div class="party-line">Organization administrators</div>
        </div>
      </div>

      <div class="section-label">Delivery items</div>
      <table>
        <thead>
          <tr>
            <th>#</th>
            <th>Title</th>
            <th>Type</th>
            <th>Status</th>
            <th>Priority</th>
            <th>Created</th>
          </tr>
        </thead>
        <tbody>
          ${rows}
        </tbody>
      </table>

      <!-- <div class="signatures">
        <div class="signature">
          <div class="sign-name">Bruno BIAOU</div>
          <div class="sign-role">Project Manager</div>
        </div>
        <div class="signature">
          <div class="sign-name">Bruno BIAOU</div>
          <div class="sign-role">Technical Manager</div>
        </div>
      </div> -->
    </div>

    <div class="footer-block">
      <div class="footer">
        <div>38, Rs. 14 114 Avakpa Kapodji, Porto-Novo, Bénin</div>
        <div>69 rue Tisseur, Longueuil, Québec J4V 3K6, Canada</div>
        <div>+229 60 26 36 82 / +1 514 576 2663</div>
        <div>contact@takkatech.com<br/>www.takkatech.com</div>
      </div>
      <div class="footer-bar"></div>
    </div>
  </div>
</body>
</html>`;
  }

  private loadLogoDataUrl() {
    const candidates = [
      join(process.cwd(), 'apps/takka-postiz/public/logo.png'),
      join(process.cwd(), '../../apps/takka-postiz/public/logo.png'),
    ];
    for (const candidate of candidates) {
      if (!existsSync(candidate)) {
        continue;
      }
      const bytes = readFileSync(candidate);
      return `data:image/png;base64,${bytes.toString('base64')}`;
    }
    return '';
  }

  private buildFilename(input: RequestsReportPdfInput) {
    const safeOrg = input.organizationName
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '')
      .slice(0, 40);
    const safePeriod = input.periodLabel
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '')
      .slice(0, 40);
    return `requests-report-${safeOrg || 'org'}-${safePeriod || 'period'}.pdf`;
  }

  private formatDate(date: Date) {
    return date.toLocaleString('en-GB', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      timeZone: 'UTC',
    });
  }

  private escape(value: string) {
    return value
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }
}
