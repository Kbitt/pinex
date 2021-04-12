import { defineStore } from 'pinex'

export type Todo = {
  done: boolean
  text: string
}

const useTodos = defineStore({
  id: 'todos',
  state: () => ({
    name: '',
    todos: [] as Todo[],
  }),
  actions: {
    add() {
      this.todos.unshift({ done: false, text: '' })
    },
    setTodo(index: number, todo: Partial<Todo>) {
      const updated = Object.assign({}, this.todos[index], todo)
      this.todos.splice(index, 1, updated)
    },
    remove(index: number) {
      this.todos.splice(index, 1)
    },
    removeDone() {
      this.todos
        .map(({ done }, index) => ({ done, index }))
        .filter(({ done }) => done)
        .forEach(({ index }) => this.remove(index))
    },
  },
})

export default useTodos
