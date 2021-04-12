import { computed, reactive, unref } from '@vue/composition-api'
import { PluginObject } from 'vue'
import { ActionTree, GetterTree, MutationTree, Store, Module } from 'vuex'
import { get, set } from './getset'
import { createProxy } from './proxy'
import { getStore, setStore } from './store'

export type StoreWithGetters<G> = {
  [k in keyof G]: G[k] extends (this: infer This, store?: any) => infer R
    ? R
    : never
}
export type StoreWithActions<A> = {
  [k in keyof A]: A[k] extends (...args: infer P) => infer R
    ? (...args: P) => R
    : never
}

export const defineStore = <
  S extends Record<string | number | symbol, any>,
  G,
  A
>({
  id,
  state,
  getters,
  actions,
}: {
  id: string
  state?: () => S
  getters?: G & ThisType<Readonly<S & StoreWithGetters<G>>>
  actions?: A & ThisType<S & Readonly<A & StoreWithGetters<G>>>
}): (() => S & Readonly<StoreWithGetters<G> & StoreWithActions<A>>) => {
  let store: Store<any>
  const setup = () => {
    const stateKeys = state ? Object.keys(state()) : []
    const getterKeys = getters ? Object.keys(getters) : []
    const actionKeys = actions ? Object.keys(actions) : []

    if (
      typeof process !== 'undefined' &&
      process.env?.NODE_ENV !== 'production'
    ) {
      const keySet: Record<string, boolean> = {}
      stateKeys.forEach(key => keySet[key])
      let hasDuplicates = false
      getterKeys.forEach(key => {
        if (keySet[key]) {
          hasDuplicates = true
          console.error(`Duplicate getter key: '${key}'.`)
        } else {
          keySet[key] = true
        }
      })

      actionKeys.forEach(key => {
        if (keySet[key]) {
          hasDuplicates = true
          console.error(`Duplicate action key: '${key}'.`)
        } else {
          keySet[key] = true
        }
      })

      if (hasDuplicates) {
        console.error(
          'Duplicate store keys detected. Store state/getter/action keys must all be unique. This check will not occur in production.'
        )
      }
    }

    const getterTree: GetterTree<S, any> = {}
    getterKeys
      .filter(key => !key.includes('.'))
      .forEach(key => {
        getterTree[key] = (s: any, g: any) => {
          const proxy = {} as any
          stateKeys.forEach(sk => (proxy[sk] = computed(() => s[sk])))
          getterKeys.forEach(gk => (proxy[gk] = computed(() => g[gk])))
          const getterMethod = (getters as any)[key] as Function
          return getterMethod.call(reactive(proxy))
        }
      })

    const mutations: MutationTree<S> = {
      SET_STATE: (state, { key, value }: { key: string; value: any }) => {
        if (!key) {
          Object.entries(value).forEach(([key, val]) => {
            ;(state as any)[key] = val
          })
        } else {
          set(state, key, value)
        }
      },
    }

    const actionTree: ActionTree<S, any> = {}
    actionKeys.forEach(ak => {
      actionTree[ak] = (_, payload) => {
        const a = (actions as any)[ak] as Function

        return a.apply(pinexStore, payload)
      }
    })

    const vuexStore = {
      namespaced: true,
      state,
      getters: getterTree,
      mutations,
      actions: actionTree,
    }

    let pinexStore: any = {}

    stateKeys.forEach(key => {
      pinexStore[key] = computed({
        get: () => {
          const path = [...id.split('/'), key].join('.')
          const value = get(store.state, path)
          if (typeof value !== 'object') {
            return value
          }
          return createProxy([value], {
            setter: (propKey, value) => {
              store.commit(`${id}/SET_STATE`, {
                key: [key, propKey].filter(Boolean).join('.') || undefined,
                value,
              })
            },
          })
        },
        set: value => {
          store.commit(`${id}/SET_STATE`, { key, value })
        },
      })
    })

    getterKeys.forEach(
      key => (pinexStore[key] = computed(() => store.getters[id + '/' + key]))
    )

    actionKeys.forEach(key => {
      Object.defineProperty(pinexStore, key, {
        enumerable: true,
        value: (...args: any[]) => store.dispatch(id + '/' + key, args),
      })
    })
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
