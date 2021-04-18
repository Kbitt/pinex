export const getSetterMutation = (id?: string) =>
  [id, '__internal__SET_STATE'].filter(Boolean).join('/')
export const getSetterAction = (key: string, id?: string) =>
  [id, '__internal__set' + key[0].toUpperCase() + key.slice(1)]
    .filter(Boolean)
    .join('/')
