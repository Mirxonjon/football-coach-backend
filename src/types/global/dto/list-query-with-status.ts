import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsOptional } from 'class-validator';
import { Transform } from 'class-transformer';
import { DefaultStatusEnum } from '../constants';
import { ListQueryDto } from './list-query.dto';
import { DefaultStatusType } from '../types';

export class ListQueryWithStatusDto extends ListQueryDto {
  @ApiProperty({
    required: false,
    enum: DefaultStatusEnum,
    default: DefaultStatusEnum.Active,
  })
  @Transform(({ value }) => {
    if (typeof value === 'string') {
      return parseInt(value, 10);
    }
    return value;
  })
  @IsOptional()
  @IsEnum(DefaultStatusEnum)
  status?: DefaultStatusType;
}
