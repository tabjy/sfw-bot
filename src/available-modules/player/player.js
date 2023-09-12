const { AudioPlayer, AudioPlayerStatus, NoSubscriberBehavior } = require('@discordjs/voice')

const Queue = require('./queue')

module.exports = class Player extends AudioPlayer {
  constructor ({ logger, connection }, discordJsOptions = {}) {
    super({
      ...discordJsOptions,
      behaviors: {
        noSubscriber: NoSubscriberBehavior.Pause
      }
    })

    this.logger = logger
    this.connection = connection

    this.queue = new Queue()

    this.queue.on('current_updated', async (current) => {
      if (current === null) {
        this.stop()
      } else {
        this.play(await current.createAudioResource())
      }
    })

    this.on(AudioPlayerStatus.Idle, () => {
      this.queue.next()
    })

    this.on('stateChange', (oldState, newState) => {
      this.logger.trace(`player state changed from ${oldState.status} to ${newState.status}`)

      // workaround until https://github.com/discordjs/discord.js/issues/8993 is fixed
      // there is a small pause but there is nothing we could do about it
      if (oldState.status === AudioPlayerStatus.Playing &&
        newState.status === AudioPlayerStatus.AutoPaused
      ) {
        this.logger.trace('workaround: re-configuring networking for connection')
        connection.configureNetworking()
      }
    })

    this.on('error', (err) => {
      this.logger.error(err)
      this.stop(true)
      this.queue.next()
    })
  }

  getQueue () {
    return this.queue
  }
}
