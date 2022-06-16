const fs = require('fs/promises')
const path = require('path')

const { tree } = require('../../utils/io')
const { kebabToCamelCase } = require('../../utils/strings')

module.exports = async function modules (client, _) {
  const modules = new Set()

  client.modules = {
    async load (directory) {
      if (modules.has(directory)) {
        // already loaded
        return
      }

      const entries = Object.keys(await tree(directory, { depth: 1 }))
      for (const entry of entries) {
        if (!(await fs.stat(path.join(directory, entry))).isDirectory()) {
          continue
        }

        const handler = kebabToCamelCase(entry)
        if (client[handler] && client[handler].loadMany) {
          client[handler].loadMany(path.join(directory, entry))
        } else {
          client.logger.warn(`handler not installed for ${entry}`)
        }
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
