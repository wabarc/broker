export const createFilename = (uri: string, title: string): string => {
  if (uri.length < 3) {
    return 'unknow';
  }

  return (
    decodeURI(uri)
      .replace(/http(s)?:\/\//gm, '')
      .replace(/\./g, '-')
      .replace(/\//g, '-') +
    '-' +
    decodeURI(title) +
    '.html'
  );
};

export const sleep = (ms: number): Promise<void> => {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
};
