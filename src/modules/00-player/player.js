const { AudioPlayer, AudioPlayerStatus, NoSubscriberBehavior } = require('@discordjs/voice')

const Queue = require('./queue')

module.exports = class Player extends AudioPlayer {
  constructor ({ logger }, discordJsOptions = {}) {
    super({
      ...discordJsOptions,
      behaviors: {
        noSubscriber: NoSubscriberBehavior.Pause
      }
    })

    this.logger = logger

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
    })
  }

  getQueue () {
    return this.queue
  }
}
