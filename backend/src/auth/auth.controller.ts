import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  Req,
  Res,
  UseGuards,
  ConflictException,
  UnauthorizedException,
} from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import type { Response } from 'express';
import { z } from 'zod';
import { isUniqueViolation, parseBody } from '../common/validation';
import { DatabaseService } from '../database/database.service';
import { AuthService } from './auth.service';
import { SessionGuard } from './session.guard';
import type { AuthenticatedRequest, AuthenticatedUser } from './auth.types';

const registrationSchema = z.object({
  name: z.string().trim().min(2).max(80),
  email: z.string().trim().email().max(254),
  password: z.string().min(8).max(128),
  role: z.enum(['customer', 'owner']),
});

const loginSchema = z.object({
  email: z.string().trim().email().max(254),
  password: z.string().min(1).max(128),
});

type UserWithPassword = AuthenticatedUser & { password_hash: string };

@Controller('auth')
export class AuthController {
  constructor(
    private readonly database: DatabaseService,
    private readonly authService: AuthService,
  ) {}

  @Post('register')
  async register(
    @Body() body: unknown,
    @Res({ passthrough: true }) response: Response,
  ): Promise<{ user: AuthenticatedUser }> {
    const input = parseBody(registrationSchema, body);
    const passwordHash = await this.authService.hashPassword(input.password);
    let user: AuthenticatedUser;

    try {
      const result = await this.database.query<AuthenticatedUser>(
        `INSERT INTO users (id, name, email, password_hash, role)
         VALUES ($1, $2, $3, $4, $5)
         RETURNING id, name, email, role`,
        [
          randomUUID(),
          input.name,
          input.email.toLowerCase(),
          passwordHash,
          input.role,
        ],
      );
      user = result.rows[0];
    } catch (error) {
      if (isUniqueViolation(error)) {
        throw new ConflictException('An account with this email already exists');
      }
      throw error;
    }

    await this.authService.startSession(user.id, response);
    response.status(HttpStatus.CREATED);
    return { user };
  }

  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(
    @Body() body: unknown,
    @Res({ passthrough: true }) response: Response,
  ): Promise<{ user: AuthenticatedUser }> {
    const input = parseBody(loginSchema, body);
    const result = await this.database.query<UserWithPassword>(
      `SELECT id, name, email, role, password_hash
       FROM users
       WHERE email = $1`,
      [input.email.toLowerCase()],
    );
    const user = result.rows[0];
    if (!user || !(await this.authService.verifyPassword(input.password, user.password_hash))) {
      throw new UnauthorizedException('Email or password is incorrect');
    }

    await this.authService.startSession(user.id, response);
    const { password_hash: _passwordHash, ...publicUser } = user;
    return { user: publicUser };
  }

  @Post('logout')
  @HttpCode(HttpStatus.OK)
  async logout(
    @Req() request: AuthenticatedRequest,
    @Res({ passthrough: true }) response: Response,
  ): Promise<{ ok: true }> {
    await this.authService.endSession(request, response);
    return { ok: true };
  }

  @Get('me')
  @UseGuards(SessionGuard)
  currentUser(@Req() request: AuthenticatedRequest): { user: AuthenticatedUser } {
    return { user: request.user! };
  }
}
