import {
  BadRequestException,
  Injectable,
  NotFoundException,
  
} from '@nestjs/common';
import { InjectEntityManager, InjectRepository } from '@nestjs/typeorm';
import { Asset } from 'src/asset/asset.entity';
import { AssetRepository } from 'src/asset/asset.repository';
import { CreateAssetDto } from 'src/asset/dto/create-asset.dto';
import { UpdateAssetDto } from "./dto/update-asset.dto";
import { UserRepository } from 'src/user/user.repository';

@Injectable()
export class AssetService {
  constructor(private assetRepository: AssetRepository, private userRepository: UserRepository) {}
  
  async createAsset(createAssetDto: CreateAssetDto): Promise<any>{
    return this.assetRepository.createAsset(createAssetDto);
  }

  async getAllAsset(): Promise<any> {
    return this.assetRepository.getAllAsset();
  }

  async updateAsset(asset: UpdateAssetDto): Promise<any> {
    return this.assetRepository.updateAsset(asset);
  }

  async getAsset(key: any): Promise<any> {
    return this.assetRepository.getAsset(key);
  }
}