import { Octokit } from '@octokit/rest';
import { Endpoints } from '@octokit/types';
import { Task } from '@wabarc/archiver';
import { promises as fs, unlinkSync } from 'fs';
import { basename } from 'path';
import { sleep } from './utils';

export class GitHub {
  private prefix = 'broker.gh.';
  private folder: string;
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

    const date = new Date();
    const month = date.getUTCMonth() + 1;
    const year = date.getUTCFullYear();
    this.folder = `contents/${year}${month.toString().padStart(2, '0')}`;
  }

  async process(stages: Task[]): Promise<boolean> {
    if (!stages || stages.length < 1) {
      return true;
    }

    const created: Task[] = [];
    let task: Task;

    for (task of stages) {
      if (task.success === true && task.path.length > 1) {
        await this.createContent(task.path).then((success) => {
          task.success = success;
          task.path = success ? `${this.folder}/${basename(task.path)}` : '';
          created.push(task);
        });
        await sleep(500);
      }
    }

    return await this.tagging(created);
  }

  async latestID(): Promise<number> {
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
      // https://octokit.github.io/rest.js/v18#repos-list-tags
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

  private async tagging(stages: Task[]): Promise<boolean> {
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

  private async createContent(filepath: string): Promise<boolean> {
    console.info('Process createContent start... ' + filepath);
    // Check file exists.
    try {
      await fs.stat(filepath);
    } catch (_) {
      console.info(`Process createContent, file [${filepath}] not exists...`);
      return false;
    }

    const path = `${this.folder}/${basename(filepath)}`;
    this.credentials.path = path;

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

    this.credentials.message = `Add ${basename(this.credentials.path)}`;
    this.credentials.content = await fs.readFile(filepath, { encoding: 'base64' });

    try {
      // doc: https://octokit.github.io/rest.js/v18#repos-create-or-update-file-contents
      const response = await this.octokit.repos.createOrUpdateFileContents(this.credentials);
      const succeed = response.data !== undefined && response.data.commit !== undefined;
      if (succeed) {
        this.credentials.sha = response.data.commit.sha || '';
      }
      unlinkSync(filepath);

      return succeed;
    } catch (_) {
      unlinkSync(filepath);
      console.info('Process createContent failure...');
      return false;
    }
  }
}
