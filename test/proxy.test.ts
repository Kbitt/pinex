import { createProxy, proxyToJson } from '../src/proxy'

describe('proxy', () => {
  describe('createProxy', () => {
    describe('get', () => {
      it('works with single object', () => {
        const a = { a: 123 }

        const aProxy = createProxy([a])

        expect(a.a).toEqual(aProxy.a)
      })

      it('works with method', () => {
        const a = {
          x: 2,
          y: 4,
          area() {
            return this.x * this.y
          },
        }

        const proxy = createProxy([a])

        expect(8).toEqual(proxy.area())
      })

      it('works with array', () => {
        const a = { values: [1, 2, 3, 4, 5] }

        const proxy = createProxy([a])

        expect(proxy.values).not.toBe(a.values)

        expect(proxy.values).toEqual(a.values)
      })

      it('method uses proxy', () => {
        const a = {
          getThis() {
            return this
          },
        }

        const proxy = createProxy([a])

        expect(a).toBe(a.getThis())

        expect(proxy).toBe(proxy.getThis())

        expect(proxy).not.toBe(a.getThis())
        expect(a).not.toBe(proxy.getThis())
      })

      it('works with multi object', () => {
        const a = { a: 123 }
        const b = { b: 'b123' }

        const aProxy = createProxy([a, b])

        expect(a.a).toEqual(aProxy.a)
        expect(b.b).toEqual(aProxy.b)
      })

      it('works with nested object', () => {
        const a = { b: { value: 123 } }

        const proxy = createProxy([a])

        // proxied object should not have same reference
        expect(a.b).not.toBe(proxy.b)

        expect(a.b.value).toEqual(proxy.b.value)
      })

      it('works with nested nested object', () => {
        const a = { b: { c: { value: 123 } } }

        const proxy = createProxy([a])

        // proxied object should not have same reference
        expect(a.b).not.toBe(proxy.b)
        expect(a.b.c).not.toBe(proxy.b.c)

        expect(a.b.c.value).toEqual(proxy.b.c.value)
      })

      it('duplicate keys should take last', () => {
        const a = { b: 123 }
        const b = { b: 'abc' }

        const proxy = createProxy([a, b])

        expect(a.b).not.toEqual(proxy.b)

        expect(b.b).toEqual(proxy.b)
      })
    })

    describe('set', () => {
      it('works with single object', () => {
        const a = { a: 123 }

        const aProxy = createProxy([a])

        const value = 989

        aProxy.a = value

        expect(value).toEqual(aProxy.a)
      })

      it('works with multi object', () => {
        const a = { a: 123 }
        const b = { b: 'b123' }

        const avalue = 787
        const bvalue = 'b898'

        const aProxy = createProxy([a, b])

        aProxy.a = avalue
        aProxy.b = bvalue

        expect(avalue).toEqual(aProxy.a)
        expect(bvalue).toEqual(aProxy.b)
      })

      it('works with nested object', () => {
        const a = { b: { value: 123 } }

        const proxy = createProxy([a])

        const value = 4444

        proxy.b = { value }

        expect(value).toBe(a.b.value)
      })

      it('works with deeply nested object', () => {
        const a = { b: { c: { d: { value: 4483 }, value: 3333 } } }

        const proxy = createProxy([a])

        const dValue = 22222
        const dInnerValue = 4848484

        proxy.b.c = { value: dValue, d: { value: dInnerValue } }

        expect(dValue).toBe(a.b.c.value)
        expect(dInnerValue).toBe(a.b.c.d.value)
      })

      it('works with nested object properties', () => {
        const a = { b: { value: 123 } }

        const proxy = createProxy([a])

        const value = 9998

        proxy.b.value = value

        expect(value).toEqual(a.b.value)
      })

      it('works with nested nested object properties', () => {
        const a = { b: { c: { value: 123 } } }

        const proxy = createProxy([a])

        const value = 434343

        proxy.b.c.value = value

        expect(value).toEqual(a.b.c.value)
      })

      it('duplicate keys should take last', () => {
        const a = { b: 123 }
        const b = { b: 'abc' }

        const value = 'xyz'

        const proxy = createProxy([a, b])

        proxy.b = value

        expect(a.b).not.toEqual(value)

        expect(b.b).toEqual(value)
      })
    })
  })

  describe('proxyToJson', () => {
    it('works with plain object', () => {
      const object = { foo: { a: { b: { value: 123 } } } }

      const copy = proxyToJson(object)

      expect(object).toEqual(copy)
    })

    it('works with proxy', () => {
      const original = { foo: { a: { b: { value: 123 } } } }

      const proxy = createProxy([original])

      const json = proxyToJson(proxy)

      expect(original).toEqual(json)
    })

    it('does not propogate set', () => {
      const original = { foo: { a: { b: { value: 123 } } } }

      const proxy = createProxy([original])

      const json = proxyToJson(proxy)

      expect(original).toEqual(json)

      proxy.foo.a = { b: { value: 181283 } }

      expect(original).toEqual(proxy)

      expect(original).not.toEqual(json)
    })
  })
})
