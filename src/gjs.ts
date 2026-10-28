import GObject from 'gi://GObject';

type GObjectClass = new (...args: any[]) => object;

export function registerGObjectClass<T extends GObjectClass>(klass: T): T {
  return GObject.registerClass({}, klass) as unknown as T;
}

export type gettextFunc = (str: string) => string;
