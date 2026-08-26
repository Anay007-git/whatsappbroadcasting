import { PipeTransform, ArgumentMetadata, BadRequestException } from '@nestjs/common';
import { ZodSchema } from 'zod';

export class ZodValidationPipe implements PipeTransform {
  constructor(private schema: ZodSchema) {}

  transform(value: unknown, metadata: ArgumentMetadata) {
    // Only validate body or query if type matches
    if (metadata.type === 'custom') return value;

    const result = this.schema.safeParse(value);
    if (!result.success) {
      const errorDetails = result.error.errors.map((err) => ({
        path: err.path.join('.'),
        message: err.message,
      }));

      throw new BadRequestException({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid request payload',
          details: errorDetails,
        },
      });
    }

    return result.data;
  }
}
