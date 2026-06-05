import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

export class SendBookChatMessageDto {
  @ApiProperty({
    example: "Bu kitobda dribling haqida nima yozilgan?",
    description:
      "Foydalanuvchi savoli. Til avtomatik aniqlanadi (UZ/RU). Backend faqat shu kitob parchalari asosida javob beradi.",
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(2000)
  message: string;
}
