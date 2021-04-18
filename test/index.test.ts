import { getLocalVue } from './helper'
import PinexPlugin, { defineStore } from '../src'
import { defineComponent } from '@vue/composition-api'
import { shallowMount } from '@vue/test-utils'
import { Store } from 'vuex'

describe('index', () => {
  let localVue: ReturnType<typeof getLocalVue>
  let vuexStore: Store<any>

  beforeEach(() => {
    localVue = getLocalVue()
    vuexStore = new Store({ strict: true })
    localVue.use(PinexPlugin, { store: vuexStore })
  })

  describe('defineStore', () => {
    describe('state', () => {
      it('works', () => {
        const useStore = defineStore({
          id: 'abc',
          state: () => ({
            value: 123,
          }),
        })

        const Component = defineComponent({
          template: `
            <input :value="store.value">
          `,
          setup: () => {
            const store = useStore()

            return { store }
          },
        })

        const wrapper = shallowMount(Component, {
          localVue,
          store: vuexStore,
        })
        const input = wrapper.element as HTMLInputElement
        expect('123').toEqual(input.value)
      })

      it('is reactive', async () => {
        const useStore = defineStore({
          id: 'abc',
          state: () => ({
            value: 123,
          }),
        })

        const Component = defineComponent({
          template: `
            <input :value="store.value">
          `,
          setup: () => {
            const store = useStore()

            return { store }
          },
        })

        const wrapper = shallowMount(Component, {
          localVue,
          store: vuexStore,
        })
        const input = wrapper.element as HTMLInputElement
        expect('123').toEqual(input.value)

        vuexStore.commit('abc/SET_STATE', { value: { value: 321 } })

        await localVue.nextTick()

        expect(input.value).toEqual('321')
      })

      it('is reactive to object undefined set', () => {
        const useStore = defineStore({
          id: 'abc',
          state: (): {
            value: undefined | { foo: number }
          } => ({
            value: undefined,
          }),
        })

        const store = useStore()

        vuexStore.commit('abc/SET_STATE', { key: 'value', value: { foo: 123 } })

        expect(store.value!.foo).toBe(123)
      })

      it('is reactive to object undefined set and mutate', () => {
        const useStore = defineStore({
          id: 'abc',
          state: (): {
            value: undefined | { foo: number }
          } => ({
            value: undefined,
          }),
        })

        const store = useStore()

        vuexStore.commit('abc/SET_STATE', { key: 'value', value: { foo: 123 } })

        expect(store.value!.foo).toBe(123)

        store.value!.foo = 4848

        expect(store.value!.foo).toBe(4848)
      })

      it('reacts to array set', () => {
        const useStore = defineStore({
          id: 'abc',
          state: () => ({
            value: [1, 2, 3],
          }),
        })

        const store = useStore()

        expect([...store.value]).toStrictEqual([1, 2, 3])
        vuexStore.commit('abc/SET_STATE', { key: 'value', value: [4, 5, 6] })

        expect([...store.value]).toStrictEqual([4, 5, 6])
      })

      const arrayMethodData: [any[], string, (arr: any[]) => void, any][] = [
        [[3, 2, 1], 'sort', o => o.sort(), [1, 2, 3]],
        [[1, 2, 3], 'reverse', o => o.reverse(), [3, 2, 1]],
        [[1, 2, 3], 'push', o => o.push(4), [1, 2, 3, 4]],
        [[3, 2, 1], 'shift', o => o.shift(), [2, 1]],
        [[3, 2, 1], 'unshift', o => o.unshift(4), [4, 3, 2, 1]],
        [[3, 2, 1], 'fill', o => o.fill(4), [4, 4, 4]],
        [[3, 2, 1], 'pop', o => o.pop(), [3, 2]],
        [[3, 2, 1], 'splice', o => o.splice(1, 1, 7), [3, 7, 1]],
      ]

      arrayMethodData.forEach(([input, method, action, result]) => {
        it('reacts to array method: ' + method, () => {
          const useStore = defineStore({
            id: 'abc',
            state: () => ({
              value: input,
            }),
          })

          const store = useStore()

          action(store.value)

          expect(vuexStore.state.abc.value).toStrictEqual(result)
          expect([...store.value]).toStrictEqual(result)
        })
      })

      it('reacts to array item mutate', () => {
        const useStore = defineStore({
          id: 'abc',
          state: () => ({
            value: [{ n: 1 }, { n: 2 }, { n: 3 }],
          }),
        })

        const store = useStore()

        vuexStore.commit('abc/SET_STATE', { key: 'value.0.n', value: 13 })

        expect([...store.value]).toStrictEqual([{ n: 13 }, { n: 2 }, { n: 3 }])
      })

      it('reacts to array item mutate on store', () => {
        const useStore = defineStore({
          id: 'abc',
          state: () => ({
            value: [{ n: 1 }, { n: 2 }, { n: 3 }],
          }),
          actions: {
            foo() {
              this.value[0].n = 77
            },
          },
        })

        const store = useStore()

        store.foo()

        expect(vuexStore.state.abc.value).toStrictEqual([
          { n: 77 },
          { n: 2 },
          { n: 3 },
        ])
        expect([...store.value]).toStrictEqual([{ n: 77 }, { n: 2 }, { n: 3 }])
      })
    })

    describe('getters', () => {
      it('works', () => {
        const useStore = defineStore({
          id: 'abc',
          getters: {
            value: () => 123,
          },
        })

        const Component = defineComponent({
          template: `
            <input :value="store.value">
          `,
          setup: () => {
            const store = useStore()

            return { store }
          },
        })

        const wrapper = shallowMount(Component, {
          localVue,
          store: vuexStore,
        })
        const input = wrapper.element as HTMLInputElement
        expect('123').toEqual(input.value)
      })

      it('is reactive', async () => {
        const useStore = defineStore({
          id: 'abc',
          state: () => ({
            value: 123,
          }),
          getters: {
            next() {
              return this.value + 1
            },
          },
        })

        const Component = defineComponent({
          template: `
            <input :value="store.next">
          `,
          setup: () => {
            const store = useStore()

            return { store }
          },
        })

        const wrapper = shallowMount(Component, {
          localVue,
          store: vuexStore,
        })
        const input = wrapper.element as HTMLInputElement
        expect('124').toEqual(input.value)

        vuexStore.commit('abc/SET_STATE', { value: { value: 321 } })

        await localVue.nextTick()
        expect('322').toBe(input.value)
      })

      it('can access other store state', () => {
        const useA = defineStore({
          id: 'a',
          state: () => ({
            value: 123,
          }),
        })

        const useB = defineStore({
          id: 'b',
          getters: {
            aValue() {
              return useA().value
            },
          },
        })

        const store = useB()

        expect(store.aValue).toBe(123)
      })

      it('is reactive to other store state', () => {
        const useA = defineStore({
          id: 'a',
          state: () => ({
            value: 123,
          }),
        })

        const useB = defineStore({
          id: 'b',
          getters: {
            aValue() {
              return useA().value
            },
          },
        })

        const value = 383939

        const store = useB()

        vuexStore.commit('a/SET_STATE', { value: { value } })

        expect(store.aValue).toBe(value)
      })

      it('only reacts to other store state updates', () => {
        const useA = defineStore({
          id: 'a',
          state: () => ({
            value: 123,
          }),
        })

        let callCount = 0

        const useB = defineStore({
          id: 'b',
          getters: {
            aValue() {
              callCount++
              return useA().value
            },
          },
        })

        const value = 383939

        const store = useB()

        expect(callCount).toBe(1)

        let aval = store.aValue
        aval = store.aValue
        aval = store.aValue
        aval = store.aValue

        expect(callCount).toBe(1)
        aval = store.aValue
        expect(callCount).toBe(1)
        vuexStore.commit('a/SET_STATE', { value: { value } })
        aval = store.aValue

        expect(callCount).toBe(2)
        aval = store.aValue
        expect(callCount).toBe(2)
        aval = store.aValue
        expect(callCount).toBe(2)
      })

      it('component reacts to other store state', async () => {
        const useA = defineStore({
          id: 'a',
          state: () => ({
            value: 123,
          }),
        })

        const useB = defineStore({
          id: 'b',
          getters: {
            aValue() {
              return useA().value
            },
          },
        })

        const Component = defineComponent({
          template: `
            <input :value="store.aValue">
          `,
          setup: () => {
            const store = useB()
            return { store }
          },
        })

        const wrapper = shallowMount(Component, { localVue })

        const values = [28282, 181, 1, 12939, 20, 2030303, 2291]

        for (let value of values) {
          vuexStore.commit('a/SET_STATE', { value: { value } })

          await localVue.nextTick()

          expect((wrapper.element as HTMLInputElement).value).toBe('' + value)
        }
      })

      it('is reactive to other store getter', () => {
        const useA = defineStore({
          id: 'a',
          state: () => ({
            value: 123,
          }),
          getters: {
            getterValue() {
              return this.value
            },
          },
        })

        const useB = defineStore({
          id: 'b',
          getters: {
            aValue() {
              return useA().getterValue
            },
          },
        })

        const value = 383939

        const store = useB()

        vuexStore.commit('a/SET_STATE', { value: { value } })

        expect(store.aValue).toBe(value)
      })
    })

    describe('actions', () => {
      it('action receives args', () => {
        let args: [number, string]
        const useStore = defineStore({
          id: 'abc',
          actions: {
            foo(a: number, b: string) {
              args = [a, b]
            },
          },
        })

        const store = useStore()
        store.foo(123, 'xyz')

        expect(args!).toEqual([123, 'xyz'])
      })

      it('can mutate state', async () => {
        const useStore = defineStore({
          id: 'fff',
          state: () => ({
            loading: false,
            value: 'abc',
          }),
          actions: {
            async loadData() {
              this.loading = true
              const text = await new Promise<string>(resolve => {
                setTimeout(() => {
                  resolve('real data')
                }, 500)
              })

              this.value = text
              this.loading = false
            },
          },
        })

        const store = useStore()

        const promise = store.loadData()

        expect(vuexStore.state.fff.loading).toBe(true)

        await promise

        expect(vuexStore.state.fff.loading).toBe(false)
        expect(vuexStore.state.fff.value).toBe('real data')
      })

      it('can mutate nested reactively after late assignment', () => {
        const useStore = defineStore({
          id: 'abc',
          state: (): {
            value: undefined | { foo: number }
          } => ({
            value: undefined,
          }),
        })

        const store = useStore()

        vuexStore.commit('abc/SET_STATE', { key: 'value', value: { foo: 123 } })

        const value = 4343434

        store.value!.foo = value

        expect(vuexStore.state.abc.value.foo).toBe(value)
      })
    })

    describe('subscribe', () => {
      it('it calls with correct patch state', () => {
        const useStore = defineStore({
          id: 'foo',
          state: () => ({
            a: {
              b: {
                value: 123,
              },
            },
          }),
        })

        const store = useStore()

        const subscribeSpy = jest.fn()

        store.$subscribe(subscribeSpy)

        store.a.b.value = 111

        expect(subscribeSpy).toHaveBeenCalledWith(
          {
            a: {
              b: {
                value: 123,
              },
            },
          },
          {
            a: {
              b: {
                value: 111,
              },
            },
          }
        )
      })
    })
  })
})
