import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEmail,
  IsNotEmpty,
  IsOptional,
  IsString,
  Length,
  IsInt,
} from 'class-validator';
import { UserRole, UserStatus } from '../user.entity';

export class UpdateUserDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  id: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  usedRef: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  walletId: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsEmail()
  mail: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  firstname: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  surname: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  street: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  houseNumber: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  location: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  zip: string;

  @ApiPropertyOptional()
  @IsOptional()
  language: any;

  @ApiPropertyOptional()
  @IsOptional()
  country: any;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  // TODO: user phonenumber decorator instead of string --> Figure it out
  // @IsPhoneNumber()
  phone: string;
}
