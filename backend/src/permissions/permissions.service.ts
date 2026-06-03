import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { PermissionResponseDto } from './dto/permission-response.dto';

@Injectable()
export class PermissionsService {
  constructor(private readonly prisma: PrismaService) {}

  async lister(): Promise<PermissionResponseDto[]> {
    return this.prisma.permissions.findMany({
      orderBy: [{ module: 'asc' }, { nom: 'asc' }],
    }) as Promise<PermissionResponseDto[]>;
  }
}
