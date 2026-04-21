import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  MaxFileSizeValidator,
  ParseFilePipe,
  Post,
  Query,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiBearerAuth,
  ApiBody,
  ApiConsumes,
  ApiOperation,
  ApiQuery,
  ApiTags,
} from '@nestjs/swagger';
import { StorageService } from '@/common/services/storage/storage.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import {
  PresignUploadDto,
  UPLOAD_FOLDERS,
  UploadFolderName,
} from './dto/presign-upload.dto';

// 500 MB upload hard cap per file
const MAX_FILE_SIZE = 500 * 1024 * 1024;

@ApiTags('Admin - Uploads')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN')
@Controller('admin/uploads')
export class UploadAdminController {
  constructor(private readonly storage: StorageService) {}

  @Post('file')
  @ApiOperation({
    summary:
      'Upload a file directly through the backend (multipart/form-data). Use for small assets.',
  })
  @ApiConsumes('multipart/form-data')
  @ApiQuery({ name: 'folder', enum: UPLOAD_FOLDERS })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: { type: 'string', format: 'binary' },
      },
      required: ['file'],
    },
  })
  @UseInterceptors(FileInterceptor('file'))
  async uploadFile(
    @Query('folder') folder: UploadFolderName,
    @UploadedFile(
      new ParseFilePipe({
        validators: [new MaxFileSizeValidator({ maxSize: MAX_FILE_SIZE })],
      }),
    )
    file: Express.Multer.File,
  ) {
    if (!UPLOAD_FOLDERS.includes(folder)) {
      throw new BadRequestException(
        `Invalid folder. Allowed: ${UPLOAD_FOLDERS.join(', ')}`,
      );
    }
    return this.storage.uploadFileDetailed(file, folder);
  }

  @Post('presign')
  @ApiOperation({
    summary:
      'Get a presigned PUT URL for direct-to-R2 client upload. Preferred for large videos/books.',
  })
  async presign(@Body() dto: PresignUploadDto) {
    const { url, key, publicUrl } = await this.storage.getSignedUploadUrl(
      dto.folder,
      dto.originalName,
      dto.contentType,
      dto.expiresInSec ?? 900,
    );
    return {
      uploadUrl: url,
      method: 'PUT',
      headers: { 'Content-Type': dto.contentType },
      key,
      publicUrl,
      expiresInSec: dto.expiresInSec ?? 900,
    };
  }

  @Delete('object')
  @ApiOperation({ summary: 'Delete an object by its key or public URL' })
  @ApiQuery({ name: 'key', required: false })
  @ApiQuery({ name: 'url', required: false })
  async deleteObject(@Query('key') key?: string, @Query('url') url?: string) {
    if (!key && !url) {
      throw new BadRequestException('Either `key` or `url` query param is required');
    }
    if (key) await this.storage.deleteByKey(key);
    else await this.storage.deleteByUrl(url!);
    return { success: true };
  }
}
