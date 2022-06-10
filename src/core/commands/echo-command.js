const { Command, defaultHandler } = require('../command')
const { ApplicationCommandOptionType } = require('discord-api-types/v10')

class EchoCommand extends Command {
  constructor () {
    super({
      description: 'Repeat your message'
    })
  }

  @defaultHandler({
    options: [
      {
        name: 'message',
        description: 'message to repeat',
        type: ApplicationCommandOptionType.String,
        required: true
      }
    ]
  })
  async exec (interaction, message) {
    await interaction.reply(`${interaction.user} says: ${message}`)
  }
}

module.exports = EchoCommand
