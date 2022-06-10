const { Command, subcommandHandler } = require('../../../core/command')
const { ApplicationCommandOptionType } = require('discord-api-types/v10')

const Playlist = require('../playlist')
const Player = require('../player')
const { joinVoiceChannel, entersState, VoiceConnectionStatus } = require('@discordjs/voice')

const OPTIONS = {
  URI: {
    name: 'uri',
    description: 'uri to a media resource',
    type: ApplicationCommandOptionType.String,
    required: false
  },
  LIMIT: {
    name: 'limit',
    description: 'max number of tracks',
    type: ApplicationCommandOptionType.Integer,
    min_value: 0,
    max_value: 100
  },
  SKIP: {
    name: 'skip',
    description: 'number of entries to skip',
    type: ApplicationCommandOptionType.Integer,
    min_value: 0
  }
}

module.exports = class PlayerCommand extends Command {
  constructor () {
    super({
      description: 'Control the music player.js'
    })

    // guild -> subscription
    this.subscriptions = new Map()
  }

  getSubscription ({ guild }) {
    if (!guild) {
      throw new Error('not in a guild!')
    }

    const subscription = this.subscriptions.get(guild.id)
    if (subscription) {
      return subscription
    }
  }

  async getOrCreateSubscription ({ guild, member, client: { logger } }) {
    let subscription = this.getSubscription({ guild })
    if (subscription) {
      return subscription
    }

    if (!member.voice.channel) {
      throw new Error('not connected to voice!')
    }

    const player = new Player({ logger })

    const connection = joinVoiceChannel({
      guildId: guild.id,
      channelId: member.voice.channel.id,
      adapterCreator: guild.voiceAdapterCreator
    })
    connection.on('error', logger.warn)

    try {
      await entersState(connection, VoiceConnectionStatus.Ready, 5000)
    } catch (error) {
      throw new Error('failed to join voice channel within 5 seconds!')
    }

    subscription = connection.subscribe(player)

    this.subscriptions.set(guild.id, subscription)
    return subscription
  }

  @subcommandHandler({
    name: 'play',
    description: 'Play the specified resource',
    options: [
      OPTIONS.URI,
      OPTIONS.LIMIT
    ]
  })
  async play (interaction, uri, limit = 25) {
    await interaction.deferReply()

    const { player } = await this.getOrCreateSubscription(interaction)
    const queue = player.getQueue()

    if (uri) {
      queue.purge()

      await this.add(interaction, uri, limit)

      queue.next()
    } else {
      await interaction.editReply('Playing')
    }
  }

  @subcommandHandler({
    name: 'add',
    description: 'add the specified resource to queue',
    options: [
      {
        ...OPTIONS.URI,
        required: true
      },
      OPTIONS.LIMIT
    ]
  })
  async add (interaction, uri, limit = 25) {
    try {
      await interaction.deferReply()
    } catch {
      // noop
    }

    const { player } = await this.getOrCreateSubscription(interaction)
    const queue = player.getQueue()

    try {
      uri = new URL(uri)
    } catch (err) {
      interaction.client.logger.warn(uri)
      await interaction.editReply('invalid URI!')
      return
    }

    const result = await Promise.any(
      interaction.client.mediaProviders.providers
        .map(provider => provider.fromUri(uri, { limit }).then(result => result || (() => { throw new Error('not found') })()))
    )

    if (result instanceof Playlist) {
      await queue.addPlaylist(result)
      await interaction.editReply(`queued playlist *${await result.getName()}* (${await result.getSize()})`)
    } else {
      await queue.add(result)
      await interaction.editReply(`queued track *${await result.getTitle()}*`)
    }
  }

  @subcommandHandler({
    name: 'next',
    description: 'play the next track in queue',
    options: [
      OPTIONS.SKIP
    ]
  })
  async next (interaction, skip = 0) {
    const { player } = this.getSubscription(interaction) || {}
    if (!player) {
      throw new Error('player not found!')
    }

    player.getQueue().next(skip)

    await this.now(interaction)
  }

  @subcommandHandler({
    name: 'previous',
    description: 'play the previous track from history'
  })
  async previous (interaction) {
    const { player } = this.getSubscription(interaction) || {}
    if (!player) {
      throw new Error('player not found!')
    }

    player.getQueue().previous()

    await this.now(interaction)
  }

  @subcommandHandler({
    name: 'now',
    description: 'display currently playing'
  })
  async now (interaction) {
    const { player } = this.getSubscription(interaction) || {}
    if (!player) {
      throw new Error('player not found!')
    }

    const track = player.getQueue().current
    if (!track) {
      await interaction.reply('Nothing is playing!')
    } else {
      await interaction.reply(`Now playing *${await track.getTitle() || '(unknown)'}* by *${await track.getArtist() || '(unknown)'}*`)
    }
  }

  @subcommandHandler({
    name: 'queue',
    description: 'display current queue'
  })
  async queue (interaction) {
    const { player } = this.getSubscription(interaction) || {}
    if (!player) {
      throw new Error('player not found!')
    }

    const tracks = player.getQueue().list()

    if (tracks.length === 0) {
      await interaction.reply('The queue is empty!')
      return
    }

    const titles = Array(tracks.length).fill('Loading...')
    const renderList = () => '```\n' +
      titles.map((title, i) =>
        `${String(i).padStart(Math.log(titles.length + 1) / Math.log(10) + 1)}. ${title}`).join('\n') +
      '\n```'

    await interaction.reply(renderList())

    const updateHandler = setInterval(() => {
      interaction.editReply(renderList()).catch(interaction.client.logger.warn)
    }, 1000)

    // TODO: use pooled executor
    for (let i = 0; i < tracks.length; i++) {
      titles[i] = await tracks[i].getTitle()
    }

    clearInterval(updateHandler)

    await interaction.editReply(renderList())

    // await Promise.all(tracks.map((track, i) => track.getTitle()
    //   .catch(err => {
    //     interaction.client.logger.warn(err)
    //     return '(track title unavailable)'
    //   })
    //   .then(title => {
    //     titles[i] = title
    //     return interaction.editReply(renderList())
    //   })))
  }

  @subcommandHandler({
    name: 'clear',
    description: 'clear the queue'
  })
  async clear (interaction) {
    const { player } = this.getSubscription(interaction) || {}
    if (!player) {
      throw new Error('player not found!')
    }

    player.getQueue().clear()

    await interaction.reply('Queue cleared!')
  }

  @subcommandHandler({
    name: 'shuffle',
    description: 'shuffle the queue'
  })
  async shuffle (interaction) {
    const { player } = this.getSubscription(interaction) || {}
    if (!player) {
      throw new Error('player not found!')
    }

    player.getQueue().shuffle()

    await this.queue(interaction)
  }
}
