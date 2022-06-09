const { REST } = require('@discordjs/rest')
const { Routes } = require('discord-api-types/v10')

const path = require('path')

const { loadCode, tree } = require('../../utils')
const Command = require('../../command')
const Listener = require('../../listener')

module.exports = async function commands (client, _) {
  const commands = new Map()

  client.commands = {
    async loadCommand (code) {
      if (typeof code === 'string') {
        code = loadCode(code)
      }

      if (commands.has(code)) {
        // already loaded
        return commands.get(code)
      }

      if (!(code.prototype instanceof Command)) {
        throw new Error('function is not a sub class of Command!')
      }

      const command = Reflect.construct(code, [])
      await command.init()
      commands.set(code, command)

      client.logger.trace(`loaded command ${code.name || '(name unknown)'}`)

      return command
    },
    async loadCommands (directory) {
      const commands = Object.keys(await tree(directory, { depth: 0 })).sort()
      for (const command of commands) {
        await this.loadCommand(path.join(directory, command))
      }
    }
  }

  await client.commands.loadCommands(path.join(__dirname, 'commands'))

  const rest = new REST({ version: '9' }).setToken(client.botOptions.token)

  client.logger.trace(`registering ${commands.size} commands`)
  const res = await rest.put(
    client.botOptions.debug.guildId
      ? Routes.applicationGuildCommands(client.botOptions.clientId, client.botOptions.debug.guildId)
      : Routes.applicationCommands(client.botOptions.clientId)
    ,
    {
      body: Array.from(commands.values()).map(cmd => cmd.data)
    })
  console.log(res)
  client.logger.trace('commands registered')

  await client.listeners.loadListener(class ClientReadForCommandRegistrationListener extends Listener {
    constructor () {
      super('client:ready', { type: 'once' })
    }

    /**
     *
     * @param client
     * @param event
     * @return {Promise<void>}
     */
    async exec (client, event) {
      const rest = new REST({ version: '9' }).setToken(client.botOptions.token)

      client.logger.trace(`registering ${commands.size} commands`)
      const res = await rest.put(Routes.applicationCommands(client.botOptions.clientId), {
        // body: Array.from(commands.values()).map(cmd => cmd.data)
        body: [
          {
            name: 'ping',
            description: 'Replies with Pong!'
          }
        ]
      })
      console.log(res)
      client.logger.trace('commands registered')
    }
  })

  await client.listeners.loadListener(class CommandListener extends Listener {
    constructor () {
      super('client:interactionCreate')
    }

    async exec (client, interaction) {
      if (!interaction.isCommand()) {
        return
      }

      console.log('TODO')
    }
  })

  return client.commands
}
