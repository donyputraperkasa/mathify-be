import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiQuery,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { AddCardDto } from './dto/add-card.dto';
import { CreateDeckDto } from './dto/create-deck.dto';
import { GameDecksService } from './game-decks.service';

@ApiTags('Game Decks (Bank Soal Multi-Game: Flip Card, Math Battle, Roda Putar, Trivia)')
@Controller(['games/decks', 'games/flip-cards'])
export class GameDecksController {
  constructor(private readonly gameDecksService: GameDecksService) {}

  @Get()
  @ApiOperation({
    summary: 'Get public question decks (Gratis untuk guru & siswa)',
  })
  @ApiQuery({
    name: 'search',
    required: false,
    description: 'Cari judul materi',
  })
  @ApiQuery({
    name: 'subject',
    required: false,
    description: 'Filter mata pelajaran',
  })
  async getPublicDecks(
    @Query('search') search?: string,
    @Query('subject') subject?: string,
  ) {
    return this.gameDecksService.getPublicDecks(search, subject);
  }

  @Get('my-decks')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Get question decks created by current user (Milik Saya)',
  })
  async getMyDecks(@CurrentUser('sub') userId: string) {
    return this.gameDecksService.getMyDecks(userId);
  }

  @Get(':id')
  @ApiOperation({
    summary:
      'Get deck details and questions (Maksimal 10 kartu untuk mode gratis)',
  })
  async getDeckById(@Param('id') deckId: string) {
    return this.gameDecksService.getDeckById(deckId);
  }

  @Post()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary:
      'Create a new question deck (Gratis s/d 10 kartu, butuh 1 Token Game jika > 10)',
  })
  @ApiResponse({ status: 201, description: 'Deck successfully created' })
  async createDeck(
    @CurrentUser('sub') userId: string,
    @Body() dto: CreateDeckDto,
  ) {
    return this.gameDecksService.createDeck(userId, dto);
  }

  @Post(':id/cards')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary:
      'Add a card/question to deck (Batas gratis 10 kartu, butuh token untuk lebih)',
  })
  async addCard(
    @CurrentUser('sub') userId: string,
    @Param('id') deckId: string,
    @Body() dto: AddCardDto,
  ) {
    return this.gameDecksService.addCard(userId, deckId, dto);
  }

  @Post(':id/unlock')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary:
      'Unlock unlimited cards for this deck (Buka kuota kartu tak terbatas dengan 1 Token Game Rp 5.000)',
  })
  async unlockDeck(
    @CurrentUser('sub') userId: string,
    @Param('id') deckId: string,
  ) {
    return this.gameDecksService.unlockDeckWithToken(userId, deckId);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Delete own question deck (Hapus Deck Sendiri)' })
  async deleteDeck(
    @CurrentUser('sub') userId: string,
    @Param('id') deckId: string,
  ) {
    return this.gameDecksService.deleteDeck(userId, deckId);
  }
}
