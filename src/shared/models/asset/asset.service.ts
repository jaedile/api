import { Injectable } from '@nestjs/common';
import { AssetRepository } from 'src/shared/models/asset/asset.repository';
import { CreateAssetDto } from 'src/shared/models/asset/dto/create-asset.dto';
import { Asset } from './asset.entity';
import { UpdateAssetDto } from './dto/update-asset.dto';

@Injectable()
export class AssetService {
  constructor(private assetRepository: AssetRepository) {}

  async createAsset(createAssetDto: CreateAssetDto): Promise<any> {
    return this.assetRepository.createAsset(createAssetDto);
  }

  async getAllAsset(): Promise<any> {
    return this.assetRepository.find();
  }

  async updateAsset(asset: UpdateAssetDto): Promise<any> {
    return this.assetRepository.updateAsset(asset);
  }

  async getAsset(key: any): Promise<any> {
    return this.assetRepository.getAsset(key);
  }

  async getAssetByDexName(name: string): Promise<Asset> {
    return this.assetRepository.findOne({ where: { dexName: name } });
  }
}
