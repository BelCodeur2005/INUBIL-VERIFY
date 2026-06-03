import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { PermissionResponseDto } from '../../permissions/dto/permission-response.dto';

export class RoleResponseDto {
  @ApiProperty() id: string;
  @ApiProperty() nom: string;
  @ApiPropertyOptional() description?: string | null;
  @ApiProperty() est_systeme: boolean;
  @ApiPropertyOptional() universite_id?: string | null;
  @ApiPropertyOptional() created_by?: string | null;
  @ApiProperty() created_at: Date;
  @ApiProperty() updated_at: Date;
  @ApiPropertyOptional({ type: [PermissionResponseDto] })
  permissions?: PermissionResponseDto[];
}
