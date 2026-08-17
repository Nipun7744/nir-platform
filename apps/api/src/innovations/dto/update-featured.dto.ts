import { IsBoolean } from 'class-validator';

export class UpdateFeaturedDto {
  @IsBoolean()
  featured!: boolean;
}
