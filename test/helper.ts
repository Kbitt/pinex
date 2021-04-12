/// <reference types="./shims-vue" />
import CompositionApi from '@vue/composition-api'
import { createLocalVue } from '@vue/test-utils'
import Vuex from 'vuex'

export const getLocalVue = () => {
  const localVue = createLocalVue()

  localVue.use(Vuex)
  localVue.use(CompositionApi)
  return localVue
}

export const wait = (time: number) =>
  new Promise<void>((resolve) => {
    setTimeout(() => resolve(), time)
  })
