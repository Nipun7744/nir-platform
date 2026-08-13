import { PartialType } from '@nestjs/swagger';
import { CreateInnovationDto } from './create-innovation.dto';

export class UpdateInnovationDto extends PartialType(CreateInnovationDto) {}
