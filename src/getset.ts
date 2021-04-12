export const get = (obj: any, path: string) => {
  let target = obj
  const parts = path.split('.')
  let faulted = false
  while (parts.length) {
    if (!target) {
      faulted = true
      break
    }
    target = target[parts.shift()!]
  }
  if (faulted) {
    throw new Error(`Path '${path}' does not exist on object`)
  }
  return target
}

export const set = (obj: any, path: string, value: any) => {
  let target = obj
  const parts = path.split('.')
  while (parts.length > 1) {
    if (!target) {
      break
    }
    target = target[parts.shift()!]
  }

  if (!target) {
    throw new Error(`Path '${path}' does not exist on object`)
  }

  target[parts[0]] = value
  return obj
}
