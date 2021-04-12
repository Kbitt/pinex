import { Store } from 'vuex'

let store: Store<any>

export const setStore = (newStore: Store<any>) => (store = newStore)
export const getStore = () => store
