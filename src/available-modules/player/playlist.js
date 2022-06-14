module.exports = class Playlist {
  getUri () {
  }

  async getName () {
  }

  async getDisplayName () {
    return `${(await this.getName()) || '(unknown playlist)'} (${(await this.getName()) || '(?)'})`
  }

  async getTracks () {
  }

  async getSize () {
  }
}
