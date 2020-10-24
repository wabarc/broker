import { Packer } from '@wabarc/packer';
import { GitHub } from './github';
import { Upstream } from './types';

export class Broker {
  private upstream;
  private handler;
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

    this.handler = new GitHub({ token: token, owner: owner, repo: repo });

    return this;
  }

  async begin(): Promise<boolean> {
    switch (this.point.toLowerCase()) {
      case 'github': {
        const github = this.handler;
        const limit = this.upstream.limit || 25;
        const latestID = await github.latestID();
        const packer = await new Packer({
          channel: this.upstream.channel,
          context: { dir: process.cwd(), from: latestID + 1, to: latestID + limit },
        }).on();

        return await github.process(packer);
      }
      default: {
        return true;
      }
    }
  }
}
