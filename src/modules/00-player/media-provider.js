module.exports = class MediaProvider {
  async init () {
  }

  async fromUri (uri, { limit = 25 } = {}) {
    // throw new Error('stub!')
  }

  async random ({ limit = 25 } = {}) {
    // throw new Error('stub!')
  }

  async search (keyword, { type = 'any', limit = 25 }) {
    // throw new Error('stub!')
  }
}
