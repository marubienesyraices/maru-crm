import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException } from '@nestjs/common';
import ExcelJS from 'exceljs';
import { ImportService } from '../import.service';
import { PrismaService } from '../../../prisma/prisma.service';
import { createMockPrismaService, MockPrismaService } from '../../../../test/mocks/prisma.mock';

const TENANT_ID = 'tenant-001';
const USER_ID = 'user-001';

function csvBuffer(text: string): Buffer {
  return Buffer.from(text, 'utf8');
}

async function xlsxBuffer(headers: string[], rows: (string | number)[][]): Promise<Buffer> {
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet('Sheet1');
  ws.addRow(headers);
  rows.forEach((r) => ws.addRow(r));
  const buf = await wb.xlsx.writeBuffer();
  return Buffer.from(buf);
}

const mockTenant = { id: TENANT_ID, moneda: 'GTQ', limite_propiedades: 100 };

describe('ImportService', () => {
  let service: ImportService;
  let prisma: MockPrismaService;

  beforeEach(async () => {
    prisma = createMockPrismaService();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ImportService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    service = module.get<ImportService>(ImportService);
  });

  // ─── importClientes ──────────────────────────────────────────────

  describe('importClientes', () => {
    beforeEach(() => {
      prisma.cliente.findMany.mockResolvedValue([]);
      prisma.cliente.createMany.mockResolvedValue({ count: 1 });
    });

    it('lanza BadRequestException si el archivo está vacío', async () => {
      const buf = csvBuffer('nombre,email\n');
      await expect(service.importClientes(TENANT_ID, buf, 'x.csv')).rejects.toThrow(BadRequestException);
    });

    it('lanza BadRequestException si excede el máximo de 500 filas', async () => {
      const rows = Array.from({ length: 501 }, (_, i) => `Cliente ${i},cliente${i}@test.com`).join('\n');
      const buf = csvBuffer(`nombre,email\n${rows}\n`);
      await expect(service.importClientes(TENANT_ID, buf, 'x.csv')).rejects.toThrow(BadRequestException);
    });

    it('importa un CSV válido y crea los clientes vía createMany', async () => {
      const buf = csvBuffer('nombre,email,telefono\nJosé Pérez,jose@test.com,50212345678\n');

      const result = await service.importClientes(TENANT_ID, buf, 'clientes.csv');

      expect(prisma.cliente.createMany).toHaveBeenCalledWith({
        data: [expect.objectContaining({ tenant_id: TENANT_ID, nombre: 'José Pérez', email: 'jose@test.com' })],
        skipDuplicates: true,
      });
      expect(result.created).toBe(1);
      expect(result.errors).toHaveLength(0);
    });

    it('reconoce alias de columnas en español/inglés (correo, cel, cedula)', async () => {
      const buf = csvBuffer('nombre,correo,cel,cedula\nAna López,ana@test.com,55551234,1234567890123\n');

      await service.importClientes(TENANT_ID, buf, 'x.csv');

      const created = prisma.cliente.createMany.mock.calls[0][0].data[0];
      expect(created.email).toBe('ana@test.com');
      expect(created.telefono).toBe('55551234');
      expect(created.dpi).toBe('1234567890123');
    });

    it('avisa sobre columnas no reconocidas sin bloquear el import', async () => {
      const buf = csvBuffer('nombre,columna_rara\nJuan,valor\n');

      const result = await service.importClientes(TENANT_ID, buf, 'x.csv');

      expect(result.warnings[0]).toContain('columna_rara');
      expect(result.created).toBe(1);
    });

    it('rechaza fila sin nombre', async () => {
      const buf = csvBuffer('nombre,email\n,sin-nombre@test.com\n');

      const result = await service.importClientes(TENANT_ID, buf, 'x.csv');

      expect(result.errors).toContainEqual(
        expect.objectContaining({ row: 2, campo: 'nombre' }),
      );
    });

    it('rechaza nombre demasiado largo (>200 chars)', async () => {
      const buf = csvBuffer(`nombre,email\n${'A'.repeat(201)},x@test.com\n`);

      const result = await service.importClientes(TENANT_ID, buf, 'x.csv');

      expect(result.errors[0].campo).toBe('nombre');
    });

    it('rechaza email con formato inválido', async () => {
      const buf = csvBuffer('nombre,email\nJuan,no-es-un-email\n');

      const result = await service.importClientes(TENANT_ID, buf, 'x.csv');

      expect(result.errors).toContainEqual(
        expect.objectContaining({ campo: 'email', mensaje: expect.stringContaining('inválido') }),
      );
    });

    it('rechaza email ya existente en el tenant (duplicado contra BD)', async () => {
      prisma.cliente.findMany.mockResolvedValue([{ email: 'existente@test.com' }]);
      const buf = csvBuffer('nombre,email\nJuan,existente@test.com\n');

      const result = await service.importClientes(TENANT_ID, buf, 'x.csv');

      expect(result.errors).toContainEqual(
        expect.objectContaining({ campo: 'email', mensaje: expect.stringContaining('duplicado') }),
      );
      expect(prisma.cliente.createMany).not.toHaveBeenCalled();
    });

    it('rechaza email duplicado dentro del mismo archivo', async () => {
      const buf = csvBuffer('nombre,email\nJuan,dup@test.com\nPedro,dup@test.com\n');

      const result = await service.importClientes(TENANT_ID, buf, 'x.csv');

      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].row).toBe(3);
    });

    it('rechaza teléfono con letras inválidas', async () => {
      const buf = csvBuffer('nombre,telefono\nJuan,ABCDEFG\n');

      const result = await service.importClientes(TENANT_ID, buf, 'x.csv');

      expect(result.errors[0].campo).toBe('telefono');
    });

    it('rechaza DPI que no tiene 13 dígitos', async () => {
      const buf = csvBuffer('nombre,dpi\nJuan,123\n');

      const result = await service.importClientes(TENANT_ID, buf, 'x.csv');

      expect(result.errors[0].campo).toBe('dpi');
    });

    it('normaliza un origen no reconocido a OTRO', async () => {
      const buf = csvBuffer('nombre,origen\nJuan,Instagram Ads\n');

      await service.importClientes(TENANT_ID, buf, 'x.csv');

      expect(prisma.cliente.createMany.mock.calls[0][0].data[0].origen).toBe('OTRO');
    });

    it('acepta un origen válido tal cual (case-insensitive)', async () => {
      const buf = csvBuffer('nombre,origen\nJuan,referido\n');

      await service.importClientes(TENANT_ID, buf, 'x.csv');

      expect(prisma.cliente.createMany.mock.calls[0][0].data[0].origen).toBe('REFERIDO');
    });

    it('procesa un archivo .xlsx real (round-trip con exceljs)', async () => {
      const buf = await xlsxBuffer(['nombre', 'email'], [['María García', 'maria@test.com']]);

      const result = await service.importClientes(TENANT_ID, buf, 'clientes.xlsx');

      expect(result.created).toBe(1);
      expect(prisma.cliente.createMany.mock.calls[0][0].data[0].nombre).toBe('María García');
    });

    it('decodifica CSV con BOM UTF-8 correctamente', async () => {
      const bom = Buffer.from([0xef, 0xbb, 0xbf]);
      const buf = Buffer.concat([bom, csvBuffer('nombre,email\nÑandú Pérez,test@test.com\n')]);

      const result = await service.importClientes(TENANT_ID, buf, 'x.csv');

      expect(result.created).toBe(1);
      expect(prisma.cliente.createMany.mock.calls[0][0].data[0].nombre).toBe('Ñandú Pérez');
    });
  });

  // ─── importPropiedades ───────────────────────────────────────────

  describe('importPropiedades', () => {
    beforeEach(() => {
      prisma.tenant.findUnique.mockResolvedValue(mockTenant);
      prisma.propiedad.count.mockResolvedValue(0);
      prisma.propiedad.create.mockResolvedValue({ id: 'prop-new' });
      prisma.auditLog.create.mockResolvedValue({});
    });

    it('lanza BadRequestException si el archivo está vacío', async () => {
      const buf = csvBuffer('titulo,tipo,gestion\n');
      await expect(service.importPropiedades(TENANT_ID, buf, USER_ID, 'x.csv')).rejects.toThrow(BadRequestException);
    });

    it('lanza BadRequestException si el tenant no existe', async () => {
      prisma.tenant.findUnique.mockResolvedValue(null);
      const buf = csvBuffer('titulo,tipo,gestion\nCasa,CASA,VENTA\n');

      await expect(service.importPropiedades(TENANT_ID, buf, USER_ID, 'x.csv')).rejects.toThrow(BadRequestException);
    });

    it('lanza BadRequestException si ya se alcanzó el límite de propiedades', async () => {
      prisma.propiedad.count.mockResolvedValue(100);
      const buf = csvBuffer('titulo,tipo,gestion\nCasa,CASA,VENTA\n');

      await expect(service.importPropiedades(TENANT_ID, buf, USER_ID, 'x.csv')).rejects.toThrow(BadRequestException);
    });

    it('importa una propiedad válida generando código autoincremental', async () => {
      const buf = csvBuffer('titulo,tipo,gestion,precio_venta\nCasa en Zona 15,CASA,VENTA,850000\n');

      const result = await service.importPropiedades(TENANT_ID, buf, USER_ID, 'x.csv');

      expect(prisma.propiedad.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            tenant_id: TENANT_ID, codigo: 'CASA-0001', titulo: 'Casa en Zona 15',
            tipo: 'CASA', gestion: 'VENTA', estado: 'BORRADOR', precio_venta: 850000,
            agente_id: USER_ID,
          }),
        }),
      );
      expect(result.created).toBe(1);
    });

    it('reconoce alias de columnas (ciudad→municipio, colonia→zona, m2→area)', async () => {
      const buf = csvBuffer('titulo,tipo,gestion,ciudad,colonia,m2\nCasa,CASA,VENTA,Guatemala,15,120\n');

      await service.importPropiedades(TENANT_ID, buf, USER_ID, 'x.csv');

      const data = prisma.propiedad.create.mock.calls[0][0].data;
      expect(data.municipio).toBe('Guatemala');
      expect(data.zona).toBe('15');
      expect(data.area_construccion_m2).toBe(120);
    });

    it('rechaza fila sin título', async () => {
      const buf = csvBuffer('titulo,tipo,gestion\n,CASA,VENTA\n');

      const result = await service.importPropiedades(TENANT_ID, buf, USER_ID, 'x.csv');

      expect(result.errors[0]).toEqual(expect.objectContaining({ row: 2, campo: 'titulo' }));
    });

    it('rechaza tipo inválido', async () => {
      const buf = csvBuffer('titulo,tipo,gestion\nCasa,MANSION,VENTA\n');

      const result = await service.importPropiedades(TENANT_ID, buf, USER_ID, 'x.csv');

      expect(result.errors[0].campo).toBe('tipo');
    });

    it('rechaza gestión inválida', async () => {
      const buf = csvBuffer('titulo,tipo,gestion\nCasa,CASA,PERMUTA\n');

      const result = await service.importPropiedades(TENANT_ID, buf, USER_ID, 'x.csv');

      expect(result.errors[0].campo).toBe('gestion');
    });

    it('rechaza precio de venta menor o igual a 0', async () => {
      const buf = csvBuffer('titulo,tipo,gestion,precio_venta\nCasa,CASA,VENTA,0\n');

      const result = await service.importPropiedades(TENANT_ID, buf, USER_ID, 'x.csv');

      expect(result.errors[0].campo).toBe('precio_venta');
    });

    it('rechaza moneda no reconocida', async () => {
      const buf = csvBuffer('titulo,tipo,gestion,moneda\nCasa,CASA,VENTA,XYZ\n');

      const result = await service.importPropiedades(TENANT_ID, buf, USER_ID, 'x.csv');

      expect(result.errors[0].campo).toBe('moneda');
    });

    it('usa la moneda del tenant si la columna no viene informada', async () => {
      prisma.tenant.findUnique.mockResolvedValue({ ...mockTenant, moneda: 'USD' });
      const buf = csvBuffer('titulo,tipo,gestion\nCasa,CASA,VENTA\n');

      await service.importPropiedades(TENANT_ID, buf, USER_ID, 'x.csv');

      expect(prisma.propiedad.create.mock.calls[0][0].data.moneda).toBe('USD');
    });

    it('rechaza año de construcción fuera de rango', async () => {
      const buf = csvBuffer('titulo,tipo,gestion,ano_construccion\nCasa,CASA,VENTA,1500\n');

      const result = await service.importPropiedades(TENANT_ID, buf, USER_ID, 'x.csv');

      expect(result.errors[0].campo).toBe('ano_construccion');
    });

    it('rechaza habitaciones negativas', async () => {
      const buf = csvBuffer('titulo,tipo,gestion,habitaciones\nCasa,CASA,VENTA,-2\n');

      const result = await service.importPropiedades(TENANT_ID, buf, USER_ID, 'x.csv');

      expect(result.errors[0].campo).toBe('habitaciones');
    });

    it('detiene la creación cuando se alcanza el límite a mitad del import', async () => {
      prisma.tenant.findUnique.mockResolvedValue({ ...mockTenant, limite_propiedades: 1 });
      prisma.propiedad.count.mockResolvedValue(0);
      const buf = csvBuffer('titulo,tipo,gestion\nCasa 1,CASA,VENTA\nCasa 2,CASA,VENTA\n');

      const result = await service.importPropiedades(TENANT_ID, buf, USER_ID, 'x.csv');

      expect(result.created).toBe(1);
      expect(result.errors).toContainEqual(expect.objectContaining({ row: 3, campo: 'limite' }));
    });

    it('maneja el error de creación (código duplicado) sin abortar el import completo', async () => {
      prisma.propiedad.create
        .mockRejectedValueOnce(new Error('unique constraint'))
        .mockResolvedValueOnce({ id: 'prop-2' });
      const buf = csvBuffer('titulo,tipo,gestion\nCasa 1,CASA,VENTA\nCasa 2,CASA,VENTA\n');

      const result = await service.importPropiedades(TENANT_ID, buf, USER_ID, 'x.csv');

      expect(result.created).toBe(1);
      expect(result.errors).toContainEqual(expect.objectContaining({ row: 2, campo: 'codigo' }));
    });

    it('registra un audit log cuando se crean propiedades y hay userId', async () => {
      const buf = csvBuffer('titulo,tipo,gestion\nCasa,CASA,VENTA\n');

      await service.importPropiedades(TENANT_ID, buf, USER_ID, 'x.csv');

      expect(prisma.auditLog.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ tenant_id: TENANT_ID, user_id: USER_ID, modulo: 'Import' }),
        }),
      );
    });

    it('no registra audit log si no se creó ninguna propiedad', async () => {
      const buf = csvBuffer('titulo,tipo,gestion\n,CASA,VENTA\n');

      await service.importPropiedades(TENANT_ID, buf, USER_ID, 'x.csv');

      expect(prisma.auditLog.create).not.toHaveBeenCalled();
    });

    it('procesa un archivo .xlsx real con múltiples filas (round-trip con exceljs)', async () => {
      const buf = await xlsxBuffer(
        ['titulo', 'tipo', 'gestion', 'precio_venta'],
        [
          ['Casa Zona 10', 'CASA', 'VENTA', 550000],
          ['Apartamento Zona 14', 'APARTAMENTO', 'RENTA', 4500],
        ],
      );

      const result = await service.importPropiedades(TENANT_ID, buf, USER_ID, 'propiedades.xlsx');

      expect(result.created).toBe(2);
      expect(prisma.propiedad.create).toHaveBeenNthCalledWith(1,
        expect.objectContaining({ data: expect.objectContaining({ codigo: 'CASA-0001' }) }),
      );
      expect(prisma.propiedad.create).toHaveBeenNthCalledWith(2,
        expect.objectContaining({ data: expect.objectContaining({ codigo: 'APAR-0002' }) }),
      );
    });
  });

  // ─── Templates ────────────────────────────────────────────────────

  describe('plantillas CSV', () => {
    it('clientesTemplateCsv incluye encabezados y un ejemplo', () => {
      const csv = service.clientesTemplateCsv();
      expect(csv).toContain('nombre,email,telefono,dpi,origen,notas');
      expect(csv.split('\n')).toHaveLength(3); // header + example + trailing empty
    });

    it('propiedadesTemplateCsv incluye encabezados y un ejemplo', () => {
      const csv = service.propiedadesTemplateCsv();
      expect(csv).toContain('titulo,tipo,gestion');
      expect(csv).toContain('CASA,VENTA');
    });
  });
});
