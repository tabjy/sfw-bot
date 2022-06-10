const { Command, subcommandHandler } = require('../../../command')
const { ApplicationCommandOptionType } = require('discord-api-types/v10')

const SCOPES = Object.freeze({
  USER: 'user',
  CHANNEL: 'channel',
  GUILD: 'guild',
  GLOBAL: 'global'
})

const OPTIONS = {
  NAME: {
    name: 'name',
    description: 'variable name',
    type: ApplicationCommandOptionType.String,
    required: true
  },
  VALUE: {
    name: 'value',
    description: 'variable value (string/JSON)',
    type: ApplicationCommandOptionType.String,
    required: true
  },
  SCOPE: {
    name: 'scope',
    description: 'contextual scope',
    type: ApplicationCommandOptionType.String,
    required: false,
    choices: [
      {
        name: 'User',
        value: SCOPES.USER
      },
      {
        name: 'Channel',
        value: SCOPES.CHANNEL
      },
      {
        name: 'Guild',
        value: SCOPES.GUILD
      },
      {
        name: 'Global',
        value: SCOPES.GLOBAL
      }
    ]
  },
  HIERARCHICAL: {
    name: 'hierarchical',
    description: 'perform the query hierarchical',
    type: ApplicationCommandOptionType.Boolean,
    require: false
  }
}

module.exports = class EnvCommand extends Command {
  constructor () {
    super({
      description: 'Manages environment variables'
    })
  }

  static getScopeId (scope, interaction) {
    switch (scope) {
      case SCOPES.USER:
        return interaction.user.id
      case SCOPES.CHANNEL:
        return interaction.channelId
      case SCOPES.GUILD:
        return interaction.guildId
      case SCOPES.GLOBAL:
        return undefined
      default:
        throw new Error(`unrecognized scope ${scope}`)
    }
  }

  @subcommandHandler({
    name: 'get',
    description: 'Get an environment variable\'s value',
    options: [
      OPTIONS.NAME,
      OPTIONS.SCOPE,
      OPTIONS.HIERARCHICAL
    ]
  })
  async get (interaction, name, scope = 'user', hierarchical = false) {
    const value = hierarchical
      ? await interaction.client.env.hierarchicalFromContext(interaction, scope).get(name)
      : await interaction.client.env.get(name, EnvCommand.getScopeId(scope, interaction))

    if (value === undefined) {
      interaction.reply(`Variable \`${name}\` is not set in scope \`${scope}\`!`)
    } else {
      interaction.reply(`\`${name} = ${JSON.stringify(value)}\``)
    }
  }

  @subcommandHandler({
    name: 'set',
    description: 'Change or add an environment variable\'s value',
    options: [
      OPTIONS.NAME,
      OPTIONS.VALUE,
      OPTIONS.SCOPE
    ]
  })
  async set (interaction, name, value, scope = 'user') {
    if (scope === SCOPES.GLOBAL && !interaction.client.isOwner(interaction.user)) {
      interaction.reply('Only bot admins can set variables in the global scope!')
      return
    }

    try {
      value = JSON.parse(value)
    } catch {
      value = String(value)
    }

    await interaction.client.env.set(name, value, EnvCommand.getScopeId(scope, interaction))

    interaction.reply(`\`${name} = ${JSON.stringify(value)}\``)
  }

  @subcommandHandler({
    name: 'unset',
    description: 'Unset an environment variable\'s value',
    options: [
      OPTIONS.NAME,
      OPTIONS.SCOPE
    ]
  })
  async unset (interaction, name, scope = 'user') {
    if (scope === SCOPES.GLOBAL && !interaction.client.isOwner(interaction.user)) {
      interaction.reply('Only bot admins can unset variables in the global scope!')
      return
    }

    await interaction.client.env.unset(name, EnvCommand.getScopeId(scope, interaction))

    interaction.reply(`Variable \`${name}\` is cleared in scope \`${scope}\`.`)
  }

  @subcommandHandler({
    name: 'list',
    description: 'List all environment variables in a scope',
    options: [
      OPTIONS.SCOPE,
      OPTIONS.HIERARCHICAL
    ]
  })
  async list (interaction, scope = 'user', hierarchical = false) {
    const entries = hierarchical
      ? await interaction.client.env.hierarchicalFromContext(interaction, scope).list()
      : await interaction.client.env.list(EnvCommand.getScopeId(scope, interaction))

    if (!entries.length) {
      interaction.reply(`No variables set in scope \`${scope}\`!`)
      return
    }

    interaction.reply('```\n' + entries.map(([k, v]) => `${k} = ${JSON.stringify(v)}`).join('\n') + '\n```')
  }
}
