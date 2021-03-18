import { Archiver } from '@wabarc/archiver';
import { Upstream } from './types';
import { GitHub } from './github';
import { DutyMachine } from './duty-machine';

export class Broker {
  private upstream;
  private handle;
  private token = '';
  private point: 'github' | 'duty-machine';

  constructor() {
    this.point = 'github';
  }

  source(upstream: Upstream): this {
    if (!upstream) {
      throw new Error('source is invalid.');
    }
    this.upstream = upstream;

    return this;
  }

  github(gh: { token: string; owner: string; repo: string }): this {
    const { token, owner, repo } = gh;
    if (!token || !owner || !repo) {
      throw new Error('GitHub [token, owner, repo] invalid.');
    }

    this.point = 'github';
    this.handle = new GitHub({ token: token, owner: owner, repo: repo });

    return this;
  }

  dutyMachine(gh: { token: string; owner: string; repo: string; endpoint?: string }): this {
    const { token, owner, repo, endpoint } = gh;
    if (!token || !owner || !repo) {
      throw new Error('GitHub [token, owner, repo] invalid.');
    }

    this.point = 'duty-machine';
    this.handle = new DutyMachine({ token: token, owner: owner, repo: repo, endpoint: endpoint });

    return this;
  }

  async begin(): Promise<boolean> {
    if (!this.handle || typeof this.handle !== 'object') {
      throw new Error('Must initialize handle.');
    }

    const limit = this.upstream.limit || 25;
    const latestID = await this.handle.latestID();
    switch (this.point) {
      case 'github': {
        const archived = await new Archiver().do({
          channel: this.upstream.channel,
          context: { dir: process.cwd(), from: latestID + 1, to: latestID + limit },
        });

        return await this.handle.process(archived);
      }
      case 'duty-machine': {
        const stages = await new Archiver().stage({
          channel: this.upstream.channel,
          context: { dir: process.cwd(), from: latestID + 1, to: latestID + limit },
        });

        return await this.handle.process(stages);
      }
      default:
        throw new Error('Entry no found.');
    }
  }
}
