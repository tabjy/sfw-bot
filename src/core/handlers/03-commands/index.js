const { REST } = require('@discordjs/rest')
const { Routes } = require('discord-api-types/v10')

const path = require('path')

const { loadCode, tree, lookupClassFunctionsWithAnnotation, getAnnotation } = require('../../utils')
const { Command, initHandler, defaultHandler, subcommandHandler } = require('../../command')
const Listener = require('../../listener')

module.exports = async function commands (client, _) {
  const commands = new Map()

  client.commands = {
    async load (code) {
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

      const init = lookupClassFunctionsWithAnnotation(code, initHandler)[0]
      if (init) {
        await init.apply(command, [])
      }

      commands.set(code, command)

      client.logger.trace(`loaded command ${code.name || '(name unknown)'}`)

      return command
    },
    async loadMany (directory) {
      const commands = Object.keys(await tree(directory, { depth: 1 })).sort()
      for (const command of commands) {
        await this.load(path.join(directory, command))
      }
    }
  }

  await client.commands.loadMany(path.join(__dirname, '../../commands'))

  await client.listeners.load(class ClientReadForCommandRegistrationListener extends Listener {
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
      const rest = new REST({ version: '10' }).setToken(client.botOptions.token)

      if (client.botOptions.debug) {
        client.logger.trace('de-registering old global commands')
        const oldAppCommands = await rest.get(Routes.applicationCommands(client.botOptions.clientId))
        await Promise.allSettled(oldAppCommands.map(cmd =>
          rest.delete(Routes.applicationCommand(client.botOptions.clientId, cmd.id))))
        client.logger.trace(`de-registered ${oldAppCommands.length} old global commands`)

        client.logger.trace('de-registering old guild commands')
        const oldGuildCommands =
          await rest.get(Routes.applicationGuildCommands(client.botOptions.clientId, client.botOptions.debug.guildId))
        await Promise.allSettled(oldGuildCommands.map(cmd =>
          rest.delete(Routes.applicationGuildCommand(client.botOptions.clientId, client.botOptions.guildId, cmd.id))))
        client.logger.trace(`de-registered ${oldGuildCommands.length} old guild commands`)
      }

      const entries = Array.from(commands.values())
      client.logger.trace(`registering ${entries.length} commands`)
      const res = await rest.put(
        client.botOptions.debug && client.botOptions.debug.guildId
          ? Routes.applicationGuildCommands(client.botOptions.clientId, client.botOptions.debug.guildId)
          : Routes.applicationCommands(client.botOptions.clientId)
        ,
        {
          body: entries.map(cmd => cmd.data)
        })
      client.commands.ids = new Map()
      entries.forEach((e, i) => {
        client.commands.ids.set(res[i].id, e)
      })

      client.logger.trace(res)
      client.logger.trace(`${res.length} commands registered`)
    }
  })

  await client.listeners.load(class CommandListener extends Listener {
    constructor () {
      super('client:interactionCreate')
    }

    async exec (client, interaction) {
      if (!interaction.isCommand()) {
        return
      }

      client.logger.trace(interaction)

      const instance = client.commands.ids.get(interaction.commandId)
      if (!instance) {
        const err = new Error('command id not found!')
        client.logger.warn(err)
        interaction.reply(err.message)
        return
      }

      const klass = Object.getPrototypeOf(instance).constructor
      let handler
      const subcommand = interaction.options.getSubcommand(false)
      if (!subcommand) {
        handler = lookupClassFunctionsWithAnnotation(klass, defaultHandler)[0]
      } else {
        const handlers = lookupClassFunctionsWithAnnotation(klass, subcommandHandler)
        handler = handlers.find(handler => getAnnotation(handler, subcommandHandler).name === subcommand)
      }

      if (!handler) {
        const err = new Error('command handler not found!')
        client.logger.warn(err)
        interaction.reply(err.message)
        return
      }

      const { options = [] } = getAnnotation(handler, defaultHandler) || getAnnotation(handler, subcommandHandler)
      try {
        await Reflect.apply(handler, instance, [
          interaction,
          ...options
            .map(option => interaction.options.get(option.name, !!option.required) || {})
            .map(option => option.value)
        ])
      } catch (err) {
        client.logger.error(err)
        const msg = 'an unexpected error has occurred! \n ```\n' + err.stack + '\n```'
        try {
          await interaction.reply(msg)
        } catch {
          try {
            await interaction.followUp(msg)
          } catch {
            // noop
          }
        }
      }
    }
  })

  return client.commands
}
