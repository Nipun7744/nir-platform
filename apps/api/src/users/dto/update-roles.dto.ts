import { IsArray, ArrayNotEmpty } from 'class-validator';
import { Role } from '@prisma/client';

export class UpdateRolesDto {
  @IsArray()
  @ArrayNotEmpty()
  roles!: Role[];
}
