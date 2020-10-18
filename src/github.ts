import { Octokit } from '@octokit/rest';
import { Task } from '@wabarc/packer';
import { promises as fs, unlinkSync } from 'fs';
import { basename } from 'path';

export class GitHub {
  private prefix = 'broker.';
  private folder: string;
  private octokit: Octokit;
  private credentials;

  constructor(private contract: { token: string; owner: string; repo: string }) {
    const { token, owner, repo } = contract;

    this.contract = contract;
    this.credentials = { owner, repo };
    this.octokit = new Octokit({ auth: token });

    const date = new Date();
    const month = date.getUTCMonth() + 1;
    const year = date.getUTCFullYear();
    this.folder = `contents/${year}${month.toString().padStart(2, '0')}`;
  }

  async process(stages: Task[]): Promise<boolean> {
    const created: Task[] = [];
    let task: Task;

    for (task of stages) {
      await this.createContent(task.path).then((success) => {
        if (task.path.length > 1) {
          task.success = success;
          task.path = success ? `${this.folder}/${basename(task.path)}` : '';
          created.push(task);
        }
      });
    }

    return await this.tagging(created);
  }

  async latestID(): Promise<number> {
    try {
      const tags = await this.octokit.repos.listTags(this.credentials);
      if (!tags || !tags.data) {
        return 0;
      } else {
        const latest = tags.data[0].name || '';
        const id = latest.replace(this.prefix, '').split('-')[1] || '';
        return id.length > 0 ? parseInt(id) : 0;
      }
    } catch (_) {
      return 0;
    }
  }

  private async tagging(stages: Task): Promise<boolean> {
    console.info('Process tagging start...');
    if (!stages || stages.length < 1) {
      console.info('Process tagging error, message: params stages invalid.');
      return false;
    }

    const from = stages[0].id || -1;
    const to = stages[stages.length - 1].id || -1;
    if (from <= 0 || to <= 0 || from > to) {
      console.info('Process tagging error, message: params [from, to] invalid.');
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
    } finally {
      console.info('Process tagging, created tag object.');
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

    return true;
  }

  private async createContent(filepath: string): Promise<boolean> {
    console.info('Process createContent start...');
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
    // If exist, return file sha1 digest
    try {
      // doc: https://octokit.github.io/rest.js/v18#repos-get-content
      const file = await this.octokit.repos.getContent(this.credentials);
      this.credentials.sha = file.data.sha;
    } catch (err) {
      if (err.status !== 404) {
        unlinkSync(filepath);
        return false;
      }
    }

    const operator = this.credentials.sha === undefined ? 'Add ' : 'Update ';

    this.credentials.message = operator + basename(filepath);
    this.credentials.content = await fs.readFile(filepath, { encoding: 'base64' });

    try {
      // doc: https://octokit.github.io/rest.js/v18#repos-create-or-update-file-contents
      const response = await this.octokit.repos.createOrUpdateFileContents(this.credentials);
      const succeed = response.data !== undefined && response.data.content.path === path;
      console.log(response.data.content.path, path);
      if (succeed) {
        this.credentials.sha = response.data.commit.sha || '';
      }

      unlinkSync(filepath);

      return succeed;
    } catch (_) {
      unlinkSync(filepath);
      console.info('Process createContent error...');
      return false;
    }
  }
}
