import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { HttpService } from './services/http.service';
import { ConversionService } from './services/conversion.service';
import { AssetController } from './models/asset/asset.controller';
import { AssetService } from './models/asset/asset.service';
import { AssetRepository } from './models/asset/asset.repository';
import { TypeOrmModule } from '@nestjs/typeorm';
import { FiatController } from './models/fiat/fiat.controller';
import { FiatService } from './models/fiat/fiat.service';
import { FiatRepository } from './models/fiat/fiat.repository';
import { CountryRepository } from './models/country/country.repository';
import { LanguageRepository } from './models/language/language.repository';
import { CountryController } from './models/country/country.controller';
import { LanguageController } from './models/language/language.controller';
import { CountryService } from './models/country/country.service';
import { LanguageService } from './models/language/language.service';
import { PassportModule } from '@nestjs/passport';
import { MailService } from './services/mail.service';
import { JwtModule } from '@nestjs/jwt';
import { JwtStrategy } from './auth/jwt.strategy';
import { MailerModule } from '@nestjs-modules/mailer';
import { ScheduleModule } from '@nestjs/schedule';
import { SettingRepository } from './setting/setting.repository';
import { SettingService } from './setting/setting.service';
import { GetConfig } from 'src/config/config';
import { ConfigModule } from 'src/config/config.module';
import { I18nModule } from 'nestjs-i18n';

@Module({
  imports: [
    HttpModule,
    ConfigModule,
    TypeOrmModule.forFeature([
      AssetRepository,
      FiatRepository,
      CountryRepository,
      LanguageRepository,
      SettingRepository,
    ]),
    PassportModule.register({ defaultStrategy: 'jwt', session: true }),
    JwtModule.register(GetConfig().auth.jwt),
    MailerModule.forRoot(GetConfig().mail),
    I18nModule.forRoot(GetConfig().i18n),
    ScheduleModule.forRoot(),
  ],
  controllers: [AssetController, FiatController, CountryController, LanguageController],
  providers: [
    ConversionService,
    MailService,
    HttpService,
    AssetService,
    FiatService,
    CountryService,
    LanguageService,
    SettingService,
    JwtStrategy,
  ],
  exports: [
    PassportModule,
    JwtModule,
    ScheduleModule,
    ConversionService,
    MailService,
    HttpService,
    AssetService,
    FiatService,
    CountryService,
    LanguageService,
    SettingService,
  ],
})
export class SharedModule {}
