# broker

Read this in other languages: English | [简体中文](./README_zh-CN.md)

Distribute archived webpages.

## Prerequisites

- A GitHub account ([create](https://github.com/join))
- A GitHub repository ([create](https://github.com/new))
- Personal access token ([create](https://github.com/settings/tokens/new))

Personal access token only required scope of read repository.

## Installation

Using npm:

```bash
npm install @wabarc/broker
```

Using yarn:

```bash
yarn add @wabarc/broker
```

## Example

As CLI:

```bash
$ broker

Usage: broker github|gh [options]

Distribute webpages to GitHub repository.

Options:
  -t, --token [string]            GitHub account token.
  -o, --owner [string]            GitHub account name.
  -r, --repo [string]             GitHub repository name.
  -s, --source [string] <source>  Webpages source (default: "telegram")
  -c, --channel [string]          source platform name
  -h, --help                      display help for command
```

As npm package:

```javascript
import { Broker } from '@wabarc/broker';

const broker = new Broker().source({ platform: 'telegram', channel: 'channel-name' }).github({
  token: 'your9bb2faaccountf9f8d486b10baab23token',
  owner: 'github-account-name',
  repo: 'testing',
});

const done = await broker.begin();
console.log(done)
```

## Instance methods

The available instance methods are listed below.

- broker#source({ platform?: 'telegram', channel: string })
- broker#github({ token: string, owner: string, repo: string })
- broker#begin()

## License

This software is released under the terms of the GNU General Public License v3.0. See the [LICENSE](https://github.com/wabarc/broker/blob/master/LICENSE) file for details.
