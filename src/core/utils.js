const fs = require('fs/promises')
const path = require('path')
const { spawn } = require('child_process')

function createExecutorPool (size = 8) {
  const queue = []
  const promises = Array(size).fill(undefined)

  let interrupt; let interruption = new Promise((resolve) => {
    interrupt = resolve
  })
  let locked = false

  async function loop () {
    if (locked) {
      return
    }

    locked = true

    while (queue.length) {
      for (let i = 0; i < size; i++) {
        if (promises[i] === undefined && queue.length) {
          const { func, resolve, reject } = queue.shift()
          promises[i] = func().then(resolve).catch(reject).then(() => {
            promises[i] = undefined
          })
        }
      }

      await Promise.race([Promise.race(promises.filter(p => p)).catch(() => {}), interruption])
      interruption = new Promise((resolve) => {
        interrupt = resolve
      })
    }

    locked = false
  }

  return function submit (func) {
    return new Promise((resolve, reject) => {
      queue.push({
        func,
        resolve,
        reject
      })

      loop().catch(() => {})
      interrupt()
    })
  }
}

async function tree (directory, { depth = -1, flatten = false, executorPool = createExecutorPool(8) } = {}) {
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

function camelToSnakeCase (str) {
  return str.charAt(0).toLowerCase() + str.substring(1).replace(/[A-Z]/g, c => `-${c.toLowerCase()}`)
}

function kebabToCamelCase (str) {
  return str.replace(/-./g, x => x[1].toUpperCase())
}

function snakeToCamelCase (str) {
  return str.toLowerCase().replace(/_./g, x => x[1].toUpperCase())
}

function annotate (target, key, options = {}) {
  if (!target._annotations) {
    target._annotations = new Map()
  }

  target._annotations.set(key, options)
}

function createSimpleAnnotation (annotationKey) {
  const annotation = function (options = {}) {
    return function decorator (target) {
      if (target.kind === 'method') {
        annotate(target.descriptor.value, annotationKey, options)
      } else {
        throw new Error('unsupported simple annotation type')
      }
    }
  }

  annotation._annotationKey = annotationKey
  return annotation
}

function getAnnotation (target, annotation) {
  if (!target._annotations) {
    return null
  }

  return target._annotations.get(annotation._annotationKey) || null
}

function lookupClassFunctionsWithAnnotation (klass, key) {
  if (!klass.prototype) {
    return []
  }

  const results = []
  for (const name of Object.getOwnPropertyNames(klass.prototype)) {
    if (typeof klass.prototype[name] !== 'function') {
      continue
    }

    if (getAnnotation(klass.prototype[name], key)) {
      results.push(klass.prototype[name])
    }
  }

  return [...results, ...lookupClassFunctionsWithAnnotation(Object.getPrototypeOf(klass), key)]
}

function exec (command, args, options) {
  const buffers = {
    stdout: [],
    stderr: []
  }

  return new Promise((resolve, reject) => {
    const cp = spawn(command, args, options = {})
    cp.stdout.on('data', (data) => buffers.stdout.push(data))
    cp.stderr.on('data', (data) => buffers.stderr.push(data))

    cp.on('exit', (code) => {
      if (code === 0) {
        if (options.returns === 'stderr') {
          resolve(Buffer.concat(buffers.stderr).toString())
        } else {
          resolve(Buffer.concat(buffers.stdout).toString())
        }
      } else {
        reject(new Error(`non-zero exit code (${code}): ` + Buffer.concat(buffers.stderr).toString()))
      }
    })
  })
}

function shuffle (array) {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]]
  }
}

module.exports = {
  createExecutorPool,
  tree,
  loadCode,
  camelToSnakeCase,
  kebabToCamelCase,
  snakeToCamelCase,
  annotate,
  getAnnotation,
  lookupClassFunctionsWithAnnotation,
  createSimpleAnnotation,
  exec,
  shuffle
}
