module.exports = class Playlist {
  getUri () {
  }

  async getName () {
  }

  async getDisplayName () {
    return `${await this.getName()} (${await this.getSize()})`
  }

  async getTracks () {
  }

  async getSize () {
  }
}
