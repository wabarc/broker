export declare type Context = {
  dir: string;
  from: number;
  to: number;
};

export declare type Config = {
  channel: string;
  context: Context;
};

export declare type Upstream = {
  platform?: 'telegram';
  channel: string;
  limit?: number;
};
export declare type Data4DTMC = {
  id: number;
  uris: string[];
};
