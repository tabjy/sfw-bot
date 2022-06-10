const fs = require('fs/promises')
const path = require('path')

const ffmpeg = require('ffmpeg-static')

const MediaProvider = require('../../00-player/media-provider')
const Track = require('../../00-player/track')
const { exec, snakeToCamelCase } = require('../../../core/utils')
const Playlist = require('../../00-player/playlist')
const { createAudioResource } = require('@discordjs/voice')

const defaultExtensions = ['.aac', '.ape', '.flac', '.m4a', '.mp3', '.ogg', '.opus', '.wav', '.cda']

async function collectFiles (directory, { extensions = defaultExtensions, limit = -1 } = {}) {
  let results = []

  const entries = await fs.readdir(directory, { withFileTypes: true })
  entries
    .filter(entry => entry.isFile() && extensions.includes(path.extname(entry.name)))
    .forEach(entry => results.push(path.join(directory, entry.name)))

  for (const entry of entries.filter(entry => entry.isDirectory())) {
    if (results.length >= limit && limit >= 0) {
      break
    }

    // dfs
    results = [
      ...results,
      ...await collectFiles(path.join(directory, entry.name), { extensions, limit: limit - results.length })
    ]
  }

  return limit >= 0
    ? results.slice(0, limit)
    : results
}

// ;(async () => {
//   console.log(await getMetadata('/mnt/rclone/media/Music/AC_DC/1975 - T.N.T_/01 - It’s a Long Way to the Top (If You Wanna Rock ’n’ Roll).flac'))
// })()

class LocalTrack extends Track {
  constructor (path, basePath = '/') {
    super()

    this.path = path
    this.basePath = basePath
    this.metadata = null
  }

  async getMetadata () {
    if (!this.metadata) {
      const metadata = await exec(ffmpeg, ['-i', this.path, '-f', 'ffmetadata', '-'])
      this.metadata = Object.assign(
        {},
        ...metadata.split('\n').map(line => {
          const [key] = line.split('=', 1)
          const value = line.substring(key.length + 1)
          return { [snakeToCamelCase(key.trim().replace(/\s/g, '_'))]: value }
        })
      )
    }

    return this.metadata
  }

  getUri () {
    return 'local:///' + path.relative(this.basePath, this.path)
  }

  async getTitle () {
    await this.getMetadata()
    return this.metadata.title || path.basename(this.path)
  }

  async getArtist () {
    await this.getMetadata()
    return this.metadata.artists || this.metadata.artist || undefined
  }

  async getAlbum () {
    await this.getMetadata()
    return this.metadata.album || undefined
  }

  async getArtwork () {
    return undefined
  }

  async createAudioResource (options = {}) {
    options.metadata = options.metadata || {}
    options.metadata.track = this
    return createAudioResource(this.path, options)
  }
}

class LocalPlaylist extends Playlist {
  constructor (tracks, path, basePath = '/') {
    super()

    this.tracks = tracks
    this.path = path
    this.basePath = basePath
  }

  async getUri () {
    return 'local:///' + path.relative(this.basePath, this.path)
  }

  async getName () {
    return path.basename(this.path)
  }

  async getTracks () {
    return this.tracks
  }

  async getSize () {
    return this.tracks.length
  }
}

module.exports = class LocalMediaProvider extends MediaProvider {
  constructor ({ localMediaBasePath }) {
    super()

    this.basePath = localMediaBasePath
  }

  async fromUri (uri, { limit = 25 } = {}) {
    if (uri.protocol !== 'local:') {
      return null
    }

    if (limit > 100 || limit <= 0) {
      throw new Error(`invalid limit (${limit})`)
    }

    const url = path.join(this.basePath, decodeURIComponent(uri.pathname))
    const files = await collectFiles(url, { limit })
    const tracks = files.map(file => new LocalTrack(file, this.basePath))

    if (tracks.length === 1) {
      return tracks[0]
    } else {
      return new LocalPlaylist(tracks, url, this.basePath)
    }
  }
}
