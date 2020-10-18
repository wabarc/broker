import { Broker } from '../src';

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
