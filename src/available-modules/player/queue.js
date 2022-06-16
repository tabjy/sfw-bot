const { EventEmitter } = require('events')

const Playlist = require('./playlist')
const { shuffle } = require('../../core/utils/arrays')

module.exports = class Queue extends EventEmitter {
  constructor () {
    super()

    this._current = null
    this.history = []
    this.queue = []
  }

  get current () {
    return this._current
  }

  set current (value) {
    this._current = value
    this.emit('current_updated', value)
  }

  next (skip = 0) {
    if (this.current !== null) {
      this.history.push(this.current)
    }

    if (skip > 0) {
      for (const skipped of this.queue.splice(0, skip)) {
        this.history.push(skipped)
      }
    }

    if (this.queue.length === 0) {
      this.current = null
      return null
    }

    this.current = this.queue.shift()
    return this.current
  }

  previous () {
    if (this.history.length === 0) {
      return null
    }

    if (this.current != null) {
      this.remove(this.current.getUri())
      this.queue.unshift(this.current)
    }

    this.current = this.history.pop()
    return this.current
  }

  clear () {
    this.queue = []
  }

  purge () {
    this.current = null
    this.history = []
    this.queue = []
  }

  async addPlaylist (playlist) {
    if (playlist instanceof Playlist) {
      for (const track of await playlist.getTracks()) {
        this.add(track)
      }
    }
  }

  add (track) {
    if (this.current !== null && this.current.getUri() === track.getUri()) {
      return
    }

    this.remove(track.getUri())
    this.queue.push(track)
  }

  list () {
    return this.queue
  }

  remove (posOrUrl) {
    if (typeof posOrUrl === 'string') {
      posOrUrl = this.queue.findIndex(item => item.getUri() === posOrUrl)
    }

    if (posOrUrl !== -1) {
      return this.queue.splice(posOrUrl, 1)
    }

    return null
  }

  shuffle () {
    shuffle(this.queue)
  }
}
