const path = require('path')

const { loadCode, tree } = require('../../utils')
const Listener = require('../../listener')

module.exports = async function listeners (client, _) {
  const listeners = new Map()

  client.listeners = {
    emitters: new Map(),
    async load (code) {
      if (typeof code === 'string') {
        code = loadCode(code)
      }

      if (listeners.has(code)) {
        // already loaded
        return listeners.get(code)
      }

      if (!(code.prototype instanceof Listener)) {
        throw new Error('function is not a sub class of Listener!')
      }

      const listener = Reflect.construct(code, [])
      await listener.init()
      listener.events.forEach(({ scope, name }) => {
        const emitter = this.emitters.get(scope)
        if (!emitter) {
          throw new Error(`emitter scope ${scope} not found!`)
        }
        Reflect.apply(emitter[listener.type], emitter, [name, (...args) => listener.exec(emitter, ...args)])
      })
      listeners.set(code, listener)

      client.logger.trace(`loaded listener ${code.name || '(name unknown)'}`)

      return listener
    },
    async loadMany (directory) {
      const listeners = Object.keys(await tree(directory, { depth: 1 })).sort()
      for (const listener of listeners) {
        await this.load(path.join(directory, listener))
      }
    }
  }

  client.listeners.emitters.set('client', client)
  await client.listeners.loadMany(path.join(__dirname, '../../listeners'))

  return client.listeners
}
