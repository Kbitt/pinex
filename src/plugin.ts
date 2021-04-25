import { PluginObject } from 'vue'
import { Store } from 'vuex'
import { setStore } from './store'

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
