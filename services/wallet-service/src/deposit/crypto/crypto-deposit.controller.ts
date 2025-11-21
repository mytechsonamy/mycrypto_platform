import {
  Controller,
  Post,
  Get,
  Body,
  Query,
  Param,
  UseGuards,
  Req,
  HttpCode,
  HttpStatus,
  HttpException,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiQuery,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CryptoDepositService } from './services/crypto-deposit.service';
import { KycVerificationService } from '../../common/services/kyc-verification.service';
import {
  GenerateAddressDto,
  DepositAddressResponseDto,
} from './dto/generate-address.dto';
import {
  TransactionStatusDto,
  DepositHistoryDto,
} from './dto/transaction-status.dto';
import { Request } from 'express';

@ApiTags('Crypto Deposits')
@Controller('wallet/deposit/crypto')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
export class CryptoDepositController {
  constructor(
    private readonly cryptoDepositService: CryptoDepositService,
    private readonly kycVerificationService: KycVerificationService,
  ) {}

  @Post('address/generate')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Generate crypto deposit address',
    description: `
Generate a unique deposit address for BTC, ETH, or USDT.

**Requirements:**
- User must have KYC Level 1 APPROVED status
- Valid JWT authentication token required

**Features:**
- Uses HD Wallet (BIP-44) for deterministic address generation
- Returns QR code for easy mobile deposits
- Automatically monitors blockchain for incoming transactions
- One active address per currency per user

**Supported Currencies:**
- BTC: Bitcoin (Native SegWit)
- ETH: Ethereum
- USDT: Tether (ERC-20 on Ethereum)

**Confirmations Required:**
- BTC: 3 confirmations (~30-60 minutes)
- ETH: 12 confirmations (~3-5 minutes)
- USDT: 12 confirmations (~3-5 minutes)

**Process:**
1. User requests deposit address
2. System verifies KYC Level 1 approval
3. System generates unique address using HD Wallet
4. QR code is generated for the address
5. BlockCypher webhook is registered for monitoring
6. User sends cryptocurrency to the address
7. System detects transaction and waits for confirmations
8. Wallet is credited automatically when confirmed
    `,
  })
  @ApiResponse({
    status: 201,
    description: 'Deposit address generated successfully',
    type: DepositAddressResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Invalid currency' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({
    status: 403,
    description: 'KYC Level 1 approval required for crypto deposits'
  })
  async generateAddress(
    @Req() req: Request & { user: { userId: string } },
    @Body() dto: GenerateAddressDto,
  ): Promise<DepositAddressResponseDto> {
    const userId = req.user.userId;

    // Extract JWT token from Authorization header
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new HttpException(
        {
          error: 'MISSING_TOKEN',
          message: 'Authorization token required',
        },
        HttpStatus.UNAUTHORIZED,
      );
    }
    const authToken = authHeader.substring(7); // Remove 'Bearer ' prefix

    // Verify KYC Level 1 approval before generating address
    await this.kycVerificationService.requireKycLevel1(userId, authToken);

    return this.cryptoDepositService.generateDepositAddress(userId, dto);
  }

  @Get('address/:currency')
  @ApiOperation({
    summary: 'Get existing deposit address',
    description: 'Get the active deposit address for a specific cryptocurrency',
  })
  @ApiResponse({
    status: 200,
    description: 'Deposit address retrieved',
    type: DepositAddressResponseDto,
  })
  @ApiResponse({ status: 404, description: 'No active address found' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async getAddress(
    @Req() req: Request & { user: { userId: string } },
    @Param('currency') currency: string,
  ): Promise<DepositAddressResponseDto> {
    return this.cryptoDepositService.getUserDepositAddress(
      req.user.userId,
      currency.toUpperCase(),
    );
  }

  @Get('history')
  @ApiOperation({
    summary: 'Get deposit history',
    description: 'Get cryptocurrency deposit transaction history',
  })
  @ApiQuery({
    name: 'currency',
    required: false,
    description: 'Filter by currency (BTC, ETH, USDT)',
  })
  @ApiQuery({
    name: 'page',
    required: false,
    type: Number,
    description: 'Page number (default: 1)',
  })
  @ApiQuery({
    name: 'pageSize',
    required: false,
    type: Number,
    description: 'Page size (default: 20, max: 100)',
  })
  @ApiResponse({
    status: 200,
    description: 'Deposit history retrieved',
    type: DepositHistoryDto,
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async getDepositHistory(
    @Req() req: Request & { user: { userId: string } },
    @Query('currency') currency?: string,
    @Query('page') page?: number,
    @Query('pageSize') pageSize?: number,
  ): Promise<DepositHistoryDto> {
    const validatedPage = Math.max(1, page || 1);
    const validatedPageSize = Math.min(100, Math.max(1, pageSize || 20));

    return this.cryptoDepositService.getDepositHistory(
      req.user.userId,
      currency?.toUpperCase(),
      validatedPage,
      validatedPageSize,
    );
  }

  @Get('transaction/:txHash')
  @ApiOperation({
    summary: 'Get transaction status',
    description: 'Get the status of a specific deposit transaction by hash',
  })
  @ApiResponse({
    status: 200,
    description: 'Transaction status retrieved',
    type: TransactionStatusDto,
  })
  @ApiResponse({ status: 404, description: 'Transaction not found' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async getTransactionStatus(
    @Req() req: Request & { user: { userId: string } },
    @Param('txHash') txHash: string,
  ): Promise<TransactionStatusDto> {
    return this.cryptoDepositService.getTransactionStatus(req.user.userId, txHash);
  }

  @Post('webhook')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'BlockCypher webhook endpoint',
    description: `
Webhook endpoint for BlockCypher transaction notifications.
This endpoint is called automatically by BlockCypher when transactions are detected.

**Security:**
- Validates webhook token from BlockCypher
- Verifies required fields are present
- Validates transaction hash format
- Rate limited to prevent abuse
    `,
  })
  @ApiResponse({ status: 200, description: 'Webhook processed successfully' })
  @ApiResponse({ status: 401, description: 'Invalid webhook token' })
  @ApiResponse({ status: 400, description: 'Invalid webhook data' })
  async handleWebhook(
    @Body() webhookData: any,
    @Query('token') webhookToken?: string,
  ): Promise<{ status: string }> {
    // Validate webhook token
    const expectedToken = process.env.BLOCKCYPHER_WEBHOOK_TOKEN;
    if (expectedToken && webhookToken !== expectedToken) {
      throw new HttpException(
        {
          error: 'INVALID_WEBHOOK_TOKEN',
          message: 'Webhook token validation failed',
        },
        HttpStatus.UNAUTHORIZED,
      );
    }

    // Validate required fields
    if (!webhookData || !webhookData.hash || !webhookData.address) {
      throw new HttpException(
        {
          error: 'INVALID_WEBHOOK_DATA',
          message: 'Missing required fields: hash, address',
        },
        HttpStatus.BAD_REQUEST,
      );
    }

    // Validate transaction hash format
    const txHash = webhookData.hash;
    if (typeof txHash !== 'string' || txHash.length < 32) {
      throw new HttpException(
        {
          error: 'INVALID_TX_HASH',
          message: 'Invalid transaction hash format',
        },
        HttpStatus.BAD_REQUEST,
      );
    }

    // Determine currency from chain
    const currency = webhookData.chain === 'btc' ? 'BTC' : 'ETH';
    const toAddress = webhookData.address;

    // Process the transaction
    await this.cryptoDepositService.processIncomingTransaction(
      txHash,
      currency,
      toAddress,
    );

    return { status: 'processed' };
  }
}
