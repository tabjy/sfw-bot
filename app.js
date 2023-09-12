require('@babel/register')
require('dotenv').config()

const path = require('path')

const { Client } = require('./src/core')
const { Intents } = require('discord.js')

const pkg = require('./package.json')

function getenv (name) {
  return process.env[name] || (() => { throw new Error(`environment variable ${name} not set!`) })()
}

class MyClient extends Client {
  constructor () {
    super({
      // Options for the bot framework
      clientId: getenv('DISCORD_CLIENT_ID'),
      token: getenv('DISCORD_BOT_TOKEN'),
      ownerIds: (process.env.OWNER_IDS || '').split(','),
      kv: {
        driver: 'level'
      },
      player: {
        localMediaBasePath: getenv('LOCAL_MEDIA_BASE_PATH'),
        neteaseEmail: getenv('NETEASE_EMAIL'),
        neteasePasswordMd5: getenv('NETEASE_PASSWORD_MD5'),
        jellyfinBasePath: getenv('JELLYFIN_BASE_PATH'),
        jellyfinApiKey: getenv('JELLYFIN_API_KEY'),
        jellyfinUserId: getenv('JELLYFIN_USER_ID')
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

    this.meta = {
      package: pkg
    }
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
})().catch(console.error)

process.on('unhandledRejection', error => {
  // Will print "unhandledRejection err is not defined"
  console.error('unhandledRejection', error)
})
