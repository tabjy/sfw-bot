const {
  joinVoiceChannel,
  entersState,
  VoiceConnectionStatus,
  AudioPlayerStatus
} = require('@discordjs/voice')
const { ApplicationCommandOptionType, ChannelType } = require('discord-api-types/v10')

const { createConcurrentPool } = require('../../../core/utils/concurrency')

const { Command, subcommandHandler } = require('../../../core/command')
const Playlist = require('../playlist')
const Player = require('../player')

const CONTEXTUAL_LIST_KEY = 'CONTEXTUAL_LIST'

const OPTIONS = {
  URI_OR_INDEX: {
    name: 'uri_or_index',
    description: 'uri of index to a media resource',
    type: ApplicationCommandOptionType.String
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
  },
  KEYWORDS: {
    name: 'keywords',
    description: 'keywords to search',
    type: ApplicationCommandOptionType.String,
    required: true
  },
  TYPE: {
    name: 'type',
    description: 'type of the keywords',
    type: ApplicationCommandOptionType.String,
    choices: [
      {
        name: 'Any',
        value: 'any'
      },
      {
        name: 'Playlist',
        value: 'playlist'
      },
      {
        name: 'Artist',
        value: 'artist'
      },
      {
        name: 'Album',
        value: 'album'
      },
      {
        name: 'Track',
        value: 'track'
      }
    ]
  },
  CHANNEL: {
    name: 'channel',
    description: 'a voice channel to move to',
    type: ApplicationCommandOptionType.Channel,
    channel_types: [ChannelType.GuildVoice]
  }
}

async function renderList (list, { emptyMessage = 'empty list!' } = {}, callback) {
  if (!list.length) {
    callback(emptyMessage)
    return
  }

  const more = list.length - 20
  list = list.slice(0, 20)

  const names = Array(list.length).fill('Loading...')
  const render = () => '```\n' +
    names.map((title, i) =>
      `${String(i).padStart(Math.log(names.length + 1) / Math.log(10) + 1)}. ${title}`).join('\n') +
    (more > 0 ? `\n\n(${more} more tracks...)` : '') +
    '\n```'

  const updateHandler = setInterval(() => {
    callback(render())
  }, 1000)

  const submit = createConcurrentPool(4)
  await Promise.allSettled(list.map((track, i) => submit(() => track.getDisplayName().then(name => {
    names[i] = name
  }))))

  clearInterval(updateHandler)

  callback(render())
}

module.exports = class PlayerCommand extends Command {
  constructor () {
    super({
      description: 'Control the music player'
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

    const connection = joinVoiceChannel({
      guildId: guild.id,
      channelId: member.voice.channel.id,
      adapterCreator: guild.voiceAdapterCreator
    })
    connection.on('error', logger.warn)

    try {
      await entersState(connection, VoiceConnectionStatus.Ready, 5000)
    } catch (error) {
      connection.destroy()
      throw new Error('failed to join voice channel within 5 seconds!')
    }

    const player = new Player({ logger, connection })

    subscription = connection.subscribe(player)
    this.subscriptions.set(guild.id, subscription)

    const destroy = () => {
      try {
        subscription.unsubscribe()
      } catch {}

      try {
        connection.destroy()
      } catch {}

      this.subscriptions.delete(guild.id)
    }
    connection.on(VoiceConnectionStatus.Disconnected, async (oldState, newState) => {
      try {
        await Promise.race([
          entersState(connection, VoiceConnectionStatus.Signalling, 5000),
          entersState(connection, VoiceConnectionStatus.Connecting, 5000)
        ])
        // Seems to be reconnecting to a new channel - ignore disconnect
      } catch (error) {
        // Seems to be a real disconnect which SHOULDN'T be recovered from
        destroy()
      }
    })

    let timeoutHandler
    const startTimeout = () => {
      logger.trace('starting disconnect timeout')
      timeoutHandler = setTimeout(() => {
        destroy()
      }, 5 * 60 * 1000)
    }
    player.on('stateChange', (oldState, newState) => {
      if (newState.status === AudioPlayerStatus.Idle) {
        if (timeoutHandler) {
          return
        }

        startTimeout()
        return
      }

      clearInterval(timeoutHandler)
      timeoutHandler = undefined
    })

    if (!player.getQueue().current) {
      startTimeout()
    }

    return subscription
  }

  @subcommandHandler({
    name: 'play',
    description: 'Play the specified resource',
    options: [
      OPTIONS.URI_OR_INDEX,
      OPTIONS.LIMIT
    ]
  })
  async play (interaction, uriOrIndex, limit) {
    await interaction.deferReply()

    const { player } = await this.getOrCreateSubscription(interaction)
    const queue = player.getQueue()

    if (uriOrIndex) {
      queue.purge()

      await this.add(interaction, uriOrIndex, limit)

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
        ...OPTIONS.URI_OR_INDEX,
        required: true
      },
      OPTIONS.LIMIT
    ]
  })
  async add (interaction, uriOrIndex, limit) {
    try {
      await interaction.deferReply()
    } catch {
      // noop
    }

    const { player } = await this.getOrCreateSubscription(interaction)
    const queue = player.getQueue()

    const index = Number.parseInt(uriOrIndex)
    if (!isNaN(index)) {
      const list = await interaction.client.env.get(CONTEXTUAL_LIST_KEY, interaction.channel.id) || []
      if (!list[index]) {
        throw new Error('invalid index')
      }
      uriOrIndex = list[index]
    }

    try {
      uriOrIndex = new URL(uriOrIndex)
    } catch (err) {
      interaction.client.logger.warn(uriOrIndex)
      await interaction.editReply('invalid URI!')
      return
    }

    const result = await Promise.any(
      interaction.client.mediaProviders.providers
        .map(provider => provider.fromUri(uriOrIndex, { limit }).then(result => result || (() => { throw new Error('not found') })()))
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

    try {
      await interaction.deferReply()
    } catch {
      // noop
    }

    const track = player.getQueue().current
    if (!track) {
      await interaction.editReply('Nothing is playing!')
    } else {
      await interaction.editReply(`Now playing *${await track.getTitle() || '(unknown)'}* by *${await track.getArtist() || '(unknown)'}*`)
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

    await interaction.deferReply()
    await renderList(tracks, { emptyMessage: 'The queue is empty!' }, (content) =>
      interaction.editReply(content).catch(err => interaction.client.logger.warn(err)))
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

  @subcommandHandler({
    name: 'stop',
    description: 'stop the player'
  })
  async stop (interaction) {
    const subscription = this.getSubscription(interaction)
    const { connection, player } = subscription || {}
    if (!player) {
      throw new Error('player not found!')
    }

    player.stop()
    subscription.unsubscribe()
    connection.destroy()
    this.subscriptions.delete(interaction.guildId)

    await interaction.reply('Bye!')
  }

  @subcommandHandler({
    name: 'summon',
    description: 'move bot to another channel',
    options: [
      OPTIONS.CHANNEL
    ]
  })
  async summon (interaction, channel = interaction.member.voice.channel.id) {
    const subscription = this.getSubscription(interaction)
    if (!subscription) {
      throw new Error('bot not connected to voice!')
    }

    if (!channel) {
      throw new Error('invalid target channel')
    }

    await joinVoiceChannel({
      channelId: channel,
      guildId: interaction.guild.id,
      adapterCreator: interaction.guild.voiceAdapterCreator
    })

    await interaction.reply('done!')
  }

  @subcommandHandler({
    name: 'random',
    description: 'queue some randomly picked tracks',
    options: [
      OPTIONS.LIMIT
    ]
  })
  async random (interaction, limit) {
    await interaction.deferReply()

    const { player } = await this.getOrCreateSubscription(interaction)
    if (!player) {
      throw new Error('player not found!')
    }

    const tracks = await Promise.any(
      interaction.client.mediaProviders.providers
        .map(provider => provider.random({ limit }).then(result => result || (() => { throw new Error('not found') })()))
    )

    const queue = player.getQueue()
    tracks.forEach(track => {
      queue.add(track)
    })

    if (!queue.current) {
      queue.next()
    }

    await interaction.editReply(`queued ${tracks.length} tracks`)
  }

  @subcommandHandler({
    name: 'search',
    description: 'search for resources',
    options: [
      OPTIONS.KEYWORDS,
      OPTIONS.TYPE,
      OPTIONS.LIMIT
    ]
  })
  async search (interaction, keywords, type, limit) {
    const { player } = await this.getOrCreateSubscription(interaction)
    if (!player) {
      throw new Error('player not found!')
    }

    await interaction.deferReply()
    const tracksOrLists = (await Promise.all(
      interaction.client.mediaProviders.providers
        .map(provider => provider.search(keywords, {
          limit,
          type
        }).then(result => result || []).catch(err => interaction.client.logger.warn(err) || []))
    )).flatMap(arr => arr)

    await interaction.client.env.set('CONTEXTUAL_LIST', tracksOrLists.map(obj => obj.getUri()), interaction.channel.id)

    await renderList(tracksOrLists, { emptyMessage: 'No result found!' }, (content) =>
      interaction.editReply(content).catch(err => interaction.client.logger.warn(err)))

    if (tracksOrLists.length) {
      await interaction.followUp('add to queue with `/player add <index>` or play with `/player play <index>`')
    }
  }
}
