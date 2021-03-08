import { Octokit } from '@octokit/rest';
import { Endpoints } from '@octokit/types';
import { Stage } from '@wabarc/archiver';
import { Data4DTMC } from './types';
import axios from 'axios';

export class DutyMachine {
  private prefix = 'broker.dtmc.';
  private octokit: Octokit;
  private credentials;

  constructor(private contract: { token: string; owner: string; repo: string }) {
    const { token, owner, repo } = contract;

    this.contract = contract;
    this.credentials = { owner, repo };
    try {
      this.octokit = new Octokit({ auth: token });
    } catch (_) {
      throw new Error('Bad credentials.');
    }
  }

  async process(stages: Stage[]): Promise<boolean> {
    if (!stages || stages.length < 1) {
      return false;
    }

    const pushed: Data4DTMC[] = [];
    const tasks = this.transform(stages);
    for (const task of tasks) {
      if (!Object.prototype.hasOwnProperty.call(task, 'uris')) {
        continue;
      }
      if (task.uris.length === 0) {
        continue;
      }

      let succeed = false;
      for (const uri of task.uris) {
        if (await this.submit(uri)) {
          succeed = true;
        }
      }

      if (succeed) {
        pushed.push(task);
      }
    }

    // If without tasks, create a commit for tagging.
    if (pushed.length === 0) {
      await this.submit('');
    }

    return await this.tagging(pushed);
  }

  async latestID(): Promise<number> {
    // https://octokit.github.io/rest.js/v18#repos-list-tags
    type reposListTagsResponseData = Endpoints['GET /repos/{owner}/{repo}/tags']['response']['data'];
    const matchTag = <T extends reposListTagsResponseData>(tags: T): any | undefined => {
      const regexp = new RegExp(`${this.prefix}\\d+\\-\\d+`.replace(/\./g, '\\$&'), 'g');
      for (const tag of Object.values(tags)) {
        if (regexp.test(tag.name)) {
          return tag;
        }
      }
    };

    try {
      type reposListTagsResponseData = Endpoints['GET /repos/{owner}/{repo}/tags']['response'];
      const response: reposListTagsResponseData = await this.octokit.repos.listTags(this.credentials);
      if (!response || !response.data) {
        return 0;
      }

      const tag = matchTag(response.data);
      if (tag === undefined) {
        return 0;
      }

      const latest = tag.name || '';
      const id = latest.replace(this.prefix, '').split('-')[1] || '';
      return id.length > 0 ? parseInt(id) : 0;
    } catch (_) {
      return 0;
    }
  }

  private async tagging(stages: Data4DTMC[]): Promise<boolean> {
    console.info('Process tagging start...');
    if (!stages || stages.length < 1) {
      console.info('Process tagging failure, message: without task, skip.');
      return false;
    }

    const from = stages[0].id || -1;
    const to = stages[stages.length - 1].id || -1;
    if (from <= 0 || to <= 0 || from > to) {
      console.info('Process tagging failure, message: params [from, to] invalid.');
      return false;
    }

    const commit: 'commit' | 'tree' | 'blob' = 'commit';
    const credentials = {
      owner: this.credentials.owner,
      repo: this.credentials.repo,
      tag: `${this.prefix}${from}-${to}`,
      message: `\n${JSON.stringify(stages, null, 2)}\n`,
      object: this.credentials.sha,
      type: commit,
    };
    let tagSha: string;

    // Step 1: Create a tag object
    try {
      // doc: https://octokit.github.io/rest.js/v18#git-create-tag
      const response = await this.octokit.git.createTag(credentials);
      tagSha = response.data.sha || this.credentials.sha;
    } catch (err) {
      console.warn(
        `Process tagging failure, message: create tag object error, details: ${err.message}, data: ${JSON.stringify(
          credentials,
        )}`,
      );
      return false;
    }

    const ref = {
      owner: this.credentials.owner,
      repo: this.credentials.repo,
      ref: `refs/tags/${credentials.tag}`,
      sha: tagSha,
    };

    // Step 2: Create a tag reference using tag object
    try {
      // doc: https://octokit.github.io/rest.js/v18#git-create-ref
      await this.octokit.git.createRef(ref);
    } catch (_) {
      return false;
    }
    console.info('done.');

    return true;
  }

  private transform(stages: Stage[]): Data4DTMC[] {
    const result: Data4DTMC[] = [];
    if (stages.length === 0) {
      return result;
    }

    const pickup = <T extends string[]>(uris: T): T => {
      return Object.assign(uris).filter((uri) => this.allow(uri));
    };

    Object.assign(stages).map((item) => {
      const { id, stage } = item;
      const uris: string[] = [];
      const existOrig: boolean = Object.prototype.hasOwnProperty.call(stage, 'orig');
      const existPH: boolean = Object.prototype.hasOwnProperty.call(stage, 'ph');

      if (existOrig && existPH) {
        if (stage.ph.length > stage.orig.length) {
          uris.push(...stage.ph);
        } else {
          const orig: string[] = pickup(stage.orig);
          const ph: string[] = pickup(stage.ph);
          const p: string[] = orig.length > 0 ? orig : ph;
          uris.push(...p);
        }
      } else if (existOrig) {
        uris.push(...pickup(stage.orig));
      } else if (existPH) {
        // Assign Telegraph URI if original URI no matched
        uris.push(...pickup(stage.ph));
      }
      result.push({ id: id, uris: uris });
    });

    return result;
  }

  private allow(url: string): boolean {
    const allowList = [
      /https?:\/\/mp\.weixin\.qq\.com/,
      /https?:\/\/matters\.news/,
      /https?:\/\/chinadigitaltimes\.net/,
      /https?:\/\/www\.rfa\.org/,
      /https?:\/\/telegra\.ph/,
      /https?:\/\/(www|zhuanlan)\.zhihu\.com\/(question\/\d+\/answer\/\d+|p\/\d+)/,
      /https?:\/\/(www|m)\.douban\.com\/(note|people|doubanapp\/dispatch\?uri=\/(note\/|status\/\d+|group\/topic\/)|group\/topic\/)/,
      /https?:\/\/(www\.|m\.|card\.|weibointl\.api\.)?weibo\.(com|cn)\/(status\/\w+|\d+\/|share\/\d+|detail\/\d+|ttarticle\/p\/show|article\/m\/show\/id)/,
      /https?:\/\/shimo\.im\/docs\/\w+/,
      // /https?:\/\/web\.archive\.org\/web\/\d+\/\S+/,
      /https?:\/\/(www).acfun\.cn\/a\/\w+/,
      /https?:\/\/(www).bilibili\.com\/read\/\w+/,
      /https?:\/\/archiveofourown\.org\/works\/\w+/,
    ];

    // return matched url.
    const matched = allowList.filter((regexp) => {
      return regexp.test(url);
    });

    return matched.length > 0;
  }

  private async submit(url: string): Promise<boolean> {
    console.info('Process submit start... ');

    if (url && url.length > 0) {
      const api = 'https://archives.duty-machine.now.sh/api/submit';
      const params = new URLSearchParams();
      params.append('url', url);
      axios.post(api, params, { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } });
    }

    this.credentials.path = `foo.bar`;

    // Check file exists GitHub.
    try {
      // doc: https://octokit.github.io/rest.js/v18#repos-get-content
      // This API returns blobs up to 1 MB in size.
      type reposGetcontentResponseData = Endpoints['GET /repos/{owner}/{repo}/contents/{path}']['response'];
      const response: reposGetcontentResponseData = await this.octokit.repos.getContent({
        owner: this.credentials.owner,
        repo: this.credentials.repo,
        path: this.credentials.path,
      });
      this.credentials.sha = response.data['sha'];
    } catch (err) {
      if (
        err.status &&
        err.status === 403 &&
        err.errors &&
        err.errors[0]['code'] &&
        err.errors[0]['code'] === 'too_large'
      ) {
        // If exist, create new filename
        const ext = Math.random().toString(36).substring(2, 7) + '.html';
        this.credentials.path = this.credentials.path.replace(/\.(htm|html)$/g, ext);
      }
    }

    this.credentials.message = url ? `Submit ${url} to duty-machine` : `Ignore`;
    this.credentials.content = Buffer.from(Math.random().toString(36)).toString('base64');

    try {
      // doc: https://octokit.github.io/rest.js/v18#repos-create-or-update-file-contents
      const response = await this.octokit.repos.createOrUpdateFileContents(this.credentials);
      const succeed = response.data !== undefined && response.data.commit !== undefined;
      if (succeed) {
        this.credentials.sha = response.data.commit.sha || '';
      }

      return succeed;
    } catch (_) {
      console.log(_);
      console.info('Process createContent failure...');
      return false;
    }
  }
}
