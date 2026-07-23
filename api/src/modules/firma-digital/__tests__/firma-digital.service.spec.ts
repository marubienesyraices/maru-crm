import { NotFoundException, BadRequestException } from '@nestjs/common';
import { FirmaDigitalService } from '../firma-digital.service';
import { createMockPrismaService } from '../../../../test/mocks/prisma.mock';

describe('FirmaDigitalService', () => {
  let service: FirmaDigitalService;
  let prisma: ReturnType<typeof createMockPrismaService>;
  let integraciones: { getCredentials: jest.Mock };
  let fetchMock: jest.Mock;

  const creds = {
    docusign_integration_key: 'ikey',
    docusign_user_id: 'uid',
    docusign_account_id: 'acc-1',
    docusign_base_url: 'https://demo.docusign.net/restapi',
  };

  const prop = {
    id: 'prop-1',
    tenant_id: 't1',
    titulo: 'Casa X',
    codigo: 'CASA-0001',
  };

  beforeEach(() => {
    prisma = createMockPrismaService();
    (prisma as any).firmaSolicitud = {
      findMany: jest.fn(),
      create: jest.fn(),
      updateMany: jest.fn(),
    };
    integraciones = { getCredentials: jest.fn().mockResolvedValue(creds) };
    service = new FirmaDigitalService(prisma as any, integraciones as any);

    fetchMock = jest.fn();
    global.fetch = fetchMock as any;
  });

  function mockTokenOk() {
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ access_token: 'tok-123', expires_in: 3600 }),
    });
  }

  function mockEnvelopeOk(envelopeId = 'env-1') {
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ envelopeId }),
    });
  }

  function mockViewOk(url = 'https://sign.example.com/x') {
    fetchMock.mockResolvedValueOnce({ ok: true, json: async () => ({ url }) });
  }

  // ─── getSolicitudes ───────────────────────────────────────

  describe('getSolicitudes', () => {
    it('debe lanzar NotFoundException si la propiedad no existe en el tenant', async () => {
      prisma.propiedad.findFirst.mockResolvedValue(null);
      await expect(service.getSolicitudes('t1', 'prop-x')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('debe retornar las solicitudes ordenadas por fecha de creación descendente', async () => {
      prisma.propiedad.findFirst.mockResolvedValue(prop);
      (prisma as any).firmaSolicitud.findMany.mockResolvedValue([
        { id: 's-1' },
      ]);

      const result = await service.getSolicitudes('t1', 'prop-1');

      expect(result).toEqual([{ id: 's-1' }]);
      expect((prisma as any).firmaSolicitud.findMany).toHaveBeenCalledWith({
        where: { propiedad_id: 'prop-1' },
        orderBy: { created_at: 'desc' },
      });
    });
  });

  // ─── solicitarFirma ───────────────────────────────────────

  describe('solicitarFirma', () => {
    const dto = { firmanteNombre: 'Juan Pérez', firmanteEmail: 'juan@x.com' };

    it('debe lanzar BadRequestException si DocuSign no está configurado', async () => {
      integraciones.getCredentials.mockResolvedValue({
        ...creds,
        docusign_integration_key: null,
      });

      await expect(
        service.solicitarFirma('t1', 'prop-1', 'agente-1', dto),
      ).rejects.toThrow(BadRequestException);
    });

    it('debe lanzar NotFoundException si la propiedad no existe', async () => {
      prisma.propiedad.findFirst.mockResolvedValue(null);
      await expect(
        service.solicitarFirma('t1', 'prop-x', 'agente-1', dto),
      ).rejects.toThrow(NotFoundException);
    });

    it('debe crear el envelope, obtener la URL de firma y guardar la solicitud', async () => {
      prisma.propiedad.findFirst.mockResolvedValue(prop);
      mockTokenOk();
      mockEnvelopeOk('env-1');
      mockViewOk('https://sign.example.com/x');
      (prisma as any).firmaSolicitud.create.mockResolvedValue({
        id: 'solicitud-1',
      });

      const result = await service.solicitarFirma(
        't1',
        'prop-1',
        'agente-1',
        dto,
      );

      expect(result).toEqual({ id: 'solicitud-1' });
      expect((prisma as any).firmaSolicitud.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          tenant_id: 't1',
          propiedad_id: 'prop-1',
          agente_id: 'agente-1',
          firmante_nombre: 'Juan Pérez',
          firmante_email: 'juan@x.com',
          estado: 'ENVIADO',
          envelope_id: 'env-1',
          signing_url: 'https://sign.example.com/x',
        }),
      });
    });

    it('debe lanzar BadRequestException si DocuSign rechaza la creación del envelope', async () => {
      prisma.propiedad.findFirst.mockResolvedValue(prop);
      mockTokenOk();
      fetchMock.mockResolvedValueOnce({
        ok: false,
        status: 400,
        json: async () => ({ message: 'Documento inválido' }),
      });

      await expect(
        service.solicitarFirma('t1', 'prop-1', 'agente-1', dto),
      ).rejects.toThrow(BadRequestException);
    });

    it('debe guardar la solicitud sin signing_url si la vista de firma falla', async () => {
      prisma.propiedad.findFirst.mockResolvedValue(prop);
      mockTokenOk();
      mockEnvelopeOk('env-2');
      fetchMock.mockResolvedValueOnce({
        ok: false,
        status: 500,
        json: async () => ({}),
      });
      (prisma as any).firmaSolicitud.create.mockResolvedValue({
        id: 'solicitud-2',
      });

      await service.solicitarFirma('t1', 'prop-1', 'agente-1', dto);

      const data = (prisma as any).firmaSolicitud.create.mock.calls[0][0].data;
      expect(data.signing_url).toBeUndefined();
      expect(data.envelope_id).toBe('env-2');
    });

    it('debe reutilizar el token de DocuSign en caché para el mismo tenant', async () => {
      prisma.propiedad.findFirst.mockResolvedValue(prop);
      (prisma as any).firmaSolicitud.create.mockResolvedValue({ id: 's-1' });

      mockTokenOk();
      mockEnvelopeOk('env-a');
      mockViewOk();
      await service.solicitarFirma('t1', 'prop-1', 'agente-1', dto);

      // Segunda llamada: no debe volver a pedir token (solo 2 fetch: envelope + view)
      mockEnvelopeOk('env-b');
      mockViewOk();
      await service.solicitarFirma('t1', 'prop-1', 'agente-1', dto);

      const tokenCalls = fetchMock.mock.calls.filter(
        ([url]) => url === 'https://account-d.docusign.com/oauth/token',
      );
      expect(tokenCalls).toHaveLength(1);
    });

    it('debe lanzar error si DocuSign no puede emitir el token de acceso', async () => {
      prisma.propiedad.findFirst.mockResolvedValue(prop);
      fetchMock.mockResolvedValueOnce({ ok: false, status: 401 });

      await expect(
        service.solicitarFirma('t1', 'prop-1', 'agente-1', dto),
      ).rejects.toThrow('DocuSign JWT auth requires RSA private key');
    });
  });

  // ─── handleWebhook ────────────────────────────────────────

  describe('handleWebhook', () => {
    it('no debe hacer nada si no viene envelopeId', async () => {
      await service.handleWebhook({});
      expect((prisma as any).firmaSolicitud.updateMany).not.toHaveBeenCalled();
    });

    it('debe marcar COMPLETADO cuando el status es "completed"', async () => {
      await service.handleWebhook({
        data: { envelopeId: 'env-1', envelopeSummary: { status: 'completed' } },
      });

      expect((prisma as any).firmaSolicitud.updateMany).toHaveBeenCalledWith({
        where: { envelope_id: 'env-1' },
        data: expect.objectContaining({ estado: 'COMPLETADO' }),
      });
    });

    it('debe marcar DECLINADO cuando el status es "declined"', async () => {
      await service.handleWebhook({ envelopeId: 'env-2', status: 'declined' });

      expect((prisma as any).firmaSolicitud.updateMany).toHaveBeenCalledWith({
        where: { envelope_id: 'env-2' },
        data: { estado: 'DECLINADO' },
      });
    });

    it('debe marcar VENCIDO cuando el status es "voided"', async () => {
      await service.handleWebhook({ envelopeId: 'env-3', status: 'voided' });

      expect((prisma as any).firmaSolicitud.updateMany).toHaveBeenCalledWith({
        where: { envelope_id: 'env-3' },
        data: { estado: 'VENCIDO' },
      });
    });

    it('no debe actualizar nada con un status desconocido', async () => {
      await service.handleWebhook({ envelopeId: 'env-4', status: 'sent' });
      expect((prisma as any).firmaSolicitud.updateMany).not.toHaveBeenCalled();
    });
  });
});
