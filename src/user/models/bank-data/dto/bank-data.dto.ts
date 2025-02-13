import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';

export class BankDataDto {
  @ApiProperty()
  @IsOptional()
  @IsString()
  name: string;

  @ApiProperty()
  @IsOptional()
  @IsString()
  location: string;

  @ApiProperty()
  @IsOptional()
  @IsString()
  country: string;

  @ApiProperty()
  @IsOptional()
  @IsString()
  iban: string;

  @ApiProperty()
  @IsOptional()
  @IsString()
  bankName: string;

  @ApiProperty()
  @IsOptional()
  @IsString()
  bic: string;
}
