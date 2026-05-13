import { ApiProperty } from '@nestjs/swagger';
import { ArrayMinSize, ArrayMaxSize, IsArray, IsInt, Min } from 'class-validator';

export class AcceptConsentDto {
  @ApiProperty({
    type: [Number],
    example: [1, 2, 3, 4],
    description:
      'IDs of the LegalDocument rows the user is accepting. Typically the IDs returned by GET /me/consents/pending.',
  })
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(20)
  @IsInt({ each: true })
  @Min(1, { each: true })
  documentIds: number[];
}
