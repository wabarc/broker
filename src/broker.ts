import { Packer } from '@wabarc/packer';
import { Upstream } from './types';
import { GitHub } from './github';
import { DutyMachine } from './duty-machine';

export class Broker {
  private upstream;
  private handle;
  private token = '';
  private point: 'github';

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

    this.handle = new GitHub({ token: token, owner: owner, repo: repo });

    return this;
  }

  dutyMachine(gh: { token: string; owner: string; repo: string }): this {
    const { token, owner, repo } = gh;
    if (!token || !owner || !repo) {
      throw new Error('GitHub [token, owner, repo] invalid.');
    }

    this.handle = new DutyMachine({ token: token, owner: owner, repo: repo });

    return this;
  }

  async begin(): Promise<boolean> {
    if (!this.handle || typeof this.handle !== 'object') {
      throw new Error('Must initialize handle.');
    }

    const limit = this.upstream.limit || 25;
    const latestID = await this.handle.latestID();
    const packer = await new Packer({
      channel: this.upstream.channel,
      context: { dir: process.cwd(), from: latestID + 1, to: latestID + limit },
    }).on();

    return await this.handle.process(packer);
  }
}
