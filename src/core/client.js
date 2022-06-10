const path = require('path')

const { Client, Intents } = require('discord.js')

const { tree, loadCode } = require('./utils')

// TODO: set only necessary intents
const REQUIRED_INTENTS = [Intents.FLAGS.GUILDS, Intents.FLAGS.GUILD_MESSAGES, Intents.FLAGS.DIRECT_MESSAGES]

module.exports = class extends Client {
  /**
   *
   * @param {Object} botOptions - options for the bot client
   * @param {string | Array<string>} botOptions.ownerId - id(s) for owners
   * @param discordJsOptions
   */
  constructor (botOptions = {}, discordJsOptions = {}) {
    botOptions.ownerIds = botOptions.ownerIds || []
    discordJsOptions.intents = discordJsOptions.intents || []

    super(discordJsOptions)

    this.botOptions = botOptions
    this.discordJsOptions = discordJsOptions

    const self = this
    const handlers = new Map()
    // load handlers
    this.handlers = {
      async load (code) {
        if (typeof code === 'string') {
          code = loadCode(code)
        }

        if (handlers.has(code)) {
          // already loaded
          return handlers.get(code)
        }

        const handler = await Reflect.apply(code, undefined, [self, self.botOptions])
        handlers.set(code, handler)

        if (this.logger) {
          this.logger.trace(`loaded handler ${code.name || '(name unknown)'}`)
        }

        return handler
      },
      async loadMany (directory) {
        const handlers = Object.keys(await tree(directory, { depth: 1 })).sort()
        for (const handler of handlers) {
          await this.load(path.join(directory, handler))
        }
      }
    }
  }

  async init () {
    await this.handlers.loadMany(path.join(__dirname, 'handlers'))
  }

  isOwner (user) {
    return this.botOptions.ownerIds.includes(this.users.resolveId(user))
  }

  async login (token = this.botOptions.token) {
    const intents = new Intents(this.discordJsOptions.intents)
    intents.add(...REQUIRED_INTENTS) // TODO: add module intents here
    this.discordJsOptions.intents = intents.bitfield

    return super.login(token)
  }
}
