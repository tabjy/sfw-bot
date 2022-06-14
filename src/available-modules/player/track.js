module.exports = class Track {
  /**
   *
   * @return {String}
   */
  getUri () {
    // throw new Error('stub!')
  }

  /**
   *
   * @return {Promise<String>}
   */
  async getTitle () {
    // throw new Error('stub!')
  }

  async getDisplayName () {
    return `${(await this.getArtist()) || '(unknown)'} - ${(await this.getTitle()) || '(unknown)'}`
  }

  /**
   *
   * @return {Promise<String>}
   */
  async getArtist () {
    // throw new Error('stub!')
  }

  /**
   *
   * @return {Promise<String>}
   */
  async getAlbum () {
    // throw new Error('stub!')
  }

  /**
   *
   * @return {Promise<String>}
   */
  async getArtwork () {
    // throw new Error('stub!')
  }

  /**
   *
   * @param options
   * @return {Promise<import('@discordjs/voice').default>}
   */
  async createAudioResource (options) {
    // throw new Error('stub!')
  }
}
