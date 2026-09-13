jest.mock('@nestjs/jwt', () => ({
  JwtService: jest.fn().mockImplementation(() => ({
    sign: jest.fn().mockReturnValue('mock-jwt-token'),
  })),
}));

import { ConflictException, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Test, TestingModule } from '@nestjs/testing';
import * as bcrypt from 'bcryptjs';
import { PrismaService } from '../prisma/prisma.service';
import { AuthService } from './auth.service';

describe('AuthService (Unified Account Registration & Login)', () => {
  let service: AuthService;
  let prisma: {
    user: {
      findUnique: jest.Mock;
      create: jest.Mock;
    };
  };
  let jwtService: { sign: jest.Mock };

  beforeEach(async () => {
    prisma = {
      user: {
        findUnique: jest.fn(),
        create: jest.fn(),
      },
    };
    jwtService = {
      sign: jest.fn().mockReturnValue('mock-jwt-token'),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: PrismaService, useValue: prisma },
        { provide: JwtService, useValue: jwtService },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
  });

  describe('Unified Registration', () => {
    it('should register a new user with default role USER and 0 balances', async () => {
      prisma.user.findUnique.mockResolvedValue(null);
      prisma.user.create.mockResolvedValue({
        id: 'user-new',
        email: 'dony@satelyd.com',
        name: 'Dony Perkasa',
        role: 'USER',
        gameTokenBalance: 0,
        examCreditBalance: 0,
      });

      const res = await service.register({
        name: 'Dony Perkasa',
        email: 'dony@satelyd.com',
        password: 'Password123!',
      });

      expect(res.user.role).toBe('USER');
      expect(res.user.gameTokenBalance).toBe(0);
      expect(res.user.examCreditBalance).toBe(0);
      expect(res.accessToken).toBe('mock-jwt-token');
    });

    it('should throw ConflictException if email is already taken', async () => {
      prisma.user.findUnique.mockResolvedValue({ id: 'existing' });

      await expect(
        service.register({
          name: 'Duplikat',
          email: 'dony@satelyd.com',
          password: 'Password123!',
        }),
      ).rejects.toThrow(ConflictException);
    });
  });

  describe('Login', () => {
    it('should login successfully with valid credentials', async () => {
      const hashedPassword = await bcrypt.hash('Password123!', 10);
      prisma.user.findUnique.mockResolvedValue({
        id: 'user-1',
        email: 'dony@satelyd.com',
        name: 'Dony Perkasa',
        role: 'USER',
        password: hashedPassword,
        gameTokenBalance: 5,
        examCreditBalance: 2,
      });

      const res = await service.login({
        email: 'dony@satelyd.com',
        password: 'Password123!',
      });

      expect(res.accessToken).toBe('mock-jwt-token');
      expect(res.user.gameTokenBalance).toBe(5);
    });

    it('should throw UnauthorizedException if password does not match', async () => {
      const hashedPassword = await bcrypt.hash('CorrectPass!', 10);
      prisma.user.findUnique.mockResolvedValue({
        id: 'user-1',
        email: 'dony@satelyd.com',
        password: hashedPassword,
      });

      await expect(
        service.login({
          email: 'dony@satelyd.com',
          password: 'WrongPassword!',
        }),
      ).rejects.toThrow(UnauthorizedException);
    });
  });
});
