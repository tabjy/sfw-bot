const ytdl = require('youtube-dl-exec')
const { demuxProbe, createAudioResource } = require('@discordjs/voice')

const MediaProvider = require('../../../available-modules/player/media-provider')
const Track = require('../../../available-modules/player/track')
const Playlist = require('../../../available-modules/player/playlist')

function getMetadata (url) {
  const cp = ytdl.exec(url, {
    dumpSingleJson: true
  })

  return new Promise((resolve, reject) => {
    const buffers = []
    const timeout = setTimeout(() => reject(new Error('ytdl timed out!')), 10 * 1000)

    cp.stdout.on('data', (data) => buffers.push(data))

    cp.on('exit', (code) => {
      clearTimeout(timeout)

      if (code === 0) {
        resolve(JSON.parse(Buffer.concat(buffers).toString()))
      } else {
        reject(new Error(`non-zero exit code (${code}): ` + Buffer.concat(buffers).toString()))
      }
    })
  })
}

class YtdlTrack extends Track {
  constructor (url, metadata = null) {
    super()

    this.url = url

    this.metadata = metadata
  }

  async getMetadata () {
    if (this.metadata) {
      return
    }

    if (this.monitor) {
      await this.monitor
      return
    }

    this.monitor = getMetadata(this.url).then(metadata => {
      this.metadata = metadata
    })

    await this.monitor
  }

  getUri () {
    return this.url
  }

  async getTitle () {
    return this.metadata.title
  }

  async getAlbum () {
    return undefined
  }

  async getArtist () {
    return undefined
  }

  async getArtwork () {
    return this.metadata.thumbnail
  }

  async createAudioResource (options = {}) {
    const flags = {
      output: '-'
    }

    if (['www.youtube.com', 'youtube.com', 'youtube.com'].includes(new URL(this.url).hostname)) {
      flags.format = 'ytsearch:bestaudio[ext=webm][acodec=opus][asr=48000]/bestaudio'
    }

    // FIXME: need to figure out if stdout is a media buffer or error message (by probing the first few bytes?)
    const cp = ytdl.exec(this.url, flags)

    try {
      const probe = await demuxProbe(cp.stdout)

      options.metadata = options.metadata || {}
      options.metadata.track = this
      options.inputType = probe.type

      const resource = createAudioResource(probe.stream, options)
      ;['error', 'close', 'end'].forEach(event => resource.playStream.on(event, () => {
        cp.kill()
      }))

      return resource
    } catch (error) {
      cp.kill()
      throw error
    }
  }
}

class YtdlPlaylist extends Playlist {
  constructor (url, metadata = null) {
    super()

    this.url = url

    this.metadata = metadata
  }

  getUri () {
    return this.url
  }

  async getMetadata () {
    if (this.metadata) {
      return
    }

    if (this.monitor) {
      await this.monitor
      return
    }

    this.monitor = getMetadata(this.url).then(metadata => {
      this.metadata = metadata
    })

    await this.monitor
  }

  async getName () {
    await this.getMetadata()
    return this.metadata.title
  }

  async getTracks () {
    await this.getMetadata()
    return this.metadata.entries.map(metadata => new YtdlTrack(metadata.webpage_url, metadata))
  }

  async getSize () {
    await this.getMetadata()
    return this.metadata.entries.length
  }
}

module.exports = class YtdlProvider extends MediaProvider {
  async fromUri (uri, { limit = 25 } = {}) {
    if ((uri.protocol === 'http:' || uri.protocol === 'https:') && uri.hostname === 'music.163.com') {
      // YoutubeDL support for Netease is broken. Use netease-media-provider instead
      return null
    }

    let metadata
    try {
      metadata = await getMetadata(uri)
    } catch (error) {
      this.client.logger.warn(`unsupported ytdl source: ${uri}`)
      this.client.logger.trace(error)
      return null
    }

    if (metadata._type === 'playlist') {
      return new YtdlPlaylist(metadata.webpage_url, metadata)
    }

    return new YtdlTrack(metadata.webpage_url, metadata)
  }
}
