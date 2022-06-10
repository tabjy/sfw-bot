module.exports = class MediaProvider {
  async init () {
  }

  async fromUri (uri, { limit = 50 } = {}) {
    // throw new Error('stub!')
  }

  async search (keyword, { type = 'any', limit = 10 }) {
    // throw new Error('stub!')
  }

  async random ({ limit = 50 } = {}) {
    // throw new Error('stub!')
  }
}
