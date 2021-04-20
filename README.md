# Pinex

A typesafe interface for creating vuex modules, inspired by [pinia](https://github.com/posva/pinia)/[Vuex 5 RFC](https://github.com/kiaking/rfcs/blob/vuex-5/active-rfcs/0000-vuex-5.md), with some extras.

## Use

### Pinia / Vuex 5 RFC (as of this writing) style store:

```typescript
export const useStore = defineStore({
  id: 'my-store-id',
  state: () => ({
    count: 0,
  }),
  getters: {
    next() {
      return this.count + 1
    },
  },
  actions: {
    increment() {
      this.count++
    },
  },
})
```

### Extra options (not compatible with Pinia or Vuex 5 RFC):

```typescript
export const useStore = defineStore({
  id: 'my-custom-store',
  // private state maps to vuex state, but is not present in the resulting store type definition
  // only exposed through internal store operations
  privateState: () => ({
    countValue: 0,
  }),
  // computed properties. They can be like getters or can be configured with setter
  computed: {
    // get-only computed works the same as getters
    next() {
      return this.count + 1
    },
    // define as getter/setter
    get count(): number {
      // <-- type annotation required
      return this.countValue
    },
    // setter has state/getters/actions/etc
    set count(value) {
      this.countValue = value
    },
  },
  // extend a store. All properties from the other store are copied into the store, and available appropriate in the store instance and getters/actions etc. This is NOT a reference to the other store, all properties are present in the current store that is doing the extending
  extends: useSomeOtherStore.$definition,
})
```
