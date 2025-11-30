import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  UseGuards,
  Request,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { PriceAlertService } from '../services/price-alert.service';
import { CreatePriceAlertDto } from '../dto/create-price-alert.dto';
import { UpdatePriceAlertDto } from '../dto/update-price-alert.dto';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';

@ApiTags('Price Alerts')
@ApiBearerAuth()
@Controller('api/v1/alerts')
@UseGuards(JwtAuthGuard)
export class PriceAlertController {
  constructor(private readonly priceAlertService: PriceAlertService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new price alert' })
  @ApiResponse({
    status: 201,
    description: 'Price alert created successfully',
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid input or duplicate alert',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized',
  })
  async create(@Request() req, @Body() createPriceAlertDto: CreatePriceAlertDto) {
    const userId = req.user.userId;
    const alert = await this.priceAlertService.create(userId, createPriceAlertDto);

    return {
      success: true,
      data: alert,
      meta: {
        timestamp: new Date().toISOString(),
        request_id: req.id || 'N/A',
      },
    };
  }

  @Get()
  @ApiOperation({ summary: 'Get all price alerts for current user' })
  @ApiResponse({
    status: 200,
    description: 'List of price alerts',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized',
  })
  async findAll(@Request() req) {
    const userId = req.user.userId;
    const alerts = await this.priceAlertService.findAll(userId);
    const stats = await this.priceAlertService.getAlertStatistics(userId);

    return {
      success: true,
      data: alerts,
      meta: {
        timestamp: new Date().toISOString(),
        request_id: req.id || 'N/A',
        statistics: stats,
      },
    };
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a specific price alert by ID' })
  @ApiResponse({
    status: 200,
    description: 'Price alert details',
  })
  @ApiResponse({
    status: 404,
    description: 'Price alert not found',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized',
  })
  async findOne(@Request() req, @Param('id') id: string) {
    const userId = req.user.userId;
    const alert = await this.priceAlertService.findOne(id, userId);

    return {
      success: true,
      data: alert,
      meta: {
        timestamp: new Date().toISOString(),
        request_id: req.id || 'N/A',
      },
    };
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update a price alert' })
  @ApiResponse({
    status: 200,
    description: 'Price alert updated successfully',
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid input',
  })
  @ApiResponse({
    status: 404,
    description: 'Price alert not found',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized',
  })
  async update(
    @Request() req,
    @Param('id') id: string,
    @Body() updatePriceAlertDto: UpdatePriceAlertDto,
  ) {
    const userId = req.user.userId;
    const alert = await this.priceAlertService.update(id, userId, updatePriceAlertDto);

    return {
      success: true,
      data: alert,
      meta: {
        timestamp: new Date().toISOString(),
        request_id: req.id || 'N/A',
      },
    };
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a price alert' })
  @ApiResponse({
    status: 204,
    description: 'Price alert deleted successfully',
  })
  @ApiResponse({
    status: 404,
    description: 'Price alert not found',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized',
  })
  async remove(@Request() req, @Param('id') id: string) {
    const userId = req.user.userId;
    await this.priceAlertService.remove(id, userId);
  }
}
