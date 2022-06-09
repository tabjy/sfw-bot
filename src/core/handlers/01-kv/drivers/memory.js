const stores = new Map()

module.exports = function open (namespace) {
  if (stores.has(namespace)) {
    return stores.get(namespace)
  }

  const store = new Map()
  stores.set(namespace, store)
  return store
}
