import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { INotaFiscalRepository, CreateNotaFiscalData } from '../../../../core/interfaces/repositories/i-nota-fiscal.repository';
import { NotaFiscal, ItemNfe } from '@prisma/client';

@Injectable()
export class PrismaNotaFiscalRepository implements INotaFiscalRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: CreateNotaFiscalData): Promise<NotaFiscal & { itensNfe: ItemNfe[] }> {
    return this.prisma.notaFiscal.create({
      data: {
        chaveAcesso: data.chaveAcesso,
        numero: data.numero,
        serie: data.serie,
        cnpjEmitente: data.cnpjEmitente,
        dataEmissao: data.dataEmissao,
        valorTotal: data.valorTotal,
        xmlOriginal: data.xmlOriginal,
        status: data.status,
        divergencias: data.divergencias,
        itensNfe: {
          create: data.itensNfe,
        },
      },
      include: {
        itensNfe: true,
      },
    });
  }

  async findByChaveAcesso(chaveAcesso: string): Promise<NotaFiscal | null> {
    return this.prisma.notaFiscal.findUnique({
      where: { chaveAcesso },
    });
  }

  async updateStatus(id: number, status: string, divergencias?: string): Promise<NotaFiscal> {
    return this.prisma.notaFiscal.update({
      where: { id },
      data: { status, divergencias },
    });
  }

  async findById(id: number): Promise<(NotaFiscal & { itensNfe: ItemNfe[] }) | null> {
    return this.prisma.notaFiscal.findUnique({
      where: { id },
      include: {
        itensNfe: true,
      },
    });
  }

  async findDivergent(): Promise<NotaFiscal[]> {
    return this.prisma.notaFiscal.findMany({
      where: { status: 'DIVERGENTE' },
      orderBy: { dataEmissao: 'desc' },
    });
  }
}
