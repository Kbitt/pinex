import { computed, reactive, toRefs } from '@vue/composition-api'
import { PluginObject } from 'vue'
import { ActionTree, GetterTree, Module, MutationTree, Store } from 'vuex'
import { set } from './getset'
import { getSetterAction, getSetterMutation } from './mutations'
import { defineState } from './state'
import { getStore, setStore } from './store'
import { StoreDefinition, SubscribeCallback, UsePinexStore } from './types'

export const isUseStore = (
  def?: any
): def is UsePinexStore<any, any, any, any, any, any> => {
  if (!def) {
    return false
  }

  return typeof def === 'function'
}

const getState = <S, E>(
  options: StoreDefinition<any, any, any, any, any, any>
): S &
  (E extends StoreDefinition<infer SE, any, any, any, any, any> ? SE : {}) => {
  const { state } = options
  const extended = options.extends as
    | StoreDefinition<any, any, any, any, any, any>
    | undefined
  const extendedState = extended?.state
  return {
    ...(state ? state() : {}),
    ...(extendedState ? extendedState() : {}),
  }
}

const getPrivateState = <P, E>(
  options: StoreDefinition<any, P, any, any, any, E>
): P &
  (E extends StoreDefinition<any, infer PE, any, any, any, any> ? PE : {}) => {
  const { privateState } = options
  const extended = options.extends as
    | StoreDefinition<any, any, any, any, any, any>
    | undefined
  const extendedState = extended?.privateState
  return {
    ...(privateState ? privateState() : {}),
    ...(extendedState ? extendedState() : {}),
  }
}

type AnyStoreDef = StoreDefinition<any, any, any, any, any, any>

const merge = <A extends {}, B extends {}>(a?: A, b?: B) => {
  const result = {} as any

  Object.entries(Object.getOwnPropertyDescriptors(a || {}))
    .concat(Object.entries(Object.getOwnPropertyDescriptors(b || {})))
    .forEach(([key, value]) => {
      Object.defineProperty(result, key, value)
    })

  return result as A & B
}

const getWithExtended = (options: AnyStoreDef, key: keyof AnyStoreDef) => {
  const item = options[key]
  const extended = options.extends?.[key]
  return merge(item, extended)
}

const getGetters = (options: AnyStoreDef) => getWithExtended(options, 'getters')

const getActions = (options: AnyStoreDef) => getWithExtended(options, 'actions')

const getComputed = (options: AnyStoreDef) =>
  getWithExtended(options, 'computed')

export const defineStore = <
  S extends Record<string | number | symbol, any>,
  P extends Record<string | number | symbol, any>,
  G,
  A,
  C,
  E
>(
  options: StoreDefinition<S, P, G, A, C, E>
): UsePinexStore<S, P, G, A, C, E> => {
  const { id } = options
  const getters = getGetters(options)
  const actions = getActions(options)
  const computedDef = getComputed(options)
  let store: Store<any>
  const setup = () => {
    const defaultState = getState(options)
    const defaultPrivateState = getPrivateState(options)

    const pxStore: any = {
      $subscribe: (cb: SubscribeCallback<any>) => {
        subscribeCallbacks.push(cb)
      },
    }

    const subscribeCallbacks: SubscribeCallback<S>[] = []

    const actionTree: ActionTree<S, any> = {}

    for (const key in actions) {
      actionTree[key] = ({ state, commit }, payload) => {
        const a = (actions as any)[key] as Function

        const psProxy = {} as any
        for (const k in defaultPrivateState) {
          psProxy[k] = computed({
            get: () => state[k],
            set: value => commit(getSetterMutation(), { key: k, value }),
          })
        }
        const proxy = reactive({
          ...toRefs(pxStore),
          ...psProxy,
        })

        return a.apply(proxy, payload)
      }
      Object.defineProperty(pxStore, key, {
        enumerable: true,
        value: (...args: any[]) => store.dispatch(id + '/' + key, args),
      })
    }

    const getterTree: GetterTree<S, any> = {}

    for (const key in getters) {
      getterTree[key] = (s: any, g: any) => {
        const proxy = {} as any
        for (const sk in defaultState) {
          proxy[sk] = computed(() => s[sk])
        }
        for (const sk in defaultPrivateState) {
          proxy[sk] = computed(() => s[sk])
        }
        for (const gk in getters) {
          proxy[gk] = computed(() => g[gk])
        }
        for (const gk in computedDef) {
          proxy[gk] = computed(() => g[gk])
        }
        const getterMethod = (getters as any)[key] as Function
        return getterMethod.call(reactive(proxy))
      }
      pxStore[key] = computed(() => store.getters[id + '/' + key])
    }

    for (const key in computedDef) {
      let computedMethod: Function
      const property = Object.getOwnPropertyDescriptor(computedDef, key)!
      if (property.set) {
        if (!property.get) {
          throw new Error(
            'Expected get and set to be defined on computed property'
          )
        }

        actionTree[getSetterAction(key)] = ({ state, commit }, payload) => {
          const psProxy = {} as any
          for (const k in defaultPrivateState) {
            psProxy[k] = computed({
              get: () => state[k],
              set: value => commit(getSetterMutation(), { key: k, value }),
            })
          }
          const proxy = reactive({
            ...toRefs(pxStore),
            ...psProxy,
          })
          return property.set!.call(proxy, payload)
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
          Object.assign(state, value)
        } else {
          set(state, key, value)
        }
      },
    }

    const vuexStore = {
      namespaced: true,
      state: () => ({
        ...defaultState,
        ...defaultPrivateState,
      }),
      getters: getterTree,
      mutations,
      actions: actionTree,
    }

    for (const key in defaultState) {
      defineState(id, pxStore, () => store, key, subscribeCallbacks)
    }

    return [pxStore, vuexStore]
  }

  let pinexStore: any | undefined = undefined
  let vuexStoreConfig: Module<any, any> | undefined = undefined

  let gettersPrimed = false

  const modulePath = id.split('/')

  const useStore = (() => {
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
  }) as UsePinexStore<S, P, G, A, C, E>
  useStore.$definition = options
  return useStore
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
