function createConcurrentPool (size = 8) {
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

module.exports = {
  createConcurrentPool
}
