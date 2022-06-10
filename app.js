require('@babel/register')
require('dotenv').config()

const path = require('path')

const { Client } = require('./src/core')
const { Intents } = require('discord.js')

const DISCORD_BOT_TOKEN = process.env.DISCORD_BOT_TOKEN || (() => { throw new Error('DISCORD_BOT_TOKEN not set!') })()
const DISCORD_CLIENT_ID = process.env.DISCORD_CLIENT_ID || (() => { throw new Error('DISCORD_CLIENT_ID not set!') })()

class MyClient extends Client {
  constructor () {
    super({
      // Options for the bot framework
      clientId: DISCORD_CLIENT_ID,
      token: DISCORD_BOT_TOKEN,
      ownerIds: (process.env.OWNER_IDS || '').split(','),
      player: {
        localMediaBasePath: process.env.LOCAL_MEDIA_BASE_PATH
      },
      logger: {
        pretty: true,
        level: 'trace'
      },
      debug: {
        guildId: process.env.DEBUG_GUID_ID
      }
    }, {
      // Options for discord.js
      intents: [Intents.FLAGS.GUILD_VOICE_STATES] // TODO: refactor intents to modules
    })
  }

  async init () {
    await super.init()

    await this.modules.loadMany(path.join(__dirname, 'src/modules'))
  }
}

;(async () => {
  const client = new MyClient()
  await client.init()
  await client.login()

  // client.on('ready', client => {
  //   console.log('ready')
  //   const channel = client.channels.fetch('389231852097110028').then(channel => {
  //     console.log(channel)
  //     channel.send('test')
  //   })
  // })
  //
  // client.on('messageCreate', msg => {
  //   console.log(msg)
  // })

  // client.on('interactionCreate', interaction => {
  //   console.log(interaction)
  // })
})()
