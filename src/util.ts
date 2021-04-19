export type SpreadArrays<T extends any[]> = T extends [any, ...infer V]
  ? [string[], ...SpreadArrays<V>]
  : T extends [any]
  ? [string[]]
  : []
const mapKeys = (arg: any) =>
  Object.keys(!arg ? {} : typeof arg === 'function' ? arg() : arg)

export const getKeys = <T extends any[]>(args: [...T]) => {
  return args.map(mapKeys) as SpreadArrays<T>
}

export const getAllKeys = (args: any[]): string[] => args.flatMap(mapKeys)

export function* iterateAll<T>(arrs: T[][]) {
  for (const arr of arrs) {
    for (const item of arr) {
      yield item
    }
  }
}
