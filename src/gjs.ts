type GObjectClass = new (...args: any[]) => object;

export function registerGObjectClass<T extends GObjectClass>(klass: T): T {
  return klass;
}

export type gettextFunc = (str: string) => string;
