import {
  Controller,
  Get,
  Post,
  Delete,
  Param,
  Body,
  Req,
  ParseIntPipe,
  UseInterceptors,
  UploadedFiles,
  Query,
  UseGuards,
} from '@nestjs/common';
import { AiChatService } from './ai-chat.service';
import { CreateChatDto } from '../../types/ai-chat/create-chat.dto';
import { SendMessageDto } from '../../types/ai-chat/send-message.dto';
import { FilesInterceptor } from '@nestjs/platform-express';
import { ApiBearerAuth, ApiConsumes, ApiQuery, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '@/modules/auth/guards/jwt-auth.guard';

@ApiTags('AI Chat')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('ai/chats')
export class AiChatController {
  constructor(private readonly aiChatService: AiChatService) {}

  @Get()
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  findAll(
    @Req() req,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    return this.aiChatService.findAllChats(req.user.id, page || 1, limit || 20);
  }

  @Post()
  create(@Req() req, @Body() dto: CreateChatDto) {
    return this.aiChatService.createChat(req.user.id, dto.title);
  }

  @Get(':id')
  findOne(@Req() req, @Param('id', ParseIntPipe) id: number) {
    return this.aiChatService.findChatById(req.user.id, id);
  }

  @Post(':id/messages')
  @UseInterceptors(FilesInterceptor('images', 5))
  @ApiConsumes('multipart/form-data')
  sendMessage(
    @Req() req,
    @Param('id', ParseIntPipe) chatId: number,
    @Body() dto: SendMessageDto,
    @UploadedFiles() images?: Express.Multer.File[],
  ) {
    return this.aiChatService.sendMessage(
      req.user.id,
      chatId,
      dto.text,
      req.ip,
      images,
    );
  }

  @Delete(':id')
  remove(@Req() req, @Param('id', ParseIntPipe) id: number) {
    return this.aiChatService.deleteChat(req.user.id, id);
  }
}
