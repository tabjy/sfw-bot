const { Command, defaultHandler } = require('../command')

module.exports = class VersionCommand extends Command {
  constructor () {
    super({
      description: 'display sfw-bot version'
    })
  }

  @defaultHandler()
  async exec (interaction) {
    const { name, version } = interaction.client.meta.package
    await interaction.reply(`${name} v${version}`)
  }
}
