const validateKey = (key) => {
  if (typeof key !== 'string' || key === '') {
    throw new Error('key must be a non-empty string!')
  }
}

class Kv {
  constructor (store) {
    this.store = store
  }

  /**
   * store a value along with a key
   * @param {string} key - The key to associate with the value. A key cannot be empty.
   * @param {*} value - The value to store (must serialize to JSON). The type is inferred.
   * @param {number|undefined} expiration - milliseconds since epoch, mutually exclusive with expirationTtl
   * @param {number|undefined} expirationTtl - milliseconds seconds from now, mutually exclusive with expiration
   * @param {Object} metadata - any arbitrary object (must serialize to JSON)
   * @return {Promise<void>}
   */
  async put (key, value, { expiration, expirationTtl, metadata = {} } = {}) {
    validateKey(key)

    if (expiration && expirationTtl) {
      throw new Error('expiration and expirationTtl are mutually exclusive!')
    }

    if (expiration < new Date().valueOf() || expirationTtl < 0) {
      throw new Error('expiration already passed!')
    }

    if (typeof metadata !== 'object') {
      throw new Error('metadata must be an object!')
    }

    if (expirationTtl !== undefined) {
      expiration = new Date().valueOf() + expirationTtl
    }

    await this.store.set(key, JSON.stringify({
      value,
      expiration,
      metadata
    }))
  }

  /**
   *
   * @param {string} key - The key to associate with the value. A key cannot be empty.
   * @return {Promise<*>} the value stored
   */
  async get (key) {
    return (await this.getWithMetadata(key)).value
  }

  /**
   * get a stored value along with its metadata
   * @param {string} key - The key to associate with the value. A key cannot be empty.
   * @return {Promise<{metadata: *, value}|{metadata: null, value: null}>} the value stored along with its metadata
   */
  async getWithMetadata (key) {
    validateKey(key)

    const json = await this.store.get(key)
    if (json === undefined) {
      return {
        value: null,
        metadata: null
      }
    }

    const object = JSON.parse(json)
    if (object.expiration < new Date().valueOf()) {
      await this.store.delete(key)
      return {
        value: null,
        metadata: null
      }
    }

    return {
      value: object.value,
      metadata: object.metadata
    }
  }

  /**
   * delete a key-value pair
   * @param {string} key - The key to associate with the value. A key cannot be empty.
   * @return {Promise<void>}
   */
  async delete (key) {
    validateKey(key)

    await this.store.delete(key)
  }

  // list ({ prefix, limit, cursor }) {
  //
  // }
}

module.exports = async function kv (client, {
  kv: {
    driver = 'memory'
  } = {}
} = {}) {
  let open
  switch (driver) {
    case 'memory':
      open = require('./drivers/memory')
      break
    case 'level':
      throw new Error('not yet implemented!')
    default:
      throw new Error(`unrecognized kv driver: ${kv.driver}`)
  }

  client.kv = {
    open: async (namespace) => new Kv(await open(namespace)),
    default: new Kv(await open('default'))
  }

  return client.kv
}
