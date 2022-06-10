const fs = require('fs/promises')
const path = require('path')

const ffmpeg = require('ffmpeg-static')

const MediaProvider = require('../../00-player/media-provider')
const Track = require('../../00-player/track')
const { exec, snakeToCamelCase, tree, shuffle } = require('../../../core/utils')
const Playlist = require('../../00-player/playlist')
const { createAudioResource } = require('@discordjs/voice')

const defaultExtensions = ['.aac', '.ape', '.flac', '.m4a', '.mp3', '.ogg', '.opus', '.wav', '.cda']

// TODO: refactor to use directory cache
async function collectFiles (directory, { extensions = defaultExtensions, limit = -1 } = {}) {
  let results = []

  let entries
  try {
    entries = await fs.readdir(directory, { withFileTypes: true })
  } catch (err) {
    if (err.code === 'ENOTDIR') {
      if ((await fs.stat(directory)).isFile()) {
        return [directory]
      }
    }

    return []
  }

  entries
    .filter(entry => entry.isFile() && extensions.includes(path.extname(entry.name)))
    .forEach(entry => results.push(path.join(directory, entry.name)))

  for (const entry of entries.filter(entry => entry.isDirectory())) {
    if (results.length >= limit && limit >= 0) {
      break
    }

    // parallel dfs
    results = [
      ...results,
      ...await collectFiles(path.join(directory, entry.name), { extensions, limit: limit - results.length })
    ]
  }

  return limit >= 0
    ? results.slice(0, limit)
    : results
}

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
    this.directoryCache = []
  }

  async init () {
    const store = await this.client.kv.open('local_media_provider')
    this.directoryCache = (await store.get('directory_cache')) || []
    this.client.logger.info(`loaded ${this.directoryCache.length} directory cache entries from kv`)

    const handler = () => {
      this.client.logger.info('updating directory cache')
      tree(this.basePath, { flatten: true })
        .then(result => {
          this.directoryCache = Object.keys(result)
          this.client.logger.info(`fetched ${this.directoryCache.length} entries for directory cache`)
          return store.put('directory_cache', this.directoryCache)
        })
        .catch(this.client.logger.warn)
    }
    handler()
    setInterval(handler, 30 * 60 * 1000)
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

    if (tracks.length === 0) {
      return null
    } else if (tracks.length === 1) {
      return tracks[0]
    } else {
      return new LocalPlaylist(tracks, url, this.basePath)
    }
  }

  async random ({ limit = 25 } = {}) {
    if (limit > 100 || limit <= 0) {
      throw new Error(`invalid limit (${limit})`)
    }

    const pool = this.directoryCache
      .filter(entry => defaultExtensions.includes(path.extname(entry)))
      .map(entry => path.join(this.basePath, entry))
    shuffle(pool)
    const files = pool.slice(0, Math.min(pool.length, limit))
    return files.map(file => new LocalTrack(file, this.basePath))
  }

  async search (keyword, { type = 'any', limit = 25 }) {
    // throw new Error('stub!')
  }
}
