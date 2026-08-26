import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import * as fs from 'fs';
import * as path from 'path';

@Injectable()
export class MediaService {
  private uploadDir = path.join(process.cwd(), 'uploads');

  constructor(private prisma: PrismaService) {
    if (!fs.existsSync(this.uploadDir)) {
      fs.mkdirSync(this.uploadDir, { recursive: true });
    }
  }

  async saveUploadedFile(organizationId: string, file: Express.Multer.File) {
    if (!file) {
      throw new BadRequestException('No file uploaded');
    }

    const ext = path.extname(file.originalname);
    const filename = `${organizationId.slice(0, 8)}_${Date.now()}_${Math.random().toString(36).substring(2, 8)}${ext}`;
    const filePath = path.join(this.uploadDir, filename);

    fs.writeFileSync(filePath, file.buffer);

    const publicUrl = `/uploads/${filename}`;

    const media = await this.prisma.media.create({
      data: {
        organizationId,
        filename: file.originalname,
        mimeType: file.mimetype,
        size: file.size,
        storageKey: filename,
        url: publicUrl,
      },
    });

    return media;
  }

  async listMedia(organizationId: string) {
    return this.prisma.media.findMany({
      where: { organizationId },
      orderBy: { createdAt: 'desc' },
    });
  }
}
