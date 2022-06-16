const os = require('os')

const { createAudioResource } = require('@discordjs/voice')
const uuid = require('uuid')

const {
  Configuration,
  LibraryApi,
  ItemsApi,
  ItemFields,
  BaseItemKind
} = require('../vendor/jellyfin-client-axios/stable/dist')

const MediaProvider = require('../../../available-modules/player/media-provider')
const Track = require('../../../available-modules/player/track')

const Playlist = require('../../../available-modules/player/playlist')
const { openHttpStream } = require('../../../core/utils/io')

function getJellyfinItemUri () {
  return `${this.conf.basePath}/web/index.html#!/details?id=${this.id}`
}

async function getJellyfinItemMetadata () {
  if (this.metadata) {
    return
  }

  if (this.monitor) {
    await this.monitor
    return
  }

  this.monitor = (new ItemsApi(this.conf).getItems({
    ids: [this.id],
    userId: this.userId
  })).then(({ data: { Items: [metadata] } }) => {
    this.metadata = metadata
  })

  await this.monitor
}

class JellyfinTrack extends Track {
  constructor (id, conf, userId, metadata = null) {
    super()

    this.id = id
    this.conf = conf
    this.userId = userId

    this.metadata = metadata
  }

  getUri () {
    return getJellyfinItemUri.bind(this)()
  }

  async getMetadata () {
    return getJellyfinItemMetadata.bind(this)()
  }

  async getTitle () {
    await this.getMetadata()
    return this.metadata.Name
  }

  async getAlbum () {
    await this.getMetadata()
    return this.metadata.Album
  }

  async getArtist () {
    await this.getMetadata()
    return this.metadata.AlbumArtist
  }

  async getArtwork () {
    await this.getMetadata()
    return `${this.conf.basePath}/Items/${this.id}/Images/Primary`
  }

  async createAudioResource (options = {}) {
    const url = 'https://jellyfin.tabjy.com/Audio/' + this.id + '/stream?' +
      new URLSearchParams({
        Static: true,
        mediaSourceId: this.id
        // api_key: this.conf.apiKey,
      }).toString()

    options.metadata = options.metadata || {}
    options.metadata.track = this

    if (process.env.PROXY_HTTP_STREAM_FOR_FFMPEG) {
      // HACK: ffmpeg static builds sometimes segfault for some reason when input is an HTTP stream
      return createAudioResource(await openHttpStream(url), options)
    } else {
      return createAudioResource(url, options)
    }
  }
}

class JellyfinPlaylist extends Playlist {
  constructor (id, conf, userId, metadata = null) {
    super()

    this.id = id
    this.conf = conf
    this.userId = userId

    this.metadata = metadata
    this.tracks = null
  }

  getUri () {
    return getJellyfinItemUri.bind(this)()
  }

  async getMetadata () {
    return getJellyfinItemMetadata.bind(this)()
  }

  async getName () {
    await this.getMetadata()
    return this.metadata.Name
  }

  async getTracks () {
    if (this.tracks) {
      return
    }

    await this.getMetadata()

    if (this.monitor2) {
      await this.monitor2
      return
    }

    let sortBy = []
    switch (this.metadata.Type) {
      case BaseItemKind.MusicAlbum:
        sortBy = ['SortName']
        break
      case BaseItemKind.MusicArtist:
        sortBy = ['CommunityRating', 'CriticRating', 'PlayCount']
        break
    }

    this.monitor2 = await (new ItemsApi(this.conf).getItems({
      parentId: this.id,
      recursive: true,
      includeItemTypes: [BaseItemKind.Audio],
      sortBy,
      fields: Object.values(ItemFields),
      userId: this.userId
    })).then(({ data: { Items } }) => {
      this.tracks = Items.map(item => new JellyfinTrack(item.Id, this.conf, this.userId, item))
    })

    await this.monitor2

    return this.tracks
  }

  async getSize () {
    await this.getTracks()
    return this.tracks.length
  }
}

module.exports = class JellyfinMediaProvider extends MediaProvider {
  constructor ({ jellyfinBasePath, jellyfinApiKey, jellyfinUserId }) {
    super()

    this.jellyfinBasePath = jellyfinBasePath
    this.jellyfinApiKey = jellyfinApiKey
    this.jellyfinUserId = jellyfinUserId

    this.conf = new Configuration({
      basePath: this.jellyfinBasePath,
      apiKey: `MediaBrowser Client="sfw-bot", Device="${os.hostname()}", DeviceId="${uuid.v4()}", Version="1.0.0", Token="${this.jellyfinApiKey}"`
    })
  }

  async init () {
    await new LibraryApi(this.conf).getMediaFolders()

    this.client.logger.info('Jellyfin media provider initialized')
  }

  async fromUri (uri, { limit = 100 } = {}) {
    if (limit > 250 || limit <= 0) {
      throw new Error(`invalid limit (${limit})`)
    }

    if (uri.origin !== this.jellyfinBasePath) {
      return null
    }

    if (uri.pathname !== '/web/index.html' || !uri.hash.startsWith('#!/details?')) {
      throw new Error('unsupported Jellyfin web URL')
    }

    const searchParams = new URLSearchParams(uri.hash.substring('#!/details?'.length))
    const id = searchParams.get('id')
    if (!id) {
      throw new Error('artist id not resolved!')
    }

    const metadata = (await new ItemsApi(this.conf).getItemsByUserId({
      ids: [id],
      userId: this.jellyfinUserId
    })).data.Items[0]

    switch (metadata.Type) {
      case BaseItemKind.Playlist:
      case BaseItemKind.MusicArtist:
      case BaseItemKind.MusicAlbum:
        return new JellyfinPlaylist(id, this.conf, this.jellyfinUserId, metadata)
      case BaseItemKind.Audio:
        return new JellyfinTrack(id, this.conf, this.jellyfinUserId, metadata)
    }

    throw new Error('Supported Jellyfin item type')
  }

  async search (keyword, { type = 'any', limit = 50 }) {
    if (limit > 100 || limit <= 0) {
      throw new Error(`invalid limit (${limit})`)
    }

    const types = {
      any: [BaseItemKind.Playlist, BaseItemKind.MusicArtist, BaseItemKind.MusicAlbum, BaseItemKind.Audio],
      artist: [BaseItemKind.MusicArtist],
      album: [BaseItemKind.MusicAlbum],
      audio: [BaseItemKind.Audio]
    }

    const results = (
      await new ItemsApi(this.conf).getItemsByUserId({
        userId: this.jellyfinUserId,
        searchTerm: keyword,
        includeItemTypes: types,
        recursive: true
      })
    ).data.Items

    return results.map(item => {
      switch (item.Type) {
        case BaseItemKind.Playlist:
        case BaseItemKind.MusicArtist:
        case BaseItemKind.MusicAlbum:
          return new JellyfinPlaylist(item.Id, this.conf, this.jellyfinUserId, item)
        case BaseItemKind.Audio:
          return new JellyfinTrack(item.Id, this.conf, this.jellyfinUserId, item)
      }

      throw new Error('Supported Jellyfin item type')
    })
  }
}
