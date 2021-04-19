import { iterateAll } from '../src/util'

describe('util', () => {
  describe('iterateAll', () => {
    it('works', () => {
      let count = 0

      const n = 10
      const len = 100

      const arrays = Array.from({ length: n }).map(() =>
        Array.from({ length: len }).map((_, index) => index)
      )

      const iter = iterateAll(arrays)

      for (const _ of iter) {
        count++
      }

      expect(count).toBe(n * len)
    })
  })
})
