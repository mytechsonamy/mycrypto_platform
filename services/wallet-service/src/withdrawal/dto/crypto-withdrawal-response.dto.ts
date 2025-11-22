import { ApiProperty } from '@nestjs/swagger';

export class CryptoWithdrawalResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  currency: string;

  @ApiProperty()
  destinationAddress: string;

  @ApiProperty()
  amount: string;

  @ApiProperty()
  networkFee: string;

  @ApiProperty()
  platformFee: string;

  @ApiProperty()
  totalAmount: string;

  @ApiProperty()
  status: string;

  @ApiProperty()
  transactionHash: string | null;

  @ApiProperty()
  confirmations: number;

  @ApiProperty()
  requiresAdminApproval: boolean;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;
}

export class CryptoWithdrawalHistoryDto {
  @ApiProperty({ type: [CryptoWithdrawalResponseDto] })
  withdrawals: CryptoWithdrawalResponseDto[];

  @ApiProperty()
  page: number;

  @ApiProperty()
  limit: number;

  @ApiProperty()
  total: number;

  @ApiProperty()
  totalPages: number;
}

export class CryptoWithdrawalFeeDto {
  @ApiProperty()
  currency: string;

  @ApiProperty()
  platformFee: string;

  @ApiProperty()
  networkFee: string;

  @ApiProperty()
  totalFee: string;

  @ApiProperty()
  minimumWithdrawal: string;

  @ApiProperty()
  maximumWithdrawal: string;
}
