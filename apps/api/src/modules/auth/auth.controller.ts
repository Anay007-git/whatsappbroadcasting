import { Controller, Post, Get, Body, Req, Ip, UsePipes } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { Public } from '../../common/decorators/public.decorator';
import { CurrentUser, AuthenticatedUser } from '../../common/decorators/current-user.decorator';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe';
import { LoginSchema, RegisterSchema } from '@eventblast/validation';
import { Request } from 'express';
import { z } from 'zod';

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @Public()
  @Post('login')
  @UsePipes(new ZodValidationPipe(LoginSchema))
  @ApiOperation({ summary: 'Log in with email and password' })
  async login(
    @Body() body: z.infer<typeof LoginSchema>,
    @Ip() ip: string,
    @Req() req: Request,
  ) {
    const userAgent = req.headers['user-agent'] || 'Unknown';
    return this.authService.login(body, ip, userAgent);
  }

  @Public()
  @Post('register')
  @UsePipes(new ZodValidationPipe(RegisterSchema))
  @ApiOperation({ summary: 'Register a new organization and owner account' })
  async register(
    @Body() body: z.infer<typeof RegisterSchema>,
    @Ip() ip: string,
    @Req() req: Request,
  ) {
    const userAgent = req.headers['user-agent'] || 'Unknown';
    return this.authService.register(body, ip, userAgent);
  }

  @Get('me')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get profile of the currently logged-in user' })
  async getMe(@CurrentUser() user: AuthenticatedUser) {
    return this.authService.getMe(user.userId);
  }
}
