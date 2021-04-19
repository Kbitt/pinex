import { computed, reactive } from '@vue/composition-api'
import { PluginObject } from 'vue'
import { ActionTree, GetterTree, Module, MutationTree, Store } from 'vuex'
import { set } from './getset'
import { getSetterAction, getSetterMutation } from './mutations'
import { defineState } from './state'
import { getStore, setStore } from './store'
import {
  StoreWithActions,
  StoreWithComputed,
  StoreWithGetters,
  StoreWithState,
  SubscribeCallback,
} from './types'

export const defineStore = <
  S extends Record<string | number | symbol, any>,
  P extends Record<string | number | symbol, any>,
  G,
  A,
  C
>({
  id,
  state,
  privateState,
  getters,
  actions,
  ...options
}: {
  id: string
  state?: () => S
  privateState?: () => P
  getters?: G & ThisType<Readonly<S & P & StoreWithGetters<G>>>
  actions?: A & ThisType<S & P & Readonly<A & StoreWithGetters<G>>>
  computed?: C & ThisType<C & S & P & Readonly<A & StoreWithGetters<G>>>
}): (() => StoreWithState<S> &
  Readonly<StoreWithGetters<G> & StoreWithActions<A>> &
  StoreWithComputed<C>) => {
  let store: Store<any>
  const setup = () => {
    const defaultState = state ? state() : {}
    const defaultPrivateState = privateState ? privateState() : {}

    const pxStore: any = {
      $subscribe: (cb: SubscribeCallback<any>) => {
        subscribeCallbacks.push(cb)
      },
    }

    const subscribeCallbacks: SubscribeCallback<S>[] = []

    const actionTree: ActionTree<S, any> = {}

    for (const key in actions || {}) {
      actionTree[key] = (_, payload) => {
        const a = (actions as any)[key] as Function

        return a.apply(pxStore, payload)
      }
      Object.defineProperty(pxStore, key, {
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
      pxStore[key] = computed(() => store.getters[id + '/' + key])
    }

    for (const key in options.computed || {}) {
      let computedMethod: Function
      const property = Object.getOwnPropertyDescriptor(options.computed, key)!
      if (property.set) {
        if (!property.get) {
          throw new Error(
            'Expected get and set to be defined on computed property'
          )
        }

        actionTree[getSetterAction(key)] = (_, payload) => {
          return property.set!.call(pxStore, payload)
        }

        computedMethod = property.get
      } else if (property.value && typeof property.value === 'function') {
        computedMethod = property.value
      } else {
        throw new Error(
          `Property ${key} not defined with getter or value for store id: ${id}`
        )
      }

      getterTree[key] = (s: any, g: any) => {
        const proxy = {} as any
        for (const sk in defaultState) {
          proxy[sk] = computed(() => s[sk])
        }
        for (const sk in defaultPrivateState) {
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

      pxStore[key] = computed({
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
      state:
        state || privateState
          ? () => ({
              ...(state ? state() : {}),
              ...(privateState ? privateState() : {}),
            })
          : undefined,
      getters: getterTree,
      mutations,
      actions: actionTree,
    }

    for (const key in defaultState) {
      defineState(id, pxStore, () => store, key, subscribeCallbacks)
    }

    for (const key in defaultPrivateState) {
      defineState(id, pxStore, () => store, key, subscribeCallbacks)
    }

    return [pxStore, vuexStore]
  }

  let pinexStore: any | undefined = undefined
  let vuexStoreConfig: Module<any, any> | undefined = undefined

  let gettersPrimed = false

  const modulePath = id.split('/')

  return () => {
    if (!pinexStore) {
      const [pStore, config] = setup()

      pinexStore = reactive(pStore)
      vuexStoreConfig = config
    }

    store = getStore()

    if (!store.hasModule(modulePath)) {
      store.registerModule(modulePath, vuexStoreConfig!)
    }

    if (!gettersPrimed) {
      if (vuexStoreConfig!.getters) {
        for (const key in vuexStoreConfig!.getters) {
          const _ = pinexStore[key] && pinexStore[key].value
        }
      }
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
