const { tree } = require('../../utils')
const path = require('path')
module.exports = async function modules (client, _) {
  const modules = new Set()

  client.modules = {
    async load (directory) {
      if (modules.has(directory)) {
        // already loaded
        return
      }

      const handlers = Object.keys(await tree(directory, { depth: 1 }))
      for (const handler of handlers) {
        client[handler].loadMany(path.join(directory, handler))
      }

      modules.add(directory)
    },

    async loadMany (directory) {
      const modules = Object.keys(await tree(directory, { depth: 1 })).sort()
      for (const module of modules) {
        await this.load(path.join(directory, module))
      }
    }
  }

  await client.modules.loadMany(path.join(__dirname, '../../modules'))

  return client.modules
}
