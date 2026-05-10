import { Injectable, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../prisma/prisma.service';

interface EnvelopeBody {
  emailSubject: string;
  emailBlurb: string;
  documents: { documentBase64: string; name: string; fileExtension: string; documentId: string }[];
  recipients: {
    signers: {
      name: string; email: string; recipientId: string;
      routingOrder: string;
      tabs: {
        signHereTabs: { anchorString?: string; anchorUnits?: string; anchorXOffset?: string; anchorYOffset?: string; pageNumber?: string; xPosition?: string; yPosition?: string; documentId?: string }[];
      };
    }[];
  };
  status: string;
}

@Injectable()
export class FirmaDigitalService {
  private readonly logger = new Logger(FirmaDigitalService.name);
  private readonly integrationKey: string;
  private readonly clientSecret: string;
  private readonly accountId: string;
  private readonly baseUrl: string;
  private readonly userId: string;
  private accessToken: string | null = null;
  private tokenExpiry: number = 0;

  constructor(
    private readonly prisma: PrismaService,
    config: ConfigService,
  ) {
    this.integrationKey = config.get<string>('DOCUSIGN_INTEGRATION_KEY') ?? '';
    this.clientSecret   = config.get<string>('DOCUSIGN_CLIENT_SECRET') ?? '';
    this.accountId      = config.get<string>('DOCUSIGN_ACCOUNT_ID') ?? '';
    this.userId         = config.get<string>('DOCUSIGN_USER_ID') ?? '';
    this.baseUrl        = (config.get<string>('DOCUSIGN_BASE_URL') ?? 'https://demo.docusign.net/restapi').replace(/\/$/, '');
  }

  async getSolicitudes(tenantId: string, propiedadId: string) {
    await this.assertPropiedad(tenantId, propiedadId);
    return this.prisma.firmaSolicitud.findMany({
      where: { propiedad_id: propiedadId },
      orderBy: { created_at: 'desc' },
    });
  }

  async solicitarFirma(
    tenantId: string,
    propiedadId: string,
    agenteId: string,
    dto: { firmanteNombre: string; firmanteEmail: string; documentoBase64?: string; documentoNombre?: string },
  ) {
    if (!this.integrationKey) throw new BadRequestException('DocuSign no está configurado (DOCUSIGN_INTEGRATION_KEY)');

    const prop = await this.assertPropiedad(tenantId, propiedadId);

    const firmante = { nombre: dto.firmanteNombre, email: dto.firmanteEmail };
    const docBase64 = dto.documentoBase64 ?? (await this.getCartaComisionBase64(prop));
    const docNombre = dto.documentoNombre ?? `Carta_Comision_${(prop as any).codigo}.pdf`;

    const token = await this.getAccessToken();

    const envelope: EnvelopeBody = {
      emailSubject: `Firma requerida — ${(prop as any).titulo}`,
      emailBlurb: `Por favor firme la carta de comisión para la propiedad ${(prop as any).titulo}.`,
      documents: [{
        documentBase64: docBase64,
        name: docNombre,
        fileExtension: 'pdf',
        documentId: '1',
      }],
      recipients: {
        signers: [{
          name: firmante.nombre,
          email: firmante.email,
          recipientId: '1',
          routingOrder: '1',
          tabs: {
            signHereTabs: [{
              anchorString: '/firma/',
              anchorUnits: 'pixels',
              anchorXOffset: '20',
              anchorYOffset: '-10',
            }],
          },
        }],
      },
      status: 'sent',
    };

    const res = await fetch(`${this.baseUrl}/v2.1/accounts/${this.accountId}/envelopes`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify(envelope),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new BadRequestException(`DocuSign error: ${(err as any).message ?? res.status}`);
    }

    const envData: any = await res.json();
    const envelopeId = envData.envelopeId as string;

    // Get embedded signing URL (for direct link)
    const viewRes = await fetch(
      `${this.baseUrl}/v2.1/accounts/${this.accountId}/envelopes/${envelopeId}/views/recipient`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          userName: firmante.nombre,
          email: firmante.email,
          recipientId: '1',
          clientUserId: '1001',
          returnUrl: 'https://example.com/firma-completada',
        }),
      },
    );

    let signingUrl: string | undefined;
    if (viewRes.ok) {
      const vd: any = await viewRes.json();
      signingUrl = vd.url;
    }

    return this.prisma.firmaSolicitud.create({
      data: {
        tenant_id: tenantId,
        propiedad_id: propiedadId,
        agente_id: agenteId,
        firmante_nombre: firmante.nombre,
        firmante_email: firmante.email,
        estado: 'ENVIADO',
        envelope_id: envelopeId,
        signing_url: signingUrl,
      },
    });
  }

  async handleWebhook(body: any) {
    const envelopeId = body?.data?.envelopeId ?? body?.envelopeId;
    const status     = (body?.data?.envelopeSummary?.status ?? body?.status ?? '').toLowerCase();
    if (!envelopeId) return;

    const map: Record<string, any> = {
      completed: { estado: 'COMPLETADO', completado_at: new Date() },
      declined:  { estado: 'DECLINADO' },
      voided:    { estado: 'VENCIDO' },
    };
    const update = map[status];
    if (!update) return;

    await this.prisma.firmaSolicitud.updateMany({
      where: { envelope_id: envelopeId },
      data: update,
    });
    this.logger.log(`Firma ${envelopeId} → ${update.estado}`);
  }

  // ─── Private ─────────────────────────────────────────────────

  private async getAccessToken(): Promise<string> {
    if (this.accessToken && Date.now() < this.tokenExpiry - 60_000) return this.accessToken;

    // JWT Grant
    const header = Buffer.from(JSON.stringify({ alg: 'RS256', typ: 'JWT' })).toString('base64url');
    const now    = Math.floor(Date.now() / 1000);
    const claims = Buffer.from(JSON.stringify({
      iss: this.integrationKey,
      sub: this.userId,
      aud: 'account-d.docusign.com',
      iat: now,
      exp: now + 3600,
      scope: 'signature',
    })).toString('base64url');

    // In production: sign with RSA private key (DOCUSIGN_RSA_PRIVATE_KEY env var)
    // For demo, use client_credentials with clientSecret
    const tokenRes = await fetch('https://account-d.docusign.com/oauth/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
        assertion: `${header}.${claims}.SIGNATURE_PLACEHOLDER`,
      }).toString(),
    });

    if (!tokenRes.ok) {
      // Fallback: log and throw — real implementation needs RSA signing
      throw new Error('DocuSign JWT auth requires RSA private key (DOCUSIGN_RSA_PRIVATE_KEY). Consulta la documentación de configuración.');
    }

    const td: any = await tokenRes.json();
    this.accessToken = td.access_token;
    this.tokenExpiry = Date.now() + td.expires_in * 1000;
    return this.accessToken!;
  }

  private async assertPropiedad(tenantId: string, propiedadId: string) {
    const prop = await this.prisma.propiedad.findFirst({
      where: { id: propiedadId, tenant_id: tenantId },
    });
    if (!prop) throw new NotFoundException('Propiedad no encontrada');
    return prop;
  }

  private async getCartaComisionBase64(prop: any): Promise<string> {
    // Minimal placeholder PDF (in production: call BrochureService/CartaComisionService)
    return Buffer.from(`%PDF-1.4 Carta de Comisión — ${prop.titulo}`).toString('base64');
  }
}
