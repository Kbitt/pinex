export type DeepOptional<T extends {}> = {
  [K in keyof T]?: T[K] extends {} ? DeepOptional<T[K]> : T[K]
}
export type SubscribeCallback<S> = (
  state: S,
  newPartialState: Partial<S>
) => void

export type StoreWithState<S, E> = S & {
  $subscribe(cb: SubscribeCallback<S>): void
} & (E extends StoreDefinition<infer ES, any, any, any, any, any> ? ES : {})

export type StoreWithGetters<G, E> = {
  [k in keyof G]: G[k] extends (this: infer This, store?: any) => infer R
    ? R
    : {}
} &
  (E extends StoreDefinition<any, any, infer EG, any, any, any>
    ? StoreWithGetters<EG, void>
    : {})

export type StoreWithActions<A, E> = {
  [k in keyof A]: A[k] extends (...args: infer P) => infer R
    ? (...args: P) => R
    : {}
} &
  (E extends StoreDefinition<any, any, any, infer EA, any, any>
    ? StoreWithActions<EA, void>
    : {})

export type StoreWithComputed<C, E> = {
  [K in keyof C]: C[K] extends () => infer R ? R : C[K]
} &
  (E extends StoreDefinition<any, any, any, any, infer CE, any>
    ? StoreWithComputed<CE, void>
    : {})

export type ExtendedState<E> = E extends StoreDefinition<
  infer S,
  infer P,
  any,
  any,
  any,
  any
>
  ? S & P
  : {}

export type ExtendedActions<E> = E extends StoreDefinition<
  any,
  any,
  any,
  infer A,
  any,
  any
>
  ? A
  : {}

export type StoreDefinition<
  S extends Record<string | number | symbol, any>,
  P extends Record<string | number | symbol, any>,
  G,
  A,
  C,
  E
> = {
  id: string
  state?: () => S
  privateState?: () => P
  getters?: G &
    ThisType<Readonly<S & P & ExtendedState<E> & StoreWithGetters<G, E>>>
  actions?: A &
    ThisType<
      S &
        P &
        ExtendedState<E> &
        Readonly<
          A &
            ExtendedActions<E> &
            StoreWithGetters<G, E> &
            StoreWithComputed<C, E>
        >
    >
  computed?: C &
    ThisType<
      S &
        P &
        Readonly<
          A &
            ExtendedActions<E> &
            StoreWithGetters<G, E> &
            StoreWithComputed<C, E>
        >
    >
  extends?: E
}

export type PinexStore<
  S extends Record<string | number | symbol, any>,
  G,
  A,
  C,
  E
> = StoreWithState<S, E> &
  Readonly<StoreWithGetters<G, E> & StoreWithActions<A, E>> &
  StoreWithComputed<C, E>

export type UsePinexStore<
  S extends Record<string | number | symbol, any>,
  P extends Record<string | number | symbol, any>,
  G,
  A,
  C,
  E
> = {
  (): PinexStore<S, G, A, C, E>
  $definition: StoreDefinition<S, P, G, A, C, E>
}
