const { Level } = require('level')

const db = new Level('.level', { valueEncoding: 'json', createIfMissing: true })

module.exports = async function open (namespace) {
  await db.open()

  const sublevel = db.sublevel(namespace)

  return {
    get: (...args) => {
      return sublevel.get(...args).catch(err => {
        if (err.code === 'LEVEL_NOT_FOUND') {
          return undefined
        }

        throw err
      })
    },
    put: (...args) => {
      return sublevel.put(...args)
    },
    delete: (...args) => {
      return sublevel.del(...args)
    }
  }
}
