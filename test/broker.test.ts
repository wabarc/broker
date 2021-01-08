import { Broker } from '../src';
import { DutyMachine } from '../src/duty-machine';
import { Task } from '@wabarc/packer';

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
  // declare type Task = {
  //   id: number;
  //   url: string;
  //   path: string;
  //   success: boolean;
  // };
  const tasks: Task[] = [
    {
      id: 1,
      url: 'https://chinadigitaltimes.net/chinese/2020/04/%e5%87%a4%e5%87%b0weekly',
      path: 'foo/bar',
      success: true,
    },
    {
      id: 1,
      url: 'https://www.douban.com/note/12341234/',
      path: 'foo/bar',
      success: true,
    },
    {
      id: 1,
      url: 'https://www.douban.com/doubanapp/dispatch?uri=/note/12341234/',
      path: 'foo/bar',
      success: true,
    },
    {
      id: 1,
      url: 'https://m.douban.com/note/12341234',
      path: 'foo/bar',
      success: true,
    },
    {
      id: 1,
      url: 'https://www.douban.com/group/topic/12341234',
      path: 'foo/bar',
      success: true,
    },
    {
      id: 1,
      url: 'https://m.douban.com/group/topic/12341234',
      path: 'foo/bar',
      success: true,
    },
    {
      id: 1,
      url: 'https://www.douban.com/doubanapp/dispatch?uri=/group/topic/12341234',
      path: 'foo/bar',
      success: true,
    },
    {
      id: 1,
      url: 'https://www.douban.com/people/123/status/456/',
      path: 'foo/bar',
      success: true,
    },
    {
      id: 1,
      url: 'https://m.douban.com/people/123/status/456/',
      path: 'foo/bar',
      success: true,
    },
    {
      id: 1,
      url: 'https://www.douban.com/doubanapp/dispatch?uri=/status/456',
      path: 'foo/bar',
      success: true,
    },
    {
      id: 1,
      url: 'https://matters.news/@somebody/title',
      path: 'foo/bar',
      success: true,
    },
    {
      id: 1,
      url: 'https://www.rfa.org/mandarin/xyz',
      path: 'foo/bar',
      success: true,
    },
    {
      id: 1,
      url: 'https://telegra.ph/%E8%B4%',
      path: 'foo/bar',
      success: true,
    },
    {
      id: 1,
      url: 'https://m.weibo.cn/status/12341234',
      path: 'foo/bar',
      success: true,
    },
    {
      id: 1,
      url: 'https://m.weibo.cn/status/abcxyz',
      path: 'foo/bar',
      success: true,
    },
    {
      id: 1,
      url: 'https://weibo.com/12341234/xyz',
      path: 'foo/bar',
      success: true,
    },
    {
      id: 1,
      url: 'https://m.weibo.cn/12341234/56789',
      path: 'foo/bar',
      success: true,
    },
    {
      id: 1,
      url: 'http://weibointl.api.weibo.com/share/12341234.html',
      path: 'foo/bar',
      success: true,
    },
    {
      id: 1,
      url: 'https://m.weibo.cn/detail/12341234',
      path: 'foo/bar',
      success: true,
    },
    {
      id: 1,
      url: 'https://weibo.com/ttarticle/p/show?id=12341234',
      path: 'foo/bar',
      success: true,
    },
    {
      id: 1,
      url: 'https://www.weibo.com/ttarticle/p/show?id=12341234',
      path: 'foo/bar',
      success: true,
    },
    {
      id: 1,
      url: 'https://card.weibo.com/article/m/show/id/12341234',
      path: 'foo/bar',
      success: true,
    },
    {
      id: 1,
      url: 'https://mp.weixin.qq.com/s/xyz',
      path: 'foo/bar',
      success: true,
    },
    {
      id: 1,
      url: 'https://www.zhihu.com/question/1234/answer/5678',
      path: 'foo/bar',
      success: true,
    },
    {
      id: 1,
      url: 'https://zhuanlan.zhihu.com/p/1234',
      path: 'foo/bar',
      success: true,
    },
    {
      id: 1,
      url: 'https://web.archive.org/web/20000101123456/https://example.org',
      path: 'foo/bar',
      success: true,
    },
  ];
  const dtmc = new DutyMachine({ token: 'none', owner: 'foo', repo: 'bar' });
  const matched = dtmc['filter'](tasks);

  expect(matched.length).toBe(tasks.length);
});
