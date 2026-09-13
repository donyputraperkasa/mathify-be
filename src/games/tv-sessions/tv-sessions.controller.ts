import {
  Body,
  Controller,
  Get,
  Headers,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import {
  BattlePointDto,
  RemoteControlActionDto,
} from './dto/battle-action.dto';
import { CreateTvSessionDto } from './dto/create-tv-session.dto';
import { TvSessionsService } from './tv-sessions.service';

@ApiTags('Games - Smart TV Sessions & 2-Player Math Battle (Tarik Tambang)')
@Controller('games/tv-sessions')
export class TvSessionsController {
  constructor(private readonly tvSessionsService: TvSessionsService) {}

  @Post()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary:
      'Create a Smart TV room session (Kartu Balik, Tarik Tambang Matematika, Roda Putar)',
    description:
      'Generates roomCode for the classroom Smart TV browser, and hostControlKey for the teacher remote.',
  })
  @ApiResponse({
    status: 201,
    description: 'Room session created successfully',
  })
  async createSession(
    @CurrentUser('sub') userId: string,
    @Body() dto: CreateTvSessionDto,
  ) {
    return this.tvSessionsService.createSession(userId, dto);
  }

  @Get(':roomCode')
  @ApiOperation({
    summary:
      'Smart TV Screen Display (Layar Tampilan Smart TV - Khusus Nonton/Publik)',
  })
  @ApiResponse({
    status: 200,
    description: 'Smart TV screen display state returned',
  })
  async getSession(@Param('roomCode') roomCode: string) {
    return this.tvSessionsService.getSessionByCode(roomCode);
  }

  @Patch(':roomCode/card/:index')
  @ApiOperation({
    summary:
      'Teacher Remote: Navigate question card on Smart TV (Dilindungi kunci remote guru)',
  })
  async updateCardIndex(
    @Param('roomCode') roomCode: string,
    @Param('index') index: string,
    @Body() dto?: RemoteControlActionDto,
    @Headers('x-host-control-key') headerKey?: string,
  ) {
    const key = dto?.hostControlKey ?? headerKey;
    return this.tvSessionsService.updateCardIndex(
      roomCode,
      parseInt(index, 10),
      undefined,
      key,
    );
  }

  @Post(':roomCode/battle/point')
  @ApiOperation({
    summary:
      'Teacher Remote: Award point in Tug-of-War Math Battle (Tarik tali tambang & cek pemenang)',
    description:
      'Shifts rope animation on TV screen. When the target lead is reached, the winner is automatically declared!',
  })
  async awardBattlePoint(
    @Param('roomCode') roomCode: string,
    @Body() dto: BattlePointDto,
    @Headers('x-host-control-key') headerKey?: string,
  ) {
    const key = dto.hostControlKey ?? headerKey;
    return this.tvSessionsService.awardBattlePoint(
      roomCode,
      dto.scorer,
      undefined,
      key,
    );
  }

  @Post(':roomCode/battle/reset')
  @ApiOperation({
    summary:
      'Teacher Remote: Reset battle arena (Ulang skor & posisi tali untuk giliran 2 siswa berikutnya)',
  })
  async resetBattle(
    @Param('roomCode') roomCode: string,
    @Body() dto?: RemoteControlActionDto,
    @Headers('x-host-control-key') headerKey?: string,
  ) {
    const key = dto?.hostControlKey ?? headerKey;
    return this.tvSessionsService.resetBattle(roomCode, undefined, key);
  }

  @Post(':roomCode/finish')
  @ApiOperation({
    summary:
      'Teacher Remote: Finish and close session (Selesaikan sesi permainan di Smart TV)',
  })
  async finishSession(
    @Param('roomCode') roomCode: string,
    @Body() dto?: RemoteControlActionDto,
    @Headers('x-host-control-key') headerKey?: string,
  ) {
    const key = dto?.hostControlKey ?? headerKey;
    return this.tvSessionsService.finishSession(roomCode, undefined, key);
  }
}
