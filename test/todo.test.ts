import { Store } from 'vuex'
import { getLocalVue } from './helper'
import PinexPlugin, { defineStore } from '../src'
import { computed, reactive, toRefs } from '@vue/composition-api'

type Todo = {
  done: boolean
  text: string
}
describe('test todo app', () => {
  let localVue: ReturnType<typeof getLocalVue>
  let vuexStore: Store<any>

  const defineTodos = () =>
    defineStore({
      id: 'todos',
      state: () => ({
        todos: [] as Todo[],
      }),
      getters: {
        done() {
          return this.todos.filter(({ done }) => done)
        },
        notDone() {
          return this.todos.filter(({ done }) => !done)
        },
      },
      actions: {
        add(text = '', done = false) {
          this.todos.unshift({ done, text })
        },
        add2() {
          this.add()
          this.add()
        },
        setTodo(index: number, todo: Partial<Todo>) {
          Object.assign(this.todos[index], todo)
        },
        addBulk(...todos: Todo[]) {
          todos.forEach(({ done, text }) => this.add(text, done))
        },
      },
    })

  let useTodos: ReturnType<typeof defineTodos>

  beforeEach(() => {
    localVue = getLocalVue()
    vuexStore = new Store({ strict: true })
    localVue.use(PinexPlugin, { store: vuexStore })
    useTodos = defineTodos()
  })

  it('works', () => {
    const store = useTodos()

    store.add()

    expect(store.todos.length).toBe(1)
  })

  it('action can call other action', () => {
    const todos = useTodos()

    todos.add2()

    expect(todos.todos.length).toBe(2)
  })

  it('action can call other action with args', () => {
    const todos = useTodos()

    const value: Todo[] = [
      { text: 'abc', done: false },
      { text: 'asdfasdfasdf', done: true },
      { text: 'adfasdfasdf', done: false },
      { text: 'fdasdfasdf', done: true },
    ]

    todos.addBulk(...value)

    value.reverse()

    expect(todos.todos).toEqual(value)
  })

  it('can mutate state outside store', () => {
    const todos = useTodos()

    const value = [{ text: 'foo', done: true }]

    todos.todos = value

    expect(vuexStore.state.todos.todos).toEqual(value)
  })

  it('can splice todo outside store', () => {
    const todos = useTodos()

    const value = { text: 'foo', done: true }

    todos.todos.splice(0, 0, value)

    expect(vuexStore.state.todos.todos).toEqual([value])
  })
})
