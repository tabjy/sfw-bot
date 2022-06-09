const fs = require('fs/promises')
const path = require('path')

module.exports = {
  async tree (directory, { depth = -1 }) {
    const entries = await Promise.all((await fs.readdir(directory, { withFileTypes: true })).map(entry =>
      (entry.isDirectory() && depth !== 0)
        ? this.tree(path.join(directory, entry.name), depth - 1).then(res => ({ [entry.name]: res }))
        : Promise.resolve({ [entry.name]: null })
    ))

    return Object.assign({}, ...entries)
  },

  loadCode (code) {
    if (!path.isAbsolute(code)) {
      throw new Error('absolute path required!')
    }

    const m = require(code)

    if (typeof m !== 'function') {
      throw new Error('module does not export a function!')
    }

    return m
  },

  annotate (subject) {
    subject.annotations = new Map()
    return (key, ...annotations) => {
      subject.annotations.set(key, ...annotations)
      return key
    }
  },

  getAnnotations (subject, key) {
    return subject.annotations.get(key)
  },

  camelToSnakeCase (str) {
    return str.charAt(0).toLowerCase() + str.substring(1).replace(/[A-Z]/g, c => `-${c.toLowerCase()}`)
  }
}
