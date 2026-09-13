import {
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Role } from '@prisma/client';
import * as bcrypt from 'bcryptjs';
import { PrismaService } from '../prisma/prisma.service';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { JwtPayload } from './strategies/jwt.strategy';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
  ) {}

  async register(dto: RegisterDto) {
    const existing = await this.prisma.user.findUnique({
      where: { email: dto.email.toLowerCase().trim() },
    });

    if (existing) {
      throw new ConflictException('Email sudah terdaftar');
    }

    const hashedPassword = await bcrypt.hash(dto.password, 10);
    const user = await this.prisma.user.create({
      data: {
        email: dto.email.toLowerCase().trim(),
        password: hashedPassword,
        name: dto.name.trim(),
        role: Role.USER,
        gameTokenBalance: 0,
        examCreditBalance: 0,
      },
    });

    const token = this.generateToken(user.id, user.email, user.role);

    return {
      message: 'Pendaftaran berhasil',
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        gameTokenBalance: user.gameTokenBalance,
        examCreditBalance: user.examCreditBalance,
      },
      accessToken: token,
    };
  }

  async login(dto: LoginDto) {
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email.toLowerCase().trim() },
    });

    if (!user) {
      throw new UnauthorizedException('Email atau kata sandi tidak cocok');
    }

    const isMatch = await bcrypt.compare(dto.password, user.password);
    if (!isMatch) {
      throw new UnauthorizedException('Email atau kata sandi tidak cocok');
    }

    const token = this.generateToken(user.id, user.email, user.role);

    return {
      message: 'Login berhasil',
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        gameTokenBalance: user.gameTokenBalance,
        examCreditBalance: user.examCreditBalance,
      },
      accessToken: token,
    };
  }

  private generateToken(userId: string, email: string, role: string): string {
    const payload: JwtPayload = { sub: userId, email, role };
    return this.jwtService.sign(payload);
  }
}
