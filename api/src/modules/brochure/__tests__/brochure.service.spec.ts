import { NotFoundException } from '@nestjs/common';
import {
  BrochureService,
  formatMoney,
  resolveCurrency,
  darken,
  isLight,
} from '../brochure.service';
import { createMockPrismaService } from '../../../../test/mocks/prisma.mock';

describe('brochure helpers', () => {
  describe('resolveCurrency', () => {
    it('debe usar la moneda de la propiedad si está definida, aunque difiera de la del tenant', () => {
      expect(resolveCurrency({ moneda: 'USD' }, { moneda: 'GTQ' })).toBe('USD');
    });

    it('debe caer a la moneda del tenant si la propiedad no tiene una propia', () => {
      expect(resolveCurrency({ moneda: null }, { moneda: 'USD' })).toBe('USD');
    });

    it('debe caer a GTQ si ni la propiedad ni el tenant tienen moneda configurada', () => {
      expect(resolveCurrency({ moneda: null }, { moneda: null })).toBe('GTQ');
    });
  });

  describe('formatMoney', () => {
    it('debe retornar null para valores vacíos/cero', () => {
      expect(formatMoney(null)).toBeNull();
      expect(formatMoney(undefined)).toBeNull();
      expect(formatMoney(0)).toBeNull();
    });

    it('debe formatear con la moneda indicada y separadores de miles', () => {
      expect(formatMoney(420000, 'USD')).toBe('USD 420,000.00');
    });

    it('debe usar GTQ por defecto si no se especifica moneda', () => {
      expect(formatMoney(1500)).toBe('GTQ 1,500.00');
    });
  });

  describe('darken', () => {
    it('debe oscurecer un color hexadecimal según el porcentaje indicado', () => {
      expect(darken('#ffffff', 0.5)).toBe('#808080');
    });
  });

  describe('isLight', () => {
    it('debe considerar el blanco como color claro', () => {
      expect(isLight('#ffffff')).toBe(true);
    });

    it('debe considerar el negro como color oscuro', () => {
      expect(isLight('#000000')).toBe(false);
    });
  });
});

describe('BrochureService.generateBuffer', () => {
  let service: BrochureService;
  let prisma: ReturnType<typeof createMockPrismaService>;
  let storage: { localPath: jest.Mock };

  beforeEach(() => {
    prisma = createMockPrismaService();
    (prisma as any).propiedad.findFirst = jest.fn();
    (prisma as any).configIntegraciones = {
      findUnique: jest.fn().mockResolvedValue(null),
    };
    (prisma as any).configBrochure = {
      findUnique: jest.fn().mockResolvedValue(null),
    };
    storage = { localPath: jest.fn() };
    service = new BrochureService(prisma as any, storage as any);
  });

  it('debe lanzar NotFoundException si la propiedad no existe en el tenant', async () => {
    (prisma as any).propiedad.findFirst.mockResolvedValue(null);

    await expect(service.generateBuffer('prop-x', 't1')).rejects.toThrow(
      NotFoundException,
    );
  });
});
