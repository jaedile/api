import { ApiProperty } from '@nestjs/swagger';
import { IsInt, IsNotEmpty, IsOptional, IsString, Length, IsNumber, IsEnum } from 'class-validator';
import { LogDirection, LogStatus, LogType } from '../log.entity';

export class UpdateLogDto {
  @ApiProperty()
  @IsNotEmpty()
  @IsInt()
  id: number;

  @IsOptional()
  @IsString()
  orderId: string;

  @ApiProperty()
  @IsOptional()
  @Length(34, 42)
  @IsString()
  address: string;

  @ApiProperty()
  @IsOptional()
  @IsEnum(LogType)
  type: LogType;

  @ApiProperty()
  @IsOptional()
  @IsEnum(LogStatus)
  status: LogStatus;

  @ApiProperty()
  @IsOptional()
  fiat: any;

  @ApiProperty()
  @IsOptional()
  @IsNumber()
  fiatValue: number;

  @ApiProperty()
  @IsOptional()
  @IsNumber()
  fiatInCHF: number;

  @ApiProperty()
  @IsOptional()
  @IsNumber()
  btcValue: number;

  @ApiProperty()
  @IsOptional()
  asset: any;

  @ApiProperty()
  @IsOptional()
  @IsNumber()
  assetValue: number;

  @ApiProperty()
  @IsOptional()
  @IsString()
  usedRef: string;

  @ApiProperty()
  @IsOptional()
  @IsNumber()
  refFeePercent: number;

  @ApiProperty()
  @IsOptional()
  @IsNumber()
  refFeeValue: number;

  @ApiProperty()
  @IsOptional()
  refFeeAsset: any;

  @ApiProperty()
  @IsOptional()
  usedWallet: any;

  @ApiProperty()
  @IsOptional()
  @IsNumber()
  walletFeeValue: number;

  @ApiProperty()
  @IsOptional()
  @IsNumber()
  walletFeePercent: number;

  @ApiProperty()
  @IsOptional()
  walletFeeAsset: any;

  @ApiProperty()
  @IsOptional()
  @IsNumber()
  dfxFeePercent: number;

  @ApiProperty()
  @IsOptional()
  @IsNumber()
  dfxFeeValue: number;

  @ApiProperty()
  @IsOptional()
  dfxFeeAsset: any;

  @ApiProperty()
  @IsOptional()
  @IsEnum(LogDirection)
  direction: LogDirection;

  @ApiProperty()
  @IsOptional()
  @IsString()
  message: string;

  @ApiProperty()
  @IsOptional()
  @IsString()
  blockchainTx: string;
}
