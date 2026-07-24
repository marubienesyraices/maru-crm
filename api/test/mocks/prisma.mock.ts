import { PrismaService } from '../../src/prisma/prisma.service';

export type MockPrismaService = {
  [K in keyof PrismaService]: jest.Mock;
} & {
  tenant: { [key: string]: jest.Mock };
  user: { [key: string]: jest.Mock };
  session: { [key: string]: jest.Mock };
  auditLog: { [key: string]: jest.Mock };
  configSeguridad: { [key: string]: jest.Mock };
  catalogoPlan: { [key: string]: jest.Mock };
  propiedad: { [key: string]: jest.Mock };
  propietario: { [key: string]: jest.Mock };
  propiedadImagen: { [key: string]: jest.Mock };
  propiedadDocumento: { [key: string]: jest.Mock };
  cliente: { [key: string]: jest.Mock };
  clientePropiedad: { [key: string]: jest.Mock };
  notificacion: { [key: string]: jest.Mock };
  interaccion: { [key: string]: jest.Mock };
  visita: { [key: string]: jest.Mock };
  favorito: { [key: string]: jest.Mock };
  busquedaGuardada: { [key: string]: jest.Mock };
  brochureDescarga: { [key: string]: jest.Mock };
  brochureJob: { [key: string]: jest.Mock };
  whatsappEnvio: { [key: string]: jest.Mock };
  sindicacionPublicacion: { [key: string]: jest.Mock };
  $executeRawUnsafe: jest.Mock;
  $executeRaw: jest.Mock;
  $queryRaw: jest.Mock;
  $transaction: jest.Mock;
};

export function createMockPrismaService(): MockPrismaService {
  return {
    tenant: {
      create: jest.fn(),
      findMany: jest.fn(),
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      update: jest.fn(),
      upsert: jest.fn(),
      count: jest.fn(),
      delete: jest.fn(),
    },
    user: {
      create: jest.fn(),
      findMany: jest.fn(),
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      update: jest.fn(),
      count: jest.fn(),
      upsert: jest.fn(),
    },
    session: {
      create: jest.fn(),
      findMany: jest.fn(),
      findUnique: jest.fn(),
      delete: jest.fn(),
      deleteMany: jest.fn(),
    },
    auditLog: {
      create: jest.fn(),
      findMany: jest.fn(),
      count: jest.fn(),
    },
    configSeguridad: {
      create: jest.fn(),
      findUnique: jest.fn(),
      upsert: jest.fn(),
    },
    catalogoPlan: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
      upsert: jest.fn(),
    },
    propiedad: {
      create: jest.fn(),
      findMany: jest.fn(),
      findFirst: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      count: jest.fn(),
      groupBy: jest.fn(),
    },
    propietario: {
      create: jest.fn(),
      findMany: jest.fn(),
      findFirst: jest.fn(),
      update: jest.fn(),
      count: jest.fn(),
    },
    propiedadImagen: {
      create: jest.fn(),
      findMany: jest.fn(),
      findFirst: jest.fn(),
      update: jest.fn(),
      updateMany: jest.fn(),
      delete: jest.fn(),
      aggregate: jest.fn(),
    },
    propiedadDocumento: {
      create: jest.fn(),
      findMany: jest.fn(),
      findFirst: jest.fn(),
      delete: jest.fn(),
    },
    cliente: {
      create: jest.fn(),
      createMany: jest.fn(),
      findMany: jest.fn(),
      findFirst: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
      count: jest.fn(),
      groupBy: jest.fn(),
    },
    clientePropiedad: {
      create: jest.fn(),
      findMany: jest.fn(),
      findFirst: jest.fn(),
      update: jest.fn(),
      upsert: jest.fn(),
      delete: jest.fn(),
      count: jest.fn(),
      groupBy: jest.fn(),
      aggregate: jest.fn(),
    },
    notificacion: {
      create: jest.fn(),
      createMany: jest.fn(),
      findMany: jest.fn(),
      findFirst: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
      updateMany: jest.fn(),
      count: jest.fn(),
    },
    interaccion: {
      create: jest.fn(),
      findMany: jest.fn(),
      findFirst: jest.fn(),
      delete: jest.fn(),
      count: jest.fn(),
      groupBy: jest.fn(),
    },
    visita: {
      create: jest.fn(),
      findMany: jest.fn(),
      findFirst: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      count: jest.fn(),
    },
    brochureDescarga: {
      create: jest.fn(),
      findMany: jest.fn(),
      count: jest.fn(),
    },
    brochureJob: {
      findMany: jest.fn(),
      deleteMany: jest.fn(),
    },
    whatsappEnvio: {
      deleteMany: jest.fn(),
    },
    sindicacionPublicacion: {
      create: jest.fn(),
      findMany: jest.fn(),
      findFirst: jest.fn(),
      upsert: jest.fn(),
      update: jest.fn(),
    },
    favorito: {
      create: jest.fn(),
      findMany: jest.fn(),
      findFirst: jest.fn(),
      upsert: jest.fn(),
      delete: jest.fn(),
      deleteMany: jest.fn(),
    },
    busquedaGuardada: {
      create: jest.fn(),
      findMany: jest.fn(),
      findFirst: jest.fn(),
      delete: jest.fn(),
    },
    $executeRawUnsafe: jest.fn(),
    $executeRaw: jest.fn(),
    $queryRaw: jest.fn(),
    $transaction: jest.fn(),
    onModuleInit: jest.fn(),
    onModuleDestroy: jest.fn(),
    $connect: jest.fn(),
    $disconnect: jest.fn(),
  } as unknown as MockPrismaService;
}
