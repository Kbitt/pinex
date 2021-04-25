import { computed, reactive, toRefs } from '@vue/composition-api'
import { ActionTree, GetterTree, Module, MutationTree, Store } from 'vuex'
import { set } from './getset'
import { getSetterAction, getSetterMutation } from './mutations'
import { defineState } from './state'
import { getStore } from './store'
import {
  ExtendedStoreDefinition,
  StoreDefinition,
  SubscribeCallback,
  UsePinexStore,
} from './types'

type AnyUseStore = UsePinexStore<any, any, any, any, any, any>

const mergeFn = <A, B>(getA?: () => A, getB?: () => B) => {
  if (!getA && !getB) {
    return undefined
  }

  if (!getA || !getB) {
    const fn = (getA ?? getB)!

    return () => fn()
  }

  return () => ({
    ...getA(),
    ...getB(),
  })
}

const merge = <A extends {}, B extends {}>(a?: A, b?: B) => {
  if (!a && !b) {
    return undefined
  }

  const result = {} as any

  Object.entries(Object.getOwnPropertyDescriptors(a || {}))
    .concat(Object.entries(Object.getOwnPropertyDescriptors(b || {})))
    .forEach(([key, value]) => {
      Object.defineProperty(result, key, { ...value, configurable: true })
    })

  return result as A & B
}

const mergeExtended = <S extends {}, P extends {}, G, A, C, E>(
  options: StoreDefinition<S, P, G, A, C, E>
): ExtendedStoreDefinition<S, P, G, A, C, E> => {
  if (!options.extends) {
    return options as ExtendedStoreDefinition<S, P, G, A, C, E>
  }

  const extended = ((options.extends as any) as AnyUseStore).$definition

  const result = {} as Partial<ExtendedStoreDefinition<S, P, G, A, C, E>>

  result.state = mergeFn(extended.state, options.state)

  result.privateState = mergeFn(extended.privateState, options.privateState)

  result.getters = merge(extended.getters, options.getters)

  result.actions = merge(extended.actions, options.actions)

  result.computed = merge(extended.computed, options.computed)

  return result as ExtendedStoreDefinition<S, P, G, A, C, E>
}

export const defineStore = <S extends {}, P extends {}, G, A, C, E>(
  options: StoreDefinition<S, P, G, A, C, E>
): UsePinexStore<S, P, G, A, C, E> => {
  const { id } = options
  const mergedOptions = mergeExtended(options)
  const { getters, actions, computed: computedDef } = mergedOptions
  const defaultState = mergedOptions.state ? mergedOptions.state() : {}
  const defaultPrivateState = mergedOptions.privateState
    ? mergedOptions.privateState()
    : {}
  let store: Store<any>
  const setup = () => {
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
            get: () => (state as any)[k],
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
      if (property.get) {
        computedMethod = property.get
        if (property.set) {
          actionTree[getSetterAction(key)] = ({ state, commit }, payload) => {
            const psProxy = {} as any
            for (const k in defaultPrivateState) {
              psProxy[k] = computed({
                get: () => (state as any)[k],
                set: value => commit(getSetterMutation(), { key: k, value }),
              })
            }
            const proxy = reactive({
              ...toRefs(pxStore),
              ...psProxy,
            })
            return property.set!.call(proxy, payload)
          }
        }
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
        for (const ck in mergedOptions.computed || {}) {
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
  useStore.$definition = mergedOptions
  return useStore as UsePinexStore<S, P, G, A, C, E>
}
