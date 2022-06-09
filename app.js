require('@babel/register')
require('dotenv').config()

const { Client } = require('./src/core')

const DISCORD_BOT_TOKEN = process.env.DISCORD_BOT_TOKEN || (() => { throw new Error('DISCORD_BOT_TOKEN not set!') })()
const DISCORD_CLIENT_ID = process.env.DISCORD_CLIENT_ID || (() => { throw new Error('DISCORD_CLIENT_ID not set!') })()

class MyClient extends Client {
  constructor () {
    super({
      // Options for the bot framework
      clientId: DISCORD_CLIENT_ID,
      token: DISCORD_BOT_TOKEN,
      ownerIds: (process.env.OWNER_IDS || '').split(','),
      logger: {
        pretty: true,
        level: 'trace'
      },
      debug: {
        guildId: process.env.DEBUG_GUID_ID
      }
    }, {
      // Options for discord.js
    })
  }
}

;(async () => {
  const client = new MyClient()
  await client.init()
  await client.login()

  // await client.kv.default.put('test', 123, { expirationTtl: 0 })

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
