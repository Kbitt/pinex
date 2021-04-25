type IfEquals<X, Y, A = X, B = never> = (<T>() => T extends X ? 1 : 2) extends <
  T
>() => T extends Y ? 1 : 2
  ? A
  : B

/**
 * Get all keys for the given type that are writable.
 */
type WritableKeys<T> = {
  [P in keyof T]-?: IfEquals<
    { [Q in P]: T[P] },
    { -readonly [Q in P]: T[P] },
    P
  >
}[keyof T]

type FilterWritableOnly<T> = {
  [P in WritableKeys<T>]: T[P]
}

type FilterWritableNonFunction<T> = {
  [P in keyof Omit<
    FilterWritableOnly<T>,
    FunctionKeys<FilterWritableOnly<T>>
  >]: T[P]
}

/**
 * Get all keys for the given type that are readonly.
 */
type ReadonlyKeys<T> = {
  [P in keyof T]-?: IfEquals<
    { [Q in P]: T[P] },
    { -readonly [Q in P]: T[P] },
    never,
    P
  >
}[keyof T]

type FilterReadOnly<T> = {
  [P in ReadonlyKeys<T>]: T[P]
}

type IsReadonly<T, U extends keyof T> = U extends ReadonlyKeys<T> ? U : never

/**
 * Get all keys for the given type that are functions (not fields).
 */
type FunctionKeys<T> = {
  [P in keyof T]: T[P] extends () => any ? P : never
}[keyof T]

type FilterFunctionOnly<T> = {
  [P in FunctionKeys<T>]: T[P]
}

/**
 * Get all keys for the given type that are fields (not functions).
 */
type FieldKeys<T> = {
  [P in keyof T]: T[P] extends () => any ? never : P
}[keyof T]

export type DeepOptional<T extends {}> = {
  [K in keyof T]?: T[K] extends {} ? DeepOptional<T[K]> : T[K]
}
export type SubscribeCallback<S> = (
  state: S,
  newPartialState: Partial<S>
) => void

export type Norm<T> = T extends {} ? T : unknown

type UseAnyStore = UsePinexStore<any, any, any, any, any>

export type MergeState<S, E> = S &
  (E extends UsePinexStore<infer SE, any, any, any, any> ? SE : {})

export type MergePrivateState<P, E> = P &
  (E extends UsePinexStore<any, infer PE, any, any, any> ? PE : {})

export type MergeGetters<G, E> = G &
  (E extends UsePinexStore<any, any, infer GE, any, any> ? GE : {})

export type MergeActions<A, E> = A &
  (E extends UsePinexStore<any, any, any, infer AE, any> ? AE : {})

export type MergeComputed<C, E> = C &
  (E extends UsePinexStore<any, any, any, any, infer CE> ? CE : {})

export type StoreWithState<S> = S & {
  $subscribe(cb: SubscribeCallback<S>): void
}

export type StoreWithGetters<G> = G extends {}
  ? {
      [k in keyof G]: G[k] extends (this: infer This, store?: any) => infer R
        ? R
        : {}
    }
  : {}

export type StoreWithActions<A> = A extends {}
  ? {
      [k in keyof A]: A[k] extends (...args: infer P) => infer R
        ? (...args: P) => R
        : {}
    }
  : {}

export type StoreWithComputed<C> = {
  [K in keyof C]: C[K] extends () => infer R ? R : C[K]
}

export type ExtendedState<E> = E extends UsePinexStore<any, any, any, any, any>
  ? E['$definition'] extends StoreDefinition<
      infer S,
      infer P,
      any,
      any,
      any,
      any
    >
    ? S & P
    : {}
  : {}

export type ExtendedActions<E> = E extends UsePinexStore<
  any,
  any,
  any,
  any,
  any
>
  ? E['$definition'] extends StoreDefinition<any, any, any, infer A, any, any>
    ? A
    : {}
  : {}

export type ExtendedStoreDefinitionState<S, E> = E extends UsePinexStore<
  any,
  any,
  any,
  any,
  any
>
  ? E['$definition'] extends StoreDefinition<infer SE, any, any, any, any, any>
    ? S & SE
    : S
  : S

export type ExtendedStoreDefinitionPrivateState<P, E> = E extends UsePinexStore<
  any,
  any,
  any,
  any,
  any
>
  ? E['$definition'] extends StoreDefinition<any, infer PE, any, any, any, any>
    ? P & PE
    : P
  : P

export type ExtendedDefinitionGetters<G, E> = E extends UsePinexStore<
  any,
  any,
  any,
  any,
  any
>
  ? E['$definition'] extends StoreDefinition<any, any, infer GE, any, any, any>
    ? G & GE
    : G
  : G

export type ExtendedDefintionActions<A, E> = E extends UsePinexStore<
  any,
  any,
  any,
  any,
  any
>
  ? E['$definition'] extends StoreDefinition<any, any, any, infer AE, any, any>
    ? A & AE
    : A
  : A

export type ExtendedDefinitionComputed<C, E> = E extends UsePinexStore<
  any,
  any,
  any,
  any,
  any
>
  ? E['$definition'] extends StoreDefinition<any, any, any, any, infer CE, any>
    ? C & CE
    : C
  : C

export type ExtendedStoreDefinition<
  S extends {},
  P extends {},
  G,
  A,
  C,
  E
> = StoreDefinition<
  MergeState<S, E>,
  MergePrivateState<P, E>,
  MergeGetters<G, E>,
  MergeActions<A, E>,
  MergeComputed<C, E>,
  void
>

export type StoreDefinition<S extends {}, P extends {}, G, A, C, E> = {
  id: string
  state?: () => S
  privateState?: () => P
  getters?: G &
    ThisType<
      Readonly<
        S &
          P &
          ExtendedState<E> &
          StoreWithComputed<MergeComputed<C, E>> &
          StoreWithGetters<MergeGetters<G, E>>
      >
    >
  actions?: A &
    ThisType<
      S &
        P &
        ExtendedState<E> &
        StoreWithComputed<MergeComputed<C, E>> &
        Readonly<MergeActions<A, E> & StoreWithGetters<MergeGetters<G, E>>>
    >
  computed?: C &
    ThisType<
      S &
        P &
        ExtendedState<E> &
        StoreWithComputed<MergeComputed<C, E>> &
        Readonly<MergeActions<A, E> & StoreWithGetters<MergeGetters<G, E>>>
    >
  extends?: E
}

export type PinexStore<S, G, A, C> = StoreWithState<S> &
  StoreWithComputed<C> &
  Readonly<StoreWithGetters<G> & StoreWithActions<A>>

export type UsePinexStore<S, P, G, A, C> = {
  (): PinexStore<S, G, A, C>
  $definition: StoreDefinition<S, P, G, A, C, void>
}
