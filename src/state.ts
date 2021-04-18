import { computed } from '@vue/composition-api'
import { Store } from 'vuex'
import { createPatchState, get } from './getset'
import { getSetterMutation } from './mutations'
import { createProxy } from './proxy'
import { SubscribeCallback } from './types'

export const defineState = (
  id: string,
  pinexStore: any,
  getStore: () => Store<any>,
  key: string,
  subscribeCallbacks: SubscribeCallback<any>[]
) => {
  pinexStore[key] = computed({
    get: () => {
      const store = getStore()
      const path = [id, key].join('.')
      const value = get(store.state, path)
      if (typeof value !== 'object') {
        return value
      }
      return createProxy([value], {
        setter: (propKey, value) => {
          const innerPath = [key, propKey].filter(Boolean).join('.')
          subscribeCallbacks.forEach(cb => {
            const rawState = JSON.parse(JSON.stringify(get(store.state, id)))
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
      const store = getStore()
      subscribeCallbacks.forEach(cb => {
        const rawState = JSON.parse(JSON.stringify(get(store.state, key)))
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
