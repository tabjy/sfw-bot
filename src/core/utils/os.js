import { spawn } from 'child_process'

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

module.exports = {
  exec
}
