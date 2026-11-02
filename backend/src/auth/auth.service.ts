import {
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import {
  createHash,
  randomBytes,
  randomUUID,
  scrypt as nodeScrypt,
  timingSafeEqual,
} from 'node:crypto';
import { promisify } from 'node:util';
import type { Response } from 'express';
import { DatabaseService } from '../database/database.service';
import type { AuthenticatedRequest, AuthenticatedUser } from './auth.types';

const scrypt = promisify(nodeScrypt);
const SESSION_COOKIE = 'trimly_session';
const SESSION_DURATION_MS = 14 * 24 * 60 * 60 * 1000;

@Injectable()
export class AuthService {
  constructor(private readonly database: DatabaseService) {}

  async hashPassword(password: string): Promise<string> {
    const salt = randomBytes(16).toString('hex');
    const derivedKey = (await scrypt(password, salt, 64)) as Buffer;
    return `${salt}:${derivedKey.toString('hex')}`;
  }

  async verifyPassword(password: string, storedHash: string): Promise<boolean> {
    const [salt, expectedHex] = storedHash.split(':');
    if (!salt || !expectedHex || !/^[a-f0-9]{128}$/i.test(expectedHex)) {
      return false;
    }

    const actual = (await scrypt(password, salt, 64)) as Buffer;
    const expected = Buffer.from(expectedHex, 'hex');
    return actual.length === expected.length && timingSafeEqual(actual, expected);
  }

  async startSession(
    userId: string,
    response: Response,
  ): Promise<void> {
    const token = randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + SESSION_DURATION_MS);

    await this.database.query('DELETE FROM sessions WHERE expires_at <= now()');
    await this.database.query(
      `INSERT INTO sessions (id, user_id, token_hash, expires_at)
       VALUES ($1, $2, $3, $4)`,
      [randomUUID(), userId, this.hashSessionToken(token), expiresAt],
    );

    response.cookie(SESSION_COOKIE, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      expires: expiresAt,
    });
  }

  async endSession(
    request: AuthenticatedRequest,
    response: Response,
  ): Promise<void> {
    const token = this.readSessionToken(request);
    if (token) {
      await this.database.query(
        'DELETE FROM sessions WHERE token_hash = $1',
        [this.hashSessionToken(token)],
      );
    }
    response.clearCookie(SESSION_COOKIE, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
    });
  }

  async authenticate(request: AuthenticatedRequest): Promise<AuthenticatedUser> {
    const token = this.readSessionToken(request);
    if (!token) {
      throw new UnauthorizedException('Sign in to continue');
    }

    const result = await this.database.query<AuthenticatedUser>(
      `SELECT users.id, users.name, users.email, users.role
       FROM sessions
       JOIN users ON users.id = sessions.user_id
       WHERE sessions.token_hash = $1 AND sessions.expires_at > now()`,
      [this.hashSessionToken(token)],
    );
    const user = result.rows[0];
    if (!user) {
      throw new UnauthorizedException('Sign in to continue');
    }
    return user;
  }

  private readSessionToken(request: AuthenticatedRequest): string | null {
    const cookie = request.headers.cookie
      ?.split(';')
      .map((part) => part.trim())
      .find((part) => part.startsWith(`${SESSION_COOKIE}=`));
    return cookie?.slice(SESSION_COOKIE.length + 1) || null;
  }

  private hashSessionToken(token: string): string {
    return createHash('sha256').update(token).digest('hex');
  }
}
