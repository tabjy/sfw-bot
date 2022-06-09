const pino = require('pino')

module.exports = function logger (client, {
  logger: {
    pretty = false,
    level = 'info'
  } = {}
}) {
  client.logger = pino({
    level
  }, pretty ? require('pino-pretty')({ colorize: true }) : undefined)

  return client.logger
}
