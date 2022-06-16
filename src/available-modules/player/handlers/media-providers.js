const path = require('path')

const { loadCode } = require('../../../core/utils/io')
const { tree } = require('../../../core/utils/io')

const MediaProvider = require('../media-provider')

module.exports = function env (client, { player } = {}) {
  const providers = new Map()

  client.mediaProviders = {
    get providers () {
      return Array.from(providers.values())
    },

    async load (code) {
      if (typeof code === 'string') {
        code = loadCode(code)
      }

      if (providers.has(code)) {
        // already loaded
        return providers.get(code)
      }

      if (!(code.prototype instanceof MediaProvider)) {
        throw new Error('function is not a sub class of MediaProvider!')
      }

      const provider = Reflect.construct(code, [player])
      provider.client = client
      await provider.init()
      providers.set(code, provider)

      client.logger.trace(`loaded media provider ${code.name || '(name unknown)'}`)

      return provider
    },
    async loadMany (directory) {
      const providers = Object.keys(await tree(directory, { depth: 1 })).sort()
      for (const provider of providers) {
        await this.load(path.join(directory, provider))
      }
    }
  }

  return client.mediaProviders
}
