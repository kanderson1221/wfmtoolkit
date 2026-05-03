#!/usr/bin/env node

import { existsSync } from 'node:fs'
import { spawn } from 'node:child_process'
import { platform } from 'node:os'

const isWindows = platform() === 'win32'
const npmCommand = isWindows ? 'npm.cmd' : 'npm'
const pythonCommand = isWindows ? 'python' : 'python3'
const venvPython = isWindows ? '.venv\\Scripts\\python.exe' : '.venv/bin/python'
const uvicornCommand = isWindows ? '.venv\\Scripts\\uvicorn.exe' : '.venv/bin/uvicorn'

let shuttingDown = false
const processes = []

function run(command, args, options = {}) {
  const child = spawn(command, args, {
    stdio: 'inherit',
    shell: false,
    ...options
  })

  return new Promise((resolve, reject) => {
    child.on('error', reject)
    child.on('exit', (code, signal) => {
      if (code === 0) {
        resolve()
        return
      }

      reject(new Error(`${command} ${args.join(' ')} exited with ${signal ?? code}`))
    })
  })
}

function shutdown(code = 0) {
  if (shuttingDown) {
    return
  }

  shuttingDown = true

  for (const child of processes) {
    if (!child.killed) {
      child.kill('SIGTERM')
    }
  }

  setTimeout(() => process.exit(code), 200)
}

function start(command, args, label) {
  const child = spawn(command, args, {
    stdio: 'inherit',
    shell: false
  })

  child.on('error', (error) => {
    console.error(`[${label}] failed to start:`, error.message)
    shutdown(1)
  })

  child.on('exit', (code, signal) => {
    if (shuttingDown) {
      return
    }

    console.error(`[${label}] exited with ${signal ?? code}`)
    shutdown(code ?? 1)
  })

  processes.push(child)
}

process.on('SIGINT', () => shutdown(0))
process.on('SIGTERM', () => shutdown(0))

async function ensureDependencies() {
  if (!existsSync('node_modules')) {
    console.log('Installing frontend dependencies...')
    await run(npmCommand, ['install'])
  }

  if (!existsSync('.venv')) {
    console.log('Creating backend virtual environment...')
    await run(pythonCommand, ['-m', 'venv', '.venv'])
  }

  if (!existsSync(uvicornCommand)) {
    console.log('Installing backend dependencies...')
    await run(venvPython, ['-m', 'pip', 'install', '-r', 'backend/requirements.txt'])
  }
}

await ensureDependencies()

console.log('Starting WFM Toolkit...')
console.log('Backend:  http://127.0.0.1:8000')
console.log('Frontend: http://127.0.0.1:5173')

start(uvicornCommand, ['backend.app.main:app', '--reload', '--host', '127.0.0.1', '--port', '8000'], 'backend')
start(npmCommand, ['run', 'dev', '--', '--host', '127.0.0.1'], 'frontend')
