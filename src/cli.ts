#!/usr/bin/env node
import { Command } from 'commander';
import { Broker } from './broker';

async function github(cmd) {
  const { token, owner, repo, channel, limit } = cmd;
  if (!token || !owner || !repo || !channel) {
    cmd.help();
    process.exit(0);
  }

  const broker = new Broker()
    .source({ channel: channel, limit: process.env.BROKER_MSG_LIMIT || limit })
    .github({ token, owner, repo });

  await broker.begin().then(() => process.exit());
}

const main = async () => {
  const program = new Command();

  const toInt = (v) => {
    return parseInt(v);
  };

  program
    .name('broker')
    .usage('[subcommand] [options]')
    .version('0.0.1', '-v, --version', 'output the current version')
    .description('CLI tool for distribute webpages to Wayback Machine.');

  program
    .command('github', { isDefault: true })
    .alias('gh')
    .description('Distribute webpages to GitHub repository.')
    .option('-t, --token [string]', 'GitHub account token.')
    .option('-o, --owner [string]', 'GitHub account name.')
    .option('-r, --repo [string]', 'GitHub repository name.')
    .option('-s, --source [string] <source>', 'Webpages source', 'telegram')
    .option('-c, --channel [string]', 'source platform name')
    .option('-l, --limit [number]', 'fetch message limit one time', toInt, 25)
    .action(github);

  await program.parseAsync(process.argv);
};

main();
