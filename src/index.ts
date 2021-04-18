import { computed, reactive, toRefs, unref } from '@vue/composition-api'
import { PluginObject } from 'vue'
import { ActionTree, GetterTree, MutationTree, Store, Module } from 'vuex'
import { createPatchState, get, set } from './getset'
import { getSetterAction, getSetterMutation } from './mutations'
import { createProxy } from './proxy'
import { getStore, setStore } from './store'

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

export const defineStore = <
  S extends Record<string | number | symbol, any>,
  G,
  A,
  C
>({
  id,
  state,
  getters,
  actions,
  ...options
}: {
  id: string
  state?: () => S
  getters?: G & ThisType<Readonly<S & StoreWithGetters<G>>>
  actions?: A & ThisType<S & Readonly<A & StoreWithGetters<G>>>
  computed?: C & ThisType<C & S & Readonly<A & StoreWithGetters<G>>>
}): (() => StoreWithState<S> &
  Readonly<StoreWithGetters<G> & StoreWithActions<A>> &
  StoreWithComputed<C>) => {
  let store: Store<any>
  const setup = () => {
    const defaultState = state ? state() : {}

    let pinexStore: any = {
      $subscribe: (cb: SubscribeCallback<any>) => {
        subscribeCallbacks.push(cb)
      },
    }

    const subscribeCallbacks: SubscribeCallback<S>[] = []

    const actionTree: ActionTree<S, any> = {}

    for (const key in actions || {}) {
      actionTree[key] = (_, payload) => {
        const a = (actions as any)[key] as Function

        return a.apply(pinexStore, payload)
      }
      Object.defineProperty(pinexStore, key, {
        enumerable: true,
        value: (...args: any[]) => store.dispatch(id + '/' + key, args),
      })
    }

    const getterTree: GetterTree<S, any> = {}

    for (const key in getters || {}) {
      getterTree[key] = (s: any, g: any) => {
        const proxy = {} as any
        for (const sk in defaultState) {
          proxy[sk] = computed(() => s[sk])
        }
        for (const gk in getters || {}) {
          proxy[gk] = computed(() => g[gk])
        }
        for (const gk in options.computed || {}) {
          proxy[gk] = computed(() => g[gk])
        }
        const getterMethod = (getters as any)[key] as Function
        return getterMethod.call(reactive(proxy))
      }
      pinexStore[key] = computed(() => store.getters[id + '/' + key])
    }

    for (const key in options.computed || {}) {
      let computedMethod: Function
      if (typeof (options.computed as any)[key] === 'object') {
        const prop = (options.computed as any)[key] as SettableComputed<any>
        if (!prop.get || !prop.set) {
          throw new Error(
            'Expected get and set to be defined on computed property'
          )
        }

        actionTree[getSetterAction(key)] = (_, payload) => {
          return prop.set.call(pinexStore, payload)
        }

        computedMethod = prop.get
      } else {
        computedMethod = (options.computed as any)[key]
      }

      getterTree[key] = (s: any, g: any) => {
        const proxy = {} as any
        for (const sk in defaultState) {
          proxy[sk] = computed(() => s[sk])
        }
        for (const gk in getters || {}) {
          proxy[gk] = computed(() => g[gk])
        }
        for (const ck in options.computed || {}) {
          proxy[ck] = computed(() => g[ck])
        }
        return computedMethod.call(reactive(proxy))
      }

      pinexStore[key] = computed({
        get: () => store.getters[id + '/' + key],
        set: value => store.dispatch(getSetterAction(key, id), value),
      })
    }

    const mutations: MutationTree<S> = {
      [getSetterMutation()]: (
        state,
        { key, value }: { key: string; value: any }
      ) => {
        if (!key) {
          Object.entries(value).forEach(([key, val]) => {
            ;(state as any)[key] = val
          })
        } else {
          set(state, key, value)
        }
      },
    }

    const vuexStore = {
      namespaced: true,
      state,
      getters: getterTree,
      mutations,
      actions: actionTree,
    }

    for (const key in defaultState) {
      pinexStore[key] = computed({
        get: () => {
          const path = [id, key].join('.')
          const value = get(store.state, path)
          if (typeof value !== 'object') {
            return value
          }
          return createProxy([value], {
            setter: (propKey, value) => {
              const innerPath = [key, propKey].filter(Boolean).join('.')
              subscribeCallbacks.forEach(cb => {
                const rawState = JSON.parse(
                  JSON.stringify(get(store.state, id))
                )
                const patchState = createPatchState(rawState, innerPath, value)
                cb(rawState, patchState)
              })
              store.commit(getSetterMutation(id), {
                key: [key, propKey].filter(Boolean).join('.') || undefined,
                value,
              })
            },
          })
        },
        set: value => {
          subscribeCallbacks.forEach(cb => {
            const rawState = unref(get(store.state, key))
            const patchState = createPatchState(
              rawState,
              [id, key].join('.'),
              value
            )
            cb(rawState, patchState)
          })
          store.commit(getSetterMutation(id), { key, value })
        },
      })
    }

    return [pinexStore, vuexStore]
  }

  let pinexStore: any | undefined = undefined
  let vuexStoreConfig: Module<any, any> | undefined = undefined

  let gettersPrimed = false

  const modulePath = id.split('/')

  return () => {
    if (!pinexStore) {
      ;[pinexStore, vuexStoreConfig] = setup()
    }

    store = getStore()

    if (!store.hasModule(modulePath)) {
      store.registerModule(modulePath, vuexStoreConfig!)
    }

    pinexStore = reactive(pinexStore)

    if (!gettersPrimed) {
      Object.keys(vuexStoreConfig?.getters ?? {}).forEach(key => {
        const _ = pinexStore[key].value
      })
      gettersPrimed = true
    }
    return pinexStore
  }
}

const Plugin: PluginObject<{ store: Store<any> }> = {
  install: (Vue, options) => {
    if (options?.store) {
      setStore(options.store)
    } else {
      Vue.mixin({
        beforeCreate() {
          setStore(this.$store)
        },
      })
    }
  },
}

export default Plugin
