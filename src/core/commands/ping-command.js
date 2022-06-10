const { Command, defaultHandler } = require('../command')

class PingCommand extends Command {
  constructor () {
    super({
      description: 'Reply with "Pong!"'
    })
  }

  @defaultHandler()
  async exec (interaction) {
    await interaction.reply('Pong!')
  }
}

module.exports = PingCommand
