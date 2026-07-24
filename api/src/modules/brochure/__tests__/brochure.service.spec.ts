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
    // localPath() devuelve null → fetchImageBuffer() cae al branch de URL
    // remota; como ninguna URL de prueba empieza con "http", nunca se llega
    // a hacer una petición de red real.
    storage = { localPath: jest.fn().mockReturnValue(null) };
    service = new BrochureService(prisma as any, storage as any);
  });

  it('debe lanzar NotFoundException si la propiedad no existe en el tenant', async () => {
    (prisma as any).propiedad.findFirst.mockResolvedValue(null);

    await expect(service.generateBuffer('prop-x', 't1')).rejects.toThrow(
      NotFoundException,
    );
  });

  function basePropiedad(overrides: Record<string, any> = {}) {
    return {
      id: 'prop-1',
      codigo: 'CASA-0001',
      titulo: 'Casa de prueba',
      tipo: 'CASA',
      gestion: 'VENTA',
      estado: 'DISPONIBLE',
      moneda: null,
      precio_venta: 1500000,
      precio_renta: null,
      descripcion: 'Una descripción larga de la propiedad de prueba.',
      habitaciones: 3,
      banos: 2,
      parqueos: 1,
      niveles: 2,
      area_terreno_m2: 300,
      area_construccion_m2: 200,
      ano_construccion: 2015,
      amenidades: ['Piscina', 'Gimnasio', 'Seguridad 24/7'],
      zona: 'Zona 15',
      municipio: 'Guatemala',
      departamento: 'Guatemala',
      direccion: 'Calle Falsa 123',
      pais: 'Guatemala',
      imagenes: [],
      agente: { nombre: 'Ana Agente', email: 'ana@gestprop.net' },
      propietario: { nombre: 'Prop. Dueño', telefono: '5555-5555' },
      tenant: {
        nombre: 'GestProp Demo',
        moneda: 'GTQ',
        color_primario: '#1e3a5f',
        logo_url: null,
      },
      ...overrides,
    };
  }

  it('debe generar un PDF válido con una propiedad completa (todas las secciones)', async () => {
    (prisma as any).propiedad.findFirst.mockResolvedValue(
      basePropiedad({
        gestion: 'AMBAS',
        precio_renta: 8000,
        imagenes: Array.from({ length: 8 }, (_, i) => ({
          url: `/uploads/img-${i}.jpg`,
          tipo: i === 0 ? 'portada' : 'galeria',
          orden: i,
        })),
      }),
    );

    const result = await service.generateBuffer('prop-1', 't1');

    expect(result.codigo).toBe('CASA-0001');
    expect(result.buffer.length).toBeGreaterThan(0);
    expect(result.buffer.subarray(0, 4).toString()).toBe('%PDF');
  });

  it('debe generar un PDF válido con una propiedad mínima (sin imágenes, agente, ubicación ni características)', async () => {
    (prisma as any).propiedad.findFirst.mockResolvedValue(
      basePropiedad({
        descripcion: null,
        habitaciones: null,
        banos: null,
        parqueos: null,
        niveles: null,
        area_terreno_m2: null,
        area_construccion_m2: null,
        ano_construccion: null,
        estado: null,
        amenidades: [],
        zona: null,
        municipio: null,
        departamento: null,
        direccion: null,
        pais: null,
        imagenes: [],
        agente: null,
        propietario: null,
      }),
    );

    const result = await service.generateBuffer('prop-1', 't1');

    expect(result.buffer.subarray(0, 4).toString()).toBe('%PDF');
  });

  it('debe generar un PDF válido solo con precio de renta (gestión RENTA)', async () => {
    (prisma as any).propiedad.findFirst.mockResolvedValue(
      basePropiedad({
        gestion: 'RENTA',
        precio_venta: null,
        precio_renta: 6500,
      }),
    );

    const result = await service.generateBuffer('prop-1', 't1');

    expect(result.buffer.subarray(0, 4).toString()).toBe('%PDF');
  });

  it('debe respetar la configuración de integraciones (color/tagline/logo de la carta) y de secciones personalizadas', async () => {
    (prisma as any).propiedad.findFirst.mockResolvedValue(basePropiedad());
    (prisma as any).configIntegraciones.findUnique.mockResolvedValue({
      carta_color_primario: '#ff0000',
      carta_tagline: 'Tu inmobiliaria de confianza',
      carta_logo_url: null,
    });
    (prisma as any).configBrochure.findUnique.mockResolvedValue({
      secciones: [
        { id: 'agente', label: 'Tu asesor', visible: false, order: 1 },
        { id: 'descripcion', label: 'Descripción', visible: true, order: 2 },
        { id: 'caracteristicas', label: 'Detalles', visible: true, order: 3 },
        { id: 'amenidades', label: 'Amenidades', visible: true, order: 4 },
        { id: 'ubicacion', label: 'Ubicación', visible: true, order: 5 },
        {
          id: 'galeria_strip',
          label: 'Galería',
          visible: true,
          order: 6,
        },
        {
          id: 'galeria_pagina2',
          label: 'Galería 2',
          visible: false,
          order: 7,
        },
      ],
      footer_texto: 'Pie de página personalizado',
      watermark_texto: 'PRIVADO',
    });

    const result = await service.generateBuffer('prop-1', 't1');

    expect(result.buffer.subarray(0, 4).toString()).toBe('%PDF');
  });
});
