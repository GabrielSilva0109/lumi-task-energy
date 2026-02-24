import { Controller, Post, Body, Request, UseGuards } from '@nestjs/common';
import { AuthService } from './auth.service';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('login')
  async login(@Body() body: { username: string; password: string }) {
    const user = await this.authService.validateUser(body.username, body.password);
    if (!user) {
      return { message: 'Usuário ou senha inválidos' };
    }
    return this.authService.login(user);
  }

  @Post('register')
  async register(@Body() body: { username: string; password: string }) {
    console.log('register body:', body);
    return this.authService.register(body.username, body.password);
  }
}
