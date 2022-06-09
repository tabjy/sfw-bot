require('dotenv').config()

const DISCORD_BOT_TOKEN = process.env.DISCORD_BOT_TOKEN || (() => { throw new Error('DISCORD_BOT_TOKEN not set!') })()
const DISCORD_CLIENT_ID = process.env.DISCORD_CLIENT_ID || (() => { throw new Error('DISCORD_CLIENT_ID not set!') })()

const { REST } = require('@discordjs/rest')
const { Routes } = require('discord-api-types/v10')

const commands = [
  {
    name: 'ping',
    description: 'Replies with Pong!'
  }
]

const rest = new REST({ version: '10' }).setToken(DISCORD_BOT_TOKEN);

(async () => {
  try {
    console.log('Started refreshing application (/) commands.')

    await rest.put(Routes.applicationGuildCommands(DISCORD_CLIENT_ID, '383893885388193796'), { body: commands })

    console.log('Successfully reloaded application (/) commands.')
  } catch (error) {
    console.error(error)
  }
})()

const { Client, Intents } = require('discord.js')
const client = new Client({ intents: [Intents.FLAGS.GUILDS] })

client.on('ready', () => {
  console.log(`Logged in as ${client.user.tag}!`)
})

client.on('interactionCreate', async (interaction) => {
  if (!interaction.isCommand()) return

  if (interaction.commandName === 'ping') {
    await interaction.reply('Pong!')
  }
})

client.login(DISCORD_BOT_TOKEN)

process.on('SIGINT', () => {
  console.log('logout')

  client.destroy()
  process.exit()
})
