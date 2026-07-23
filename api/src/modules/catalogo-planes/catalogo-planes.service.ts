import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { Plan } from '@prisma/client';
import { UpdateCatalogoPlanDto } from './dto';

@Injectable()
export class CatalogoPlanesService {
  constructor(private prisma: PrismaService) {}

  findAll() {
    return this.prisma.catalogoPlan.findMany({
      orderBy: { plan: 'asc' },
    });
  }

  async findOne(plan: string) {
    const config = await this.prisma.catalogoPlan.findUnique({
      where: { plan: plan as Plan },
    });
    if (!config)
      throw new NotFoundException(
        `Plan "${plan}" no encontrado en el catálogo`,
      );
    return config;
  }

  async update(plan: string, dto: UpdateCatalogoPlanDto) {
    await this.findOne(plan);
    return this.prisma.catalogoPlan.update({
      where: { plan: plan as Plan },
      data: dto,
    });
  }
}
