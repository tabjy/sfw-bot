const fs = require('fs/promises')
const path = require('path')
const { get: gets } = require('https')
const { get } = require('http')

const { createConcurrentPool } = require('./concurrency')

function openHttpStream (url) {
  return new Promise((resolve, reject) => {
    (url.startsWith('https://') ? gets : get)(url, (res) => {
      const { statusCode } = res
      if (statusCode >= 400) {
        reject(new Error(`non-2xx status code: ${statusCode}`))
        return
      }

      resolve(res)
    })
  })
}

async function tree (directory, { depth = -1, flatten = false, executorPool = createConcurrentPool(8) } = {}) {
  let entries = await Promise.all((await executorPool(() => fs.readdir(directory, { withFileTypes: true }))).map(entry =>
    (entry.isDirectory() && depth !== 1)
      ? tree(path.join(directory, entry.name), {
        depth: depth - 1,
        flatten,
        executorPool
      }).then(res => ({ [entry.name]: res }))
      : Promise.resolve({ [entry.name]: null })
  ))

  if (flatten) {
    entries = entries.flatMap(obj => Object.entries(obj).flatMap(([k, v]) => {
      if (typeof v === 'object' && v) {
        return [{ [k]: null }, ...Object.entries(v).map(([k2, v]) => ({ [k + path.sep + k2]: v }))]
      } else {
        return [{ [k]: v }]
      }
    }))
  }

  return Object.assign({}, ...entries)
}

function loadCode (code) {
  if (!path.isAbsolute(code)) {
    throw new Error('absolute path required!')
  }

  const m = require(code)

  if (typeof m !== 'function') {
    throw new Error('module does not export a function!')
  }

  return m
}

module.exports = {
  openHttpStream,
  tree,
  loadCode
}
