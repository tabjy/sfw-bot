const Command = require('../../../command')
const { annotate } = require('../../../utils')

// const annotate = require('../../../utils').annotate(PingCommand)

class PingCommand extends Command {
  [annotate({})('default')] (interaction) {

  }
}

module.exports = PingCommand
