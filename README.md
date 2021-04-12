# Pinex

Use the [pinia](https://github.com/posva/pinia)/[Vuex 5 RFC](https://github.com/kiaking/rfcs/blob/vuex-5/active-rfcs/0000-vuex-5.md) interface with Vue 2 / Vuex 3.

## Use case

If you want the intuitive, type-safe stores of Pinia, but don't want to ditch Vuex, enter Pinex. Pinex provides the same interface of creating and using stores as Pinia (and the Vuex 5 RFC), but the resulting stores are added as modules in Vuex. Every operation on the store results in a corresponding operation on the generated Vuex module. This guarantees the same dev tools compatibility with existing Vuex projects, while allowing for a smooth adoption of the new interface.
