import { Injectable, NotFoundException } from '@nestjs/common';
import { BuyService } from 'src/user/models/buy/buy.service';
import { Readable } from 'stream';
import { In } from 'typeorm';
import { AmlCheck } from '../crypto-buy/crypto-buy.entity';
import { CryptoBuyRepository } from '../crypto-buy/crypto-buy.repository';
import { TransactionDto } from './dto/transaction.dto';
import { HttpService } from 'src/shared/services/http.service';
import { UserRepository } from 'src/user/models/user/user.repository';

@Injectable()
export class TransactionService {
  constructor(
    private readonly buyService: BuyService,
    private readonly cryptoBuyRepo: CryptoBuyRepository,
    private readonly userRepo: UserRepository,
    private http: HttpService,
  ) {}

  async getTransactions(userId: number): Promise<TransactionDto[]> {
    const tx = await Promise.all([
      await this.getBuyTransactions(userId),
      // this.getSellTransactions(userId),
      await this.getDFITaxRewards(userId),
    ]).then((tx) => tx.reduce((prev, curr) => prev.concat(curr), []));

    return tx.sort((tx1, tx2) => ((tx1.date?.getTime() ?? 0) - (tx2.date?.getTime() ?? 0) > 0 ? -1 : 1));
  }

  async getBuyTransactions(userId: number): Promise<TransactionDto[]> {
    const buys = await this.buyService.getUserBuys(userId);
    const cryptoBuys = await this.cryptoBuyRepo.find({
      where: { buy: { id: In(buys.map((b) => b.id)) }, amlCheck: AmlCheck.PASS },
      relations: ['bankTx', 'buy', 'buy.user'],
    });

    return cryptoBuys
      .map((c) => [
        {
          type: 'Deposit',
          buyAmount: c.amount,
          buyAsset: c.fiat?.name,
          sellAmount: null,
          sellAsset: null,
          fee: null,
          feeAsset: null,
          exchange: 'DFX',
          tradeGroup: null,
          comment: c.bankTx?.iban,
          date: c.outputDate ? this.createRandomDate(c.outputDate, -20, c.amount) : null,
          txid: c.bankTx?.accountServiceRef,
          buyValueInEur: null,
          sellValueInEur: null,
        },
        {
          type: 'Trade',
          buyAmount: c.outputAmount,
          buyAsset: c.buy.asset.name,
          sellAmount: c.amount,
          sellAsset: c.fiat?.name,
          fee: c.fee ? c.fee * c.amount : null,
          feeAsset: c.fee ? c.fiat?.name : null,
          exchange: 'DFX',
          tradeGroup: null,
          comment: c.buy.user.address,
          date: c.outputDate ? c.outputDate : null,
          txid: c.txId,
          buyValueInEur: null,
          sellValueInEur: null,
        },
      ])
      .reduce((prev, curr) => prev.concat(curr), []);
  }

  // async getSellTransactions(userId: number): Promise<TransactionDto[]> {
  //   const sells = await this.buyService.getUserBuys(userId);
  //   const cryptoSells = await this.cryptoBuyRepo.find({
  //     where: { buy: { id: In(sells.map((b) => b.id)) }, amlCheck: AmlCheck.PASS },
  //     relations: ['bankTx', 'buy', 'buy.user'],
  //   });

  //   return cryptoSells
  //     .map((c) => [
  //       {
  //         type: 'Deposit',
  //         buyAmount: c.amount,
  //         buyAsset: c.buy?.asset.name,
  //         sellAmount: null,
  //         sellAsset: null,
  //         fee: null,
  //         feeAsset: null,
  //         exchange: 'DFX',
  //         tradeGroup: null,
  //         comment: c.bankTx?.iban,
  //         date: c.outputDate ? this.createRandomDate(c.outputDate, -20, c.amount) : null,
  //         txid: c.bankTx?.accountServiceRef,
  //         buyValueInEur: null,
  //         sellValueInEur: null,
  //       },
  //       {
  //         type: 'Trade',
  //         buyAmount: c.outputAmount,
  //         buyAsset: c.buy.asset.name,
  //         sellAmount: c.amount,
  //         sellAsset: c.fiat?.name,
  //         fee: c.fee ? c.fee * c.amount : null,
  //         feeAsset: c.fee ? c.fiat?.name : null,
  //         exchange: 'DFX',
  //         tradeGroup: null,
  //         comment: c.buy.user.address,
  //         date: c.outputDate ? c.outputDate : null,
  //         txid: c.txId,
  //         buyValueInEur: null,
  //         sellValueInEur: null,
  //       },
  //       {
  //         type: 'Withdrawal',
  //         buyAmount: null,
  //         buyAsset: null,
  //         sellAmount: c.amount,
  //         sellAsset: c.fiat?.name,
  //         fee: c.fee ? c.fee * c.amount : null,
  //         feeAsset: c.fee ? c.fiat?.name : null,
  //         exchange: 'DFX',
  //         tradeGroup: null,
  //         comment: c.buy.user.address,
  //         date: c.outputDate ? this.createRandomDate(c.outputDate, 20, c.amount) : null,
  //         txid: c.txId,
  //         buyValueInEur: null,
  //         sellValueInEur: null,
  //       },
  //     ])
  //     .reduce((prev, curr) => prev.concat(curr), []);
  // }

  async getTransactionCsv(userId: number): Promise<Readable> {
    const tx = await this.getTransactions(userId);
    if (tx.length === 0) throw new NotFoundException('No transactions found');
    return Readable.from([this.toCsv(tx)]);
  }

  async getDFITaxRewards(userId: number): Promise<TransactionDto[]> {
    const user = await this.userRepo.findOne({ where: { id: userId } });
    const baseUrl = 'https://api.dfi.tax/v01/rwd';
    const url = `${baseUrl}/${user.address}/d/true/EUR`;
    const result = await this.callApi<[{ value: number; category: string }]>(url);
    const resultTx = [];
    let a = 0;

    for (const reward of result) {
      resultTx[a++] = {
        type: 'Mining',
        buyAmount: this.getSplitNumber(reward['detail']['qty'], 8),
        buyAsset:
          reward['detail']['token'] === 'DUSD' ||
          reward['detail']['token'] === 'DFI' ||
          reward['detail']['token'] === 'BTC' ||
          reward['detail']['token'] === 'ETH' ||
          reward['detail']['token'] === 'BCH' ||
          reward['detail']['token'] === 'DOGE' ||
          reward['detail']['token'] === 'LTC' ||
          reward['detail']['token'] === 'USDC' ||
          reward['detail']['token'] === 'USDT'
            ? reward['detail']['token']
            : 'd' + reward['detail']['token'],
        sellAmount: null,
        sellAsset: null,
        fee: null,
        feeAsset: null,
        exchange: 'DFX',
        tradeGroup: null,
        comment: 'Liquidity Mining ' + reward['category'] + ' ' + reward['detail']['pool'],
        date: new Date(reward['date']),
        txid: null,
        buyValueInEur: this.getSplitNumber(reward['value'], 8),
        sellValueInEur: null,
      };
    }
    return resultTx;
  }

  // --- HELPER METHODS --- //
  private toCsv(list: any[], separator = ','): string {
    const headers = Object.keys(list[0]).join(separator);
    const values = list.map((t) => Object.values(t).join(separator));
    return [headers].concat(values).join('\n');
  }

  private createRandomDate(outputDate: Date, offset: number, amount: number): Date {
    return new Date(outputDate.getTime() + (offset - (amount % 10)) * 60 * 1000);
  }

  private async callApi<T>(url: string): Promise<T> {
    return this.http.get<T>(url);
  }

  private getSplitNumber(oldNumber: number, digits: number): number {
    return Number.parseFloat(oldNumber.toFixed(digits));
  }
}
