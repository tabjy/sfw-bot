module.exports = class Listener {
  constructor (event, { type = 'on' } = {}) {
    if (!Array.isArray(event)) {
      event = [event]
    }
    this.events = event.map(event => {
      const [scope, name] = event.split(':')
      return { scope, name }
    })
    this.type = type
  }

  async init () {
  }

  /**
   *
   * @param target
   * @param event
   * @param {Array<any>|undefined} args
   * @return {Promise<void>}
   */
  async exec (target, event, ...args) {
    throw new Error('exec() must be overridden and implemented!')
  }
}
