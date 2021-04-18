export type SubscribeCallback<S> = (
  state: S,
  newPartialState: Partial<S>
) => void

export type StoreWithState<S> = S & {
  $subscribe(cb: SubscribeCallback<S>): void
}

export type StoreWithGetters<G> = {
  [k in keyof G]: G[k] extends (this: infer This, store?: any) => infer R
    ? R
    : {}
}
export type StoreWithActions<A> = {
  [k in keyof A]: A[k] extends (...args: infer P) => infer R
    ? (...args: P) => R
    : {}
}

export type ComputedProperties<C> = {
  [K in keyof C]: C[K] extends ComputedProperty<any>
    ? ComputedProperty<any>
    : never
}

export type SettableComputed<R> = {
  get(): R
  set(value: R): any
}

export type ReadonlyComputed<R> = {
  (): R
}

export type ComputedProperty<R> = SettableComputed<R> | ReadonlyComputed<R>

export type StoreWithComputed<C> = {
  [K in keyof C]: C[K] extends ComputedProperty<infer R> ? R : never
}
