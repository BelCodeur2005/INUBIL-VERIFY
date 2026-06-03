import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class PermissionResponseDto {
  @ApiProperty() id: string;
  @ApiProperty() nom: string;
  @ApiPropertyOptional() description?: string | null;
  @ApiProperty() module: string;
  @ApiProperty() created_at: Date;
}
