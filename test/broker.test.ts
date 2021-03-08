import { Broker } from '../src';
import { DutyMachine } from '../src/duty-machine';
import { Stage } from '@wabarc/archiver';

it.skip('should process broker', async () => {
  const broker = new Broker().source({ platform: 'telegram', channel: 'channel-name' }).github({
    token: 'your9bb2faaccountf9f8d486b10baab23token',
    owner: 'github-account-name',
    repo: 'testing',
  });
  expect(broker).toBeInstanceOf(Broker);

  const done = await broker.begin();
  expect(done).toBe(true);
});

it('should accept uris', () => {
  const urls: string[] = [
    'https://chinadigitaltimes.net/chinese/2020/04/%e5%87%a4%e5%87%b0weekly',
    'https://www.douban.com/note/12341234/',
    'https://www.douban.com/doubanapp/dispatch?uri=/note/12341234/',
    'https://m.douban.com/note/12341234',
    'https://www.douban.com/group/topic/12341234',
    'https://m.douban.com/group/topic/12341234',
    'https://www.douban.com/doubanapp/dispatch?uri=/group/topic/12341234',
    'https://www.douban.com/people/123/status/456/',
    'https://m.douban.com/people/123/status/456/',
    'https://www.douban.com/doubanapp/dispatch?uri=/status/456',
    'https://matters.news/@somebody/title',
    'https://www.rfa.org/mandarin/xyz',
    'https://telegra.ph/%E8%B4%',
    'https://m.weibo.cn/status/12341234',
    'https://m.weibo.cn/status/abcxyz',
    'https://weibo.com/12341234/xyz',
    'https://m.weibo.cn/12341234/56789',
    'http://weibointl.api.weibo.com/share/12341234.html',
    'https://m.weibo.cn/detail/12341234',
    'https://weibo.com/ttarticle/p/show?id=12341234',
    'https://www.weibo.com/ttarticle/p/show?id=12341234',
    'https://card.weibo.com/article/m/show/id/12341234',
    'https://mp.weixin.qq.com/s/xyz',
    'https://www.zhihu.com/question/1234/answer/5678',
    'https://zhuanlan.zhihu.com/p/1234',
    'https://shimo.im/docs/abc123',
    'https://www.acfun.cn/a/ac123',
    'https://www.bilibili.com/read/cv123',
    'https://archiveofourown.org/works/123',
  ];
  const dtmc = new DutyMachine({ token: 'none', owner: 'foo', repo: 'bar' });
  const matched = urls.filter((url) => {
    return dtmc['allow'](url);
  });

  expect(matched.length).toBe(urls.length);
});

it('should transform data and zero result in uris', () => {
  const stages: Stage[] = [
    {
      id: 1,
      stage: {
        orig: ['https://www.google.com/codesearch'],
        ia: ['https://web.archive.org/web/20120914003420/https://www.google.com/codesearch'],
        is: ['https://archive.is/4Tt8P'],
        ip: ['https://ipfs.io/ipfs/QmV2bmWjmrnA8MnBrzHehnsSKh1xAAksgG8RzEPTxQ6EET'],
      },
    },
  ];

  const dtmc = new DutyMachine({ token: 'none', owner: 'foo', repo: 'bar' });
  const data = dtmc['transform'](stages);

  expect(data.length).toEqual(stages.length);
  expect(data['0']['uris'].length).toBe(0);
});

it('should transform data and has one result in uris', () => {
  const stages: Stage[] = [
    {
      id: 1,
      stage: {
        orig: ['https://mp.weixin.qq.com/s/xyz'],
        ia: ['https://web.archive.org/web/20120914003420/https://www.google.com/codesearch'],
        is: ['https://archive.is/4Tt8P'],
        ip: ['https://ipfs.io/ipfs/QmV2bmWjmrnA8MnBrzHehnsSKh1xAAksgG8RzEPTxQ6EET'],
      },
    },
  ];

  const dtmc = new DutyMachine({ token: 'none', owner: 'foo', repo: 'bar' });
  const data = dtmc['transform'](stages);

  expect(data.length).toEqual(stages.length);
  expect(data['0']['uris'].length).toBe(1);
});

it('should transform multiple stages data and has one result in uris', () => {
  const stages: Stage[] = [
    {
      id: 1,
      stage: {
        orig: ['https://mp.weixin.qq.com/s/xyz'],
        ia: ['https://web.archive.org/web/20120914003420/https://www.google.com/codesearch'],
        is: ['https://archive.is/4Tt8P'],
        ip: ['https://ipfs.io/ipfs/QmV2bmWjmrnA8MnBrzHehnsSKh1xAAksgG8RzEPTxQ6EET'],
      },
    },
    {
      id: 2,
      stage: {
        ia: ['https://web.archive.org/web/20120914003420/https://www.google.com/codesearch'],
        is: ['https://archive.is/4Tt8P'],
        ip: ['https://ipfs.io/ipfs/QmV2bmWjmrnA8MnBrzHehnsSKh1xAAksgG8RzEPTxQ6EET'],
        ph: ['https://telegra.ph/QmV2bmWjmrnA8MnBrzHehnsSKh1xAAksgG8RzEPTxQ6EET'],
      },
    },
  ];

  const dtmc = new DutyMachine({ token: 'none', owner: 'foo', repo: 'bar' });
  const data = dtmc['transform'](stages);

  expect(data.length).toEqual(stages.length);
  expect(data['0']['uris'].length).toBe(1);
});

it('should transform data and has two result in uris', () => {
  const stages: Stage[] = [
    {
      id: 1,
      stage: {
        ia: ['https://web.archive.org/web/20120914003420/https://www.google.com/codesearch'],
        is: ['https://archive.is/4Tt8P'],
        ip: ['https://ipfs.io/ipfs/QmV2bmWjmrnA8MnBrzHehnsSKh1xAAksgG8RzEPTxQ6EET'],
        ph: ['https://telegra.ph/QmV2bmWjmrnA8MnBrzHehnsSKh1xAAksgG8RzEPTxQ6EET', 'https://telegra.ph/somethings'],
      },
    },
  ];

  const dtmc = new DutyMachine({ token: 'none', owner: 'foo', repo: 'bar' });
  const data = dtmc['transform'](stages);

  expect(data.length).toEqual(stages.length);
  expect(data['0']['uris'].length).toBe(2);
});

it('should transform multiple ph data and has two result in uris', () => {
  const stages: Stage[] = [
    {
      id: 1,
      stage: {
        orig: ['https://mp.weixin.qq.com/s/xyz'],
        ia: ['https://web.archive.org/web/20120914003420/https://www.google.com/codesearch'],
        is: ['https://archive.is/4Tt8P'],
        ip: ['https://ipfs.io/ipfs/QmV2bmWjmrnA8MnBrzHehnsSKh1xAAksgG8RzEPTxQ6EET'],
        ph: ['https://telegra.ph/QmV2bmWjmrnA8MnBrzHehnsSKh1xAAksgG8RzEPTxQ6EET', 'https://telegra.ph/foo-bar'],
      },
    },
  ];

  const dtmc = new DutyMachine({ token: 'none', owner: 'foo', repo: 'bar' });
  const data = dtmc['transform'](stages);

  expect(data.length).toEqual(stages.length);
  expect(data['0']['uris'].length).toBe(2);
});
