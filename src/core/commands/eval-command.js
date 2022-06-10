const { Script } = require('vm')

const { ApplicationCommandOptionType } = require('discord-api-types/v10')

const { Command, defaultHandler } = require('../command')

class EvalCommand extends Command {
  constructor () {
    super({
      description: 'Evaluate a JS script (safely)'
    })
  }

  @defaultHandler({
    options: [
      {
        name: 'script',
        description: 'a pure functional JavaScript snippet',
        type: ApplicationCommandOptionType.String,
        required: true
      },
      {
        name: 'contextual',
        description: 'use local context',
        type: ApplicationCommandOptionType.Boolean,
        require: false
      }
    ]
  })
  async exec (interaction, script, contextual = false) {
    if (contextual && !interaction.client.isOwner(interaction.user)) {
      interaction.reply('Only bot admins can execute scripts in local context!')
      return
    }

    try {
      const result = new Script(script).runInNewContext(contextual
        ? { global, this: this, interaction, script, contextual, require, module }
        : {}, { timeout: 100, breakOnSigint: true })
      interaction.reply('```\n' + String(result) + '\n```')
    } catch (err) {
      interaction.reply('Failed to execute script!\n' + '```' + err.stack + '```')
    }
  }
}

module.exports = EvalCommand
