import { Module } from '@nestjs/common';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { OwnerGuard } from './owner.guard';
import { SessionGuard } from './session.guard';

@Module({
  controllers: [AuthController],
  providers: [AuthService, SessionGuard, OwnerGuard],
  exports: [AuthService, SessionGuard, OwnerGuard],
})
export class AuthModule {}
