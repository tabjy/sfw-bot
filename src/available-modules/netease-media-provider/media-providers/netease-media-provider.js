const NeteaseCloudMusicApi = require('NeteaseCloudMusicApi')

const MediaProvider = require('../../player/media-provider')
const Track = require('../../player/track')
const { createAudioResource } = require('@discordjs/voice')
const Playlist = require('../../player/playlist')
const { openHttpStream } = require('../../../core/utils')

class NeteaseTrack extends Track {
  constructor (id, cookie) {
    super()

    this.id = id
    this.cookie = cookie

    this.metadata = null
    this.url = null
  }

  getUri () {
    return 'https://music.163.com/song?id=' + this.id
  }

  async getMetadata () {
    if (this.metadata) {
      return
    }

    if (this.monitor) {
      await this.monitor
      return
    }

    this.monitor = NeteaseCloudMusicApi.song_detail({ ids: String(this.id), cookie: this.cookie })
      .then(({ body: { songs: [metadata] } }) => {
        this.metadata = metadata
      })

    await this.monitor
  }

  async getTitle () {
    await this.getMetadata()
    return this.metadata.name
  }

  async getAlbum () {
    await this.getMetadata()
    return this.metadata.al.name
  }

  async getArtist () {
    await this.getMetadata()
    return this.metadata.ar.map(ar => ar.name).join(' & ')
  }

  async getArtwork () {
    await this.getMetadata()
    return this.metadata.al.picUrl
  }

  async getUrl () {
    if (this.url) {
      return
    }

    if (this.monitor2) {
      await this.monitor2
      return
    }

    this.monitor2 = NeteaseCloudMusicApi.song_url({ id: this.id, cookie: this.cookie, realIP: '43.131.160.1' })
      .then(({ body: { data: [url] } }) => {
        this.url = url
      })

    await this.monitor2
  }

  async createAudioResource (options = {}) {
    await this.getUrl()

    if (!this.url.url) {
      throw new Error('media unavailable')
    }

    options.metadata = options.metadata || {}
    options.metadata.track = this

    if (process.env.PROXY_HTTP_STREAM_FOR_FFMPEG) {
      return createAudioResource(this.url.url, options)
    } else {
      // HACK: ffmpeg static builds sometimes segfault for some reason when input is an HTTP stream
      return createAudioResource(await openHttpStream(this.url.url), options)
    }
  }
}

class NeteasePlaylist extends Playlist {
  constructor (id, cookie) {
    super()

    this.id = id
    this.cookie = cookie
  }

  getUri () {
    return 'https://music.163.com/playlist?id=' + this.id
  }

  async getMetadata () {
    if (this.metadata) {
      return
    }

    if (this.monitor) {
      await this.monitor
      return
    }

    this.monitor = NeteaseCloudMusicApi.playlist_detail({ id: this.id, cookie: this.cookie })
      .then(({ body: { playlist } }) => {
        this.metadata = playlist
      })

    await this.monitor
  }

  async getName () {
    await this.getMetadata()
    return this.metadata.name
  }

  async getTracks () {
    await this.getMetadata()
    return this.metadata.tracks.map(track => new NeteaseTrack(track.id, this.cookie))
  }

  async getSize () {
    await this.getMetadata()
    return this.metadata.tracks.length
  }
}

class NeteaseAlbum extends Playlist {
  constructor (id, cookie) {
    super()

    this.id = id
    this.cookie = cookie
  }

  getUri () {
    return 'https://music.163.com/album?id=' + this.id
  }

  async getMetadata () {
    if (this.metadata) {
      return
    }

    if (this.monitor) {
      await this.monitor
      return
    }

    this.monitor = NeteaseCloudMusicApi.album({ id: this.id, cookie: this.cookie })
      .then(({ body: { songs, album } }) => {
        this.metadata = {
          ...album,
          songs
        }
      })

    await this.monitor
  }

  async getName () {
    await this.getMetadata()
    return this.metadata.name
  }

  async getTracks () {
    await this.getMetadata()
    return this.metadata.songs.map(track => new NeteaseTrack(track.id, this.cookie))
  }

  async getSize () {
    await this.getMetadata()
    return this.metadata.songs.length
  }
}

class NeteaseArtist extends Playlist {
  constructor (id, cookie) {
    super()

    this.id = id
    this.cookie = cookie
  }

  getUri () {
    return 'https://music.163.com/artist?id=' + this.id
  }

  async getMetadata () {
    if (this.metadata) {
      return
    }

    if (this.monitor) {
      await this.monitor
      return
    }

    this.monitor = NeteaseCloudMusicApi.artists({ id: this.id, cookie: this.cookie })
      .then(({ body: { hotSongs, artist } }) => {
        this.metadata = {
          ...artist,
          hotSongs
        }
      })

    await this.monitor
  }

  async getName () {
    await this.getMetadata()
    return this.metadata.name
  }

  async getTracks () {
    await this.getMetadata()
    return this.metadata.hotSongs.map(track => new NeteaseTrack(track.id, this.cookie))
  }

  async getSize () {
    await this.getMetadata()
    return this.metadata.hotSongs.length
  }
}

module.exports = class NeteaseMediaProvider extends MediaProvider {
  constructor ({ neteaseEmail, neteasePasswordMd5 }) {
    super()

    this.email = neteaseEmail
    this.passwordMd5 = neteasePasswordMd5

    this.cookie = null
  }

  async init () {
    this.cookie = await this.client.kv.default.get('netease-cookie') || null
    // this.cookie = 'MUSIC_A_T=1482054929514; Max-Age=2147483647; Expires=Thu, 29 Jun 2090 01:22:38 GMT; Path=/neapi/clientlog;;MUSIC_R_T=1482054979825; Max-Age=2147483647; Expires=Thu, 29 Jun 2090 01:22:38 GMT; Path=/eapi/clientlog;;__csrf=92920543a5a19da76d80b9b6e23018b4; Max-Age=1296010; Expires=Sat, 25 Jun 2022 22:08:41 GMT; Path=/;;MUSIC_A_T=1482054929514; Max-Age=2147483647; Expires=Thu, 29 Jun 2090 01:22:38 GMT; Path=/api/clientlog;;MUSIC_R_T=1482054979825; Max-Age=2147483647; Expires=Thu, 29 Jun 2090 01:22:38 GMT; Path=/wapi/feedback;;MUSIC_A_T=1482054929514; Max-Age=2147483647; Expires=Thu, 29 Jun 2090 01:22:38 GMT; Path=/neapi/feedback;;MUSIC_R_T=1482054979825; Max-Age=2147483647; Expires=Thu, 29 Jun 2090 01:22:38 GMT; Path=/api/clientlog;;MUSIC_A_T=1482054929514; Max-Age=2147483647; Expires=Thu, 29 Jun 2090 01:22:38 GMT; Path=/openapi/clientlog;;NMTID=00Oh4N2p8M66VAomkZ2irBU9jcrDHMAAAGBT6lq1w; Max-Age=315360000; Expires=Mon, 07 Jun 2032 22:08:31 GMT; Path=/;;MUSIC_SNS=; Max-Age=0; Expires=Fri, 10 Jun 2022 22:08:31 GMT; Path=/;MUSIC_R_T=1482054979825; Max-Age=2147483647; Expires=Thu, 29 Jun 2090 01:22:38 GMT; Path=/neapi/clientlog;;MUSIC_R_T=1482054979825; Max-Age=2147483647; Expires=Thu, 29 Jun 2090 01:22:38 GMT; Path=/wapi/clientlog;;MUSIC_A_T=1482054929514; Max-Age=2147483647; Expires=Thu, 29 Jun 2090 01:22:38 GMT; Path=/eapi/feedback;;MUSIC_R_T=1482054979825; Max-Age=2147483647; Expires=Thu, 29 Jun 2090 01:22:38 GMT; Path=/openapi/clientlog;;__remember_me=true; Max-Age=1296000; Expires=Sat, 25 Jun 2022 22:08:31 GMT; Path=/;;MUSIC_R_T=1482054979825; Max-Age=2147483647; Expires=Thu, 29 Jun 2090 01:22:38 GMT; Path=/weapi/clientlog;;MUSIC_A_T=1482054929514; Max-Age=2147483647; Expires=Thu, 29 Jun 2090 01:22:38 GMT; Path=/wapi/clientlog;;MUSIC_A_T=1482054929514; Max-Age=2147483647; Expires=Thu, 29 Jun 2090 01:22:38 GMT; Path=/weapi/clientlog;;MUSIC_R_T=1482054979825; Max-Age=2147483647; Expires=Thu, 29 Jun 2090 01:22:38 GMT; Path=/api/feedback;;MUSIC_U=e7526570c8c1ae9f60b5ffe21a32029420e0814fbcf98e89cfa64db4fe04387387c476919df466032a0be625781b112625d83744f8be570d67fa1114b0649ed70e441b66f72bc8697a561ba977ae766d; Max-Age=1296000; Expires=Sat, 25 Jun 2022 22:08:31 GMT; Path=/;;MUSIC_R_T=1482054979825; Max-Age=2147483647; Expires=Thu, 29 Jun 2090 01:22:38 GMT; Path=/weapi/feedback;;MUSIC_A_T=1482054929514; Max-Age=2147483647; Expires=Thu, 29 Jun 2090 01:22:38 GMT; Path=/wapi/feedback;;MUSIC_A_T=1482054929514; Max-Age=2147483647; Expires=Thu, 29 Jun 2090 01:22:38 GMT; Path=/eapi/clientlog;;MUSIC_A_T=1482054929514; Max-Age=2147483647; Expires=Thu, 29 Jun 2090 01:22:38 GMT; Path=/api/feedback;;MUSIC_R_T=1482054979825; Max-Age=2147483647; Expires=Thu, 29 Jun 2090 01:22:38 GMT; Path=/eapi/feedback;;MUSIC_R_T=1482054979825; Max-Age=2147483647; Expires=Thu, 29 Jun 2090 01:22:38 GMT; Path=/neapi/feedback;;MUSIC_A_T=1482054929514; Max-Age=2147483647; Expires=Thu, 29 Jun 2090 01:22:38 GMT; Path=/weapi/feedback;'

    if (this.cookie) {
      this.client.logger.info('netease cookie available')

      const { body } = await NeteaseCloudMusicApi.user_account({ cookie: this.cookie })
      if (!body.profile) {
        this.client.logger.warn('netease cookie expired!')
        this.cookie = null
      } else {
        this.client.logger.info(`netease logged in as ${body.profile.nickname}`)
      }
    }

    if (!this.cookie) {
      this.client.logger.warn('netease logging in...')

      const { body } = await NeteaseCloudMusicApi.login({ email: this.email, md5_password: this.passwordMd5 })
      this.cookie = body.cookie

      await this.client.kv.default.put('netease-cookie', this.cookie)
    }
  }

  async fromUri (uri, { limit = 25 } = {}) {
    if ((uri.protocol !== 'http:' && uri.protocol !== 'https:') || uri.hostname !== 'music.163.com') {
      return null
    }

    if (uri.pathname === '/' && uri.hash) {
      uri = new URL(uri.href.replace('/#', ''))
    }

    if (uri.pathname === '/song' || uri.pathname === '/m/song') {
      const id = uri.searchParams.get('id')
      if (!id) {
        throw new Error('song id not resolved!')
      }

      return new NeteaseTrack(id, this.cookie)
    }

    if (uri.pathname === '/playlist' || uri.pathname === '/m/playlist') {
      const id = uri.searchParams.get('id')
      if (!id) {
        throw new Error('playlist id not resolved!')
      }

      return new NeteasePlaylist(id, this.cookie)
    }

    if (uri.pathname === '/album' || uri.pathname === '/m/album') {
      const id = uri.searchParams.get('id')
      if (!id) {
        throw new Error('album id not resolved!')
      }

      return new NeteaseAlbum(id, this.cookie)
    }

    if (uri.pathname === '/artist' || uri.pathname === '/m/artist') {
      const id = uri.searchParams.get('id')
      if (!id) {
        throw new Error('artist id not resolved!')
      }

      return new NeteaseArtist(id, this.cookie)
    }
  }

  async search (keyword, { type = 'any', limit = 25 }) {
    if (limit > 100 || limit <= 0) {
      throw new Error(`invalid limit (${limit})`)
    }

    const typeInt = {
      any: 1018,
      playlist: 1000,
      artist: 100,
      album: 10,
      track: 1
    }[type]

    const { body } = await NeteaseCloudMusicApi.search({ keywords: keyword, type: typeInt, limit })

    if (type === 'any') {
      const { result: { song: { songs }, playList: { playLists }, artist: { artists }, album: { albums } } } = body
      return [
        ...songs.map(song => new NeteaseTrack(song.id, this.cookie)),
        ...albums.map(album => new NeteaseAlbum(album.id, this.cookie)),
        ...artists.map(artist => new NeteaseArtist(artist.id, this.cookie)),
        ...playLists.map(playlist => new NeteasePlaylist(playlist.id, this.cookie))
      ]
    }

    if (type === 'playlist') {
      return body.result.playlists.map(playlist => new NeteasePlaylist(playlist.id, this.cookie))
    }

    if (type === 'artist') {
      return body.result.artists.map(artist => new NeteaseArtist(artist.id, this.cookie))
    }

    if (type === 'album') {
      return body.result.albums.map(album => new NeteaseAlbum(album.id, this.cookie))
    }

    if (type === 'track') {
      return body.result.songs.map(song => new NeteaseTrack(song.id, this.cookie))
    }

    return []
  }
}
