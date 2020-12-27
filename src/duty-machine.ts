import { Octokit } from '@octokit/rest';
import { ReposListTagsResponseData } from '@octokit/types';
import { Task } from '@wabarc/packer';
import { unlinkSync } from 'fs';
import { basename } from 'path';
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

  async process(stages: Task[]): Promise<boolean> {
    if (!stages || stages.length < 1) {
      return false;
    }

    const created = Object.values(stages)
      .filter((stage) => stage.path.length > 1)
      .map((stage) => {
        stage.path = basename(stage.path);
        return stage;
      });
    if (created.length === 0) {
      return false;
    }

    let task: Task;
    const tasks = this.filter(stages);
    for (task of tasks) {
      if (task.success === true && task.path.length > 1) {
        // delete file
        try {
          unlinkSync(task.path);
        } catch (_) {}

        await this.submit(task.url);
      }
    }

    // If without tasks, create a commit for tagging.
    if (tasks.length === 0) {
      await this.submit('');
    }

    return await this.tagging(created);
  }

  async latestID(): Promise<number> {
    const matchTag = <T extends ReposListTagsResponseData>(tags: T): any | undefined => {
      const regexp = new RegExp(`${this.prefix}\\d+\\-\\d+`.replace(/\./g, '\\$&'), 'g');
      for (const tag of Object.values(tags)) {
        if (regexp.test(tag.name)) {
          return tag;
        }
      }
    };

    try {
      const tags = await this.octokit.repos.listTags(this.credentials);
      if (!tags || !tags.data) {
        return 0;
      }

      const tag = matchTag(tags.data);
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

  private async tagging(stages: Task): Promise<boolean> {
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

  private filter(stages: Task[]): Task[] {
    const allowList = [
      /mp\.weixin\.qq\.com/,
      /https?:\/\/matters\.news/,
      /chinadigitaltimes\.net/,
      /https?:\/\/www\.rfa\.org/,
      /telegra\.ph/,
      /https?:\/\/(www|zhuanlan)\.zhihu\.com\/(question\/\d+\/answer\/\d+|p\/\d+)/,
      /https?:\/\/(www|m)\.douban\.com\/(note|people|doubanapp\/dispatch\?uri=\/(note\/|status\/\d+|group\/topic\/)|group\/topic\/)/,
      /https?:\/\/(www\.|m\.|card\.|weibointl\.api\.)?weibo\.(com|cn)\/(status\/\d+|\d+\/|share\/\d+|detail\/\d+|ttarticle\/p\/show|article\/m\/show\/id)/,
      /https?:\/\/web\.archive\.org\/web\/\d+\/\S+/,
    ];

    // return matched url.
    return Object.values(stages).filter((task) => {
      const url = task.url || '';
      if (url.length == 0) {
        return false;
      }

      const matched = allowList.filter((regexp) => {
        return regexp.test(url);
      });

      return matched.length > 0;
    });
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
      const file = await this.octokit.repos.getContent({
        owner: this.credentials.owner,
        repo: this.credentials.repo,
        path: this.credentials.path,
      });
      this.credentials.sha = file.data.sha;
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
