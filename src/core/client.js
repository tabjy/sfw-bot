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
    discordJsOptions.intents = discordJsOptions.intents || []

    super(discordJsOptions)

    this.botOptions = botOptions
    this.discordJsOptions = discordJsOptions

    this.ownerIds = Array.isArray(botOptions.ownerId) ? botOptions.ownerId : [botOptions.ownerId]

    // this.logger = logger({ prettyPrint, logLevel })

    // load handlers
    this.handlers = new Map()
  }

  async init () {
    await this.loadHandlers(path.join(__dirname, 'handlers'))

    const intents = new Intents(this.discordJsOptions.intents)
    intents.add(...REQUIRED_INTENTS) // TODO: add module intents here
    this.discordJsOptions.intents = intents.bitfield
  }

  /**
   * load a client handler from an absolute js file path or an in-memory function
   * @param code - an absolute js file path or an in-memory function
   */
  async loadHandler (code) {
    if (typeof code === 'string') {
      code = loadCode(code)
    }

    if (this.handlers.has(code)) {
      // already loaded
      return this.handlers.get(code)
    }

    const handler = await Reflect.apply(code, undefined, [this, this.botOptions])
    this.handlers.set(code, handler)

    if (this.logger) {
      this.logger.trace(`loaded handler ${code.name || '(name unknown)'}`)
    }

    return handler
  }

  async loadHandlers (directory) {
    const handlers = Object.keys(await tree(directory, { depth: 0 })).sort()
    for (const handler of handlers) {
      await this.loadHandler(path.join(directory, handler))
    }
  }

  isOwner (user) {
    return this.ownerIds.includes(this.users.resolveId(user))
  }

  async login (token = this.botOptions.token) {
    return super.login(token)
  }
}
