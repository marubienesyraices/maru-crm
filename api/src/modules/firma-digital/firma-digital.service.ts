import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { Propiedad } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { ConfigIntegracionesService } from '../config-integraciones/config-integraciones.service';

interface DocuSignToken {
  token: string;
  expiry: number;
}

interface DocuSignApiError {
  message?: string;
}
interface EnvelopeCreatedResponse {
  envelopeId: string;
}
interface RecipientViewResponse {
  url?: string;
}
interface OAuthTokenResponse {
  access_token: string;
  expires_in: number;
}
export interface DocuSignWebhookBody {
  data?: { envelopeId?: string; envelopeSummary?: { status?: string } };
  envelopeId?: string;
  status?: string;
}
type FirmaEstadoUpdate =
  | { estado: 'COMPLETADO'; completado_at: Date }
  | { estado: 'DECLINADO' }
  | { estado: 'VENCIDO' };

interface EnvelopeBody {
  emailSubject: string;
  emailBlurb: string;
  documents: {
    documentBase64: string;
    name: string;
    fileExtension: string;
    documentId: string;
  }[];
  recipients: {
    signers: {
      name: string;
      email: string;
      recipientId: string;
      routingOrder: string;
      tabs: {
        signHereTabs: {
          anchorString?: string;
          anchorUnits?: string;
          anchorXOffset?: string;
          anchorYOffset?: string;
          pageNumber?: string;
          xPosition?: string;
          yPosition?: string;
          documentId?: string;
        }[];
      };
    }[];
  };
  status: string;
}

@Injectable()
export class FirmaDigitalService {
  private readonly logger = new Logger(FirmaDigitalService.name);
  /** Per-tenant DocuSign token cache */
  private readonly tokenCache = new Map<string, DocuSignToken>();

  constructor(
    private readonly prisma: PrismaService,
    private readonly integraciones: ConfigIntegracionesService,
  ) {}

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
    dto: {
      firmanteNombre: string;
      firmanteEmail: string;
      documentoBase64?: string;
      documentoNombre?: string;
    },
  ) {
    const creds = await this.integraciones.getCredentials(tenantId);
    if (!creds.docusign_integration_key) {
      throw new BadRequestException(
        'DocuSign no está configurado para este tenant (docusign_integration_key)',
      );
    }

    const prop = await this.assertPropiedad(tenantId, propiedadId);
    const firmante = { nombre: dto.firmanteNombre, email: dto.firmanteEmail };
    const docBase64 = dto.documentoBase64 ?? this.getCartaComisionBase64(prop);
    const docNombre =
      dto.documentoNombre ?? `Carta_Comision_${prop.codigo}.pdf`;
    const baseUrl = (
      creds.docusign_base_url ?? 'https://demo.docusign.net/restapi'
    ).replace(/\/$/, '');

    const token = await this.getAccessToken(tenantId, creds);

    const envelope: EnvelopeBody = {
      emailSubject: `Firma requerida — ${prop.titulo}`,
      emailBlurb: `Por favor firme la carta de comisión para la propiedad ${prop.titulo}.`,
      documents: [
        {
          documentBase64: docBase64,
          name: docNombre,
          fileExtension: 'pdf',
          documentId: '1',
        },
      ],
      recipients: {
        signers: [
          {
            name: firmante.nombre,
            email: firmante.email,
            recipientId: '1',
            routingOrder: '1',
            tabs: {
              signHereTabs: [
                {
                  anchorString: '/firma/',
                  anchorUnits: 'pixels',
                  anchorXOffset: '20',
                  anchorYOffset: '-10',
                },
              ],
            },
          },
        ],
      },
      status: 'sent',
    };

    const res = await fetch(
      `${baseUrl}/v2.1/accounts/${creds.docusign_account_id}/envelopes`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(envelope),
      },
    );

    if (!res.ok) {
      const err = (await res.json().catch(() => ({}))) as DocuSignApiError;
      throw new BadRequestException(
        `DocuSign error: ${err.message ?? res.status}`,
      );
    }

    const envData = (await res.json()) as EnvelopeCreatedResponse;
    const envelopeId = envData.envelopeId;

    const viewRes = await fetch(
      `${baseUrl}/v2.1/accounts/${creds.docusign_account_id}/envelopes/${envelopeId}/views/recipient`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
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
      const vd = (await viewRes.json()) as RecipientViewResponse;
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

  async handleWebhook(body: DocuSignWebhookBody) {
    const envelopeId = body?.data?.envelopeId ?? body?.envelopeId;
    const status = (
      body?.data?.envelopeSummary?.status ??
      body?.status ??
      ''
    ).toLowerCase();
    if (!envelopeId) return;

    const map: Record<string, FirmaEstadoUpdate> = {
      completed: { estado: 'COMPLETADO', completado_at: new Date() },
      declined: { estado: 'DECLINADO' },
      voided: { estado: 'VENCIDO' },
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

  private async getAccessToken(
    tenantId: string,
    creds: Awaited<ReturnType<ConfigIntegracionesService['getCredentials']>>,
  ): Promise<string> {
    const cached = this.tokenCache.get(tenantId);
    if (cached && Date.now() < cached.expiry - 60_000) return cached.token;

    const header = Buffer.from(
      JSON.stringify({ alg: 'RS256', typ: 'JWT' }),
    ).toString('base64url');
    const now = Math.floor(Date.now() / 1000);
    const claims = Buffer.from(
      JSON.stringify({
        iss: creds.docusign_integration_key,
        sub: creds.docusign_user_id,
        aud: 'account-d.docusign.com',
        iat: now,
        exp: now + 3600,
        scope: 'signature',
      }),
    ).toString('base64url');

    const tokenRes = await fetch('https://account-d.docusign.com/oauth/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
        assertion: `${header}.${claims}.SIGNATURE_PLACEHOLDER`,
      }).toString(),
    });

    if (!tokenRes.ok) {
      throw new Error(
        'DocuSign JWT auth requires RSA private key (docusign_rsa_private_key). Consulta la documentación de configuración.',
      );
    }

    const td = (await tokenRes.json()) as OAuthTokenResponse;
    this.tokenCache.set(tenantId, {
      token: td.access_token,
      expiry: Date.now() + td.expires_in * 1000,
    });
    return td.access_token;
  }

  private async assertPropiedad(tenantId: string, propiedadId: string) {
    const prop = await this.prisma.propiedad.findFirst({
      where: { id: propiedadId, tenant_id: tenantId },
    });
    if (!prop) throw new NotFoundException('Propiedad no encontrada');
    return prop;
  }

  private getCartaComisionBase64(prop: Propiedad): string {
    return Buffer.from(`%PDF-1.4 Carta de Comisión — ${prop.titulo}`).toString(
      'base64',
    );
  }
}
