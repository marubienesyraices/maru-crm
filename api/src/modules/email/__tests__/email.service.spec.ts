import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { EmailService } from '../email.service';

// ─── Mock resend before any imports that use it ───────────────

const mockEmailsSend = jest.fn().mockResolvedValue({ id: 'email-001' });

jest.mock('resend', () => ({
  Resend: jest.fn().mockImplementation(() => ({
    emails: { send: mockEmailsSend },
  })),
}));

// ─── Helpers ──────────────────────────────────────────────────

function buildModule(apiKey: string | undefined) {
  return Test.createTestingModule({
    providers: [
      EmailService,
      {
        provide: ConfigService,
        useValue: {
          get: jest.fn((key: string) => {
            if (key === 'RESEND_API_KEY') return apiKey;
            if (key === 'EMAIL_FROM') return 'Test <test@example.com>';
            return undefined;
          }),
        },
      },
    ],
  }).compile();
}

// ─── Tests ────────────────────────────────────────────────────

describe('EmailService', () => {
  let service: EmailService;

  beforeEach(async () => {
    mockEmailsSend.mockClear();
    const module: TestingModule = await buildModule('re_test_key');
    service = module.get<EmailService>(EmailService);
  });

  it('isConfigured es true cuando hay RESEND_API_KEY', () => {
    expect(service.isConfigured).toBe(true);
  });

  it('envía email con los campos correctos', async () => {
    await service.send({
      to: 'agente@maru.com',
      tipo: 'DOCUMENTO_POR_VENCER',
      titulo: 'Documento por vencer',
      mensaje: 'Vence en 5 días.',
    });

    expect(mockEmailsSend).toHaveBeenCalledWith(
      expect.objectContaining({
        to: ['agente@maru.com'],
        subject: 'Documento por vencer',
      }),
    );
  });

  it('incluye el icono correcto en el HTML para DOCUMENTO_VENCIDO', async () => {
    await service.send({
      to: 'agente@maru.com',
      tipo: 'DOCUMENTO_VENCIDO',
      titulo: 'Vencido',
      mensaje: 'El documento está vencido.',
    });

    const html: string = mockEmailsSend.mock.calls[0][0].html;
    expect(html).toContain('🚨');
    expect(html).toContain('Vencido');
  });

  it('incluye el icono correcto para MATCH_PROPIEDAD', async () => {
    await service.send({
      to: 'agente@maru.com',
      tipo: 'MATCH_PROPIEDAD',
      titulo: 'Nueva propiedad',
      mensaje: 'Hay una propiedad que coincide.',
    });

    const html: string = mockEmailsSend.mock.calls[0][0].html;
    expect(html).toContain('🏠');
  });

  it('no llama a Resend cuando no hay API key', async () => {
    const module = await buildModule(undefined);
    const svcNoKey = module.get<EmailService>(EmailService);

    expect(svcNoKey.isConfigured).toBe(false);

    await svcNoKey.send({
      to: 'agente@maru.com',
      tipo: 'SISTEMA',
      titulo: 'Test',
      mensaje: 'Test',
    });

    expect(mockEmailsSend).not.toHaveBeenCalled();
  });

  it('absorbe errores de Resend sin lanzar excepción', async () => {
    mockEmailsSend.mockRejectedValueOnce(new Error('Network error'));

    await expect(
      service.send({
        to: 'agente@maru.com',
        tipo: 'SISTEMA',
        titulo: 'Test',
        mensaje: 'Test',
      }),
    ).resolves.not.toThrow();
  });
});
