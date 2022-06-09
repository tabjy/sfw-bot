const Listener = require('../listener')

module.exports = class ClientReadyListener extends Listener {
  constructor () {
    super('client:ready', { type: 'once' })
  }

  async exec (client, event) {
    client.logger.info(`logged in as ${client.user.username}(${client.user})`)
  }
}
