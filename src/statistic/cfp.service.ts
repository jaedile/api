import { Injectable, NotFoundException, ServiceUnavailableException } from '@nestjs/common';
import { CryptoService } from 'src/ain/services/crypto.service';
import { HttpService } from '../shared/services/http.service';
import * as MasterNodes from './assets/master-nodes.json';
import * as CakeMasterNodes from './assets/cake-mn.json';
import * as CfpResults from './assets/cfp-results.json';
import { Interval } from '@nestjs/schedule';
import { Util } from 'src/shared/util';
import { Config } from 'src/config/config';

interface CfpResponse {
  number: number;
  title: string;
  html_url: string;
  labels: { name: string }[];
  comments: number;
}

interface CommentsResponse {
  body: string;
  created_at: string;
}

enum ResultStatus {
  APPROVED = 'Approved',
  NOT_APPROVED = 'Not approved',
}

enum State {
  ENABLED = 'ENABLED',
  PRE_ENABLED = 'PRE_ENABLED',
}

enum VotingType {
  CFP = 'cfp',
  DFIP = 'dfip',
}

interface Vote {
  address: string;
  signature: string;
  cfpId: string;
  vote: string;
  createdAt: string;
  isCake: boolean;
}

export interface MasterNode {
  ownerAuthAddress: string;
  mintedBlocks: number;
  state: State;
}

export interface CfpResult {
  number: number;
  title: string;
  type: VotingType;
  dfiAmount: number;
  htmlUrl: string;
  currentResult: ResultStatus;
  totalVotes: {
    total: number;
    possible: number;
    turnout: number;
    yes: number;
    neutral: number;
    no: number;
  };
  cakeVotes: {
    total: number;
    yes: number;
    neutral: number;
    no: number;
  };
  voteDetails: {
    yes: Vote[];
    neutral: Vote[];
    no: Vote[];
  };
  startDate: string;
  endDate: string;
}

@Injectable()
export class CfpService {
  private readonly issuesUrl = 'https://api.github.com/repos/DeFiCh/dfips/issues';
  private readonly masterNodeUrl = 'https://api.mydeficha.in/v1/listmasternodes/';

  // current voting round
  private readonly isCfpInProgress = false;
  private readonly currentRound = '2201';
  private readonly startDate = '2021-01-08T23:59:59+00:00';
  private readonly endDate = '2021-01-11T23:59:59+00:00';

  private masterNodeCount: number;
  private masterNodes: { [address: string]: MasterNode };
  private cfpResults: CfpResult[];

  constructor(private http: HttpService, private cryptoService: CryptoService) {
    const validMasterNodes = Object.values(MasterNodes).filter(
      (node) => node.state === State.ENABLED && node.mintedBlocks > 0,
    );
    this.masterNodeCount = validMasterNodes.length;
    this.masterNodes = validMasterNodes.reduce((prev, curr) => ({ ...prev, [curr.ownerAuthAddress]: curr }), {});
  }

  @Interval(600000)
  async doUpdate(): Promise<void> {
    try {
      let allCfp = await this.callApi<CfpResponse[]>(this.issuesUrl, ``);
      allCfp = allCfp.filter((cfp) =>
        cfp.labels.find((l) => [VotingType.CFP.toString(), VotingType.DFIP.toString()].includes(l.name)),
      );

      this.cfpResults = await Promise.all(allCfp.map((cfp) => this.getCfp(cfp)));
    } catch (e) {
      console.error('Exception during CFP update:', e);
      throw new ServiceUnavailableException('Failed to update');
    }
  }

  async getMasterNodes(): Promise<MasterNode[]> {
    const response = await this.callApi<{ [key: string]: MasterNode }>(this.masterNodeUrl, ``);
    return Object.values(response).map((n) => ({
      ownerAuthAddress: n.ownerAuthAddress,
      mintedBlocks: n.mintedBlocks,
      state: n.state,
    }));
  }

  getCfpList(): string[] {
    return Object.keys(CfpResults).reverse();
  }

  async getCfpResults(cfpId: string): Promise<CfpResult[]> {
    if (['latest', this.currentRound].includes(cfpId)) {
      if (this.isCfpInProgress) {
        // return current data from GitHub
        if (!this.cfpResults) await this.doUpdate();
        return this.cfpResults;
      }

      // return newest cached data
      cfpId = Object.keys(CfpResults).pop();
    }

    const results = CfpResults[cfpId];
    if (!results) throw new NotFoundException('No CFP result for id found');

    return results;
  }

  // --- HELPER METHODS --- //
  private async getCfp(cfp: CfpResponse): Promise<CfpResult> {
    const batchSize = 100;
    const batchCount = Math.ceil(cfp.comments / batchSize);
    const commentBatches = await Promise.all(
      [...Array(batchCount).keys()].map((_, i) =>
        this.callApi<CommentsResponse[]>(this.issuesUrl, `/${cfp.number}/comments?per_page=${batchSize}&page=${i + 1}`),
      ),
    );
    const comments = commentBatches.reduce((prev, curr) => prev.concat(curr), []);

    return this.getCfpResult(cfp, comments);
  }

  private async getCfpResult(cfp: CfpResponse, comments: CommentsResponse[]): Promise<CfpResult> {
    const type = cfp.labels.map((a) => a.name).includes(VotingType.CFP) ? VotingType.CFP : VotingType.DFIP;

    const validVotes: { [address: string]: Vote } = comments
      .map((c) => this.getCommentVotes(type, c))
      .reduce((prev, curr) => prev.concat(curr), [])
      .filter((v) => this.verifyVote(cfp, v))
      .reduce((prev, curr) => ({ ...prev, [curr.address]: curr }), {}); // remove duplicate votes

    const votes = Object.values(validVotes);
    const yesVotes = votes.filter((v) => v.vote.endsWith('yes'));
    const noVotes = votes.filter((v) => v.vote.endsWith('no'));
    const neutralVotes = votes.filter((v) => v.vote.endsWith('neutral'));

    const cakeVotes = votes.filter((v) => v.isCake);
    const yesVotesCake = yesVotes.filter((v) => v.isCake);
    const noVotesCake = noVotes.filter((v) => v.isCake);
    const neutralVotesCake = neutralVotes.filter((v) => v.isCake);

    const requiredVotes = type === VotingType.CFP ? 1 / 2 : 2 / 3;
    const currentResult =
      yesVotes.length / (yesVotes.length + noVotes.length) > requiredVotes
        ? ResultStatus.APPROVED
        : ResultStatus.NOT_APPROVED;

    const amountMatches = /\(([\d,. ]*)DFI\)/g.exec(cfp.title);
    const amount = amountMatches ? +amountMatches[1].replace(/[',. ]/g, '') : undefined;

    return {
      title: cfp.title,
      number: cfp.number,
      type: type,
      dfiAmount: amount,
      htmlUrl: cfp.html_url,
      currentResult: currentResult,
      totalVotes: {
        total: votes.length,
        possible: this.masterNodeCount,
        turnout: Util.round((votes.length / this.masterNodeCount) * 100, 2),
        yes: yesVotes.length,
        neutral: neutralVotes.length,
        no: noVotes.length,
      },
      cakeVotes: {
        total: cakeVotes.length,
        yes: yesVotesCake.length,
        neutral: neutralVotesCake.length,
        no: noVotesCake.length,
      },
      voteDetails: {
        yes: yesVotes,
        neutral: neutralVotes,
        no: noVotes,
      },
      startDate: this.startDate,
      endDate: this.endDate,
    };
  }

  private getCommentVotes(type: VotingType, commentResponse: CommentsResponse): Vote[] {
    const matches = [];

    let match;
    const regExp = this.getRegExp(this.currentRound, type);

    while ((match = regExp.exec(commentResponse.body)) !== null) {
      matches.push(match);
    }

    return matches.map((m) => ({
      address: m[1],
      signature: m[4],
      cfpId: m[3],
      vote: m[2],
      createdAt: commentResponse.created_at,
      isCake: Object.values(CakeMasterNodes).find((n) => n.address === m[1]) != null,
    }));
  }

  private getRegExp(votingRound: string, type: VotingType): RegExp {
    return new RegExp(
      `signmessage\\s"?(\\w*)"?\\s"?(${type}-(${votingRound}-\\w*)-\\w*)"?\\s+(\\S{87}=)(?:\\s|$)+`,
      'gm',
    );
  }

  private verifyVote(cfp: CfpResponse, vote: Vote): boolean {
    return (
      this.masterNodes[vote.address] &&
      cfp.title.toLowerCase().includes(vote.cfpId.toLowerCase()) &&
      this.cryptoService.verifySignature(vote.vote, vote.address, vote.signature)
    );
  }

  private async callApi<T>(baseUrl: string, url: string): Promise<T> {
    return this.http.get<T>(`${baseUrl}${url}`, { headers: { Authorization: `Bearer ${Config.githubToken}` } });
  }
}
