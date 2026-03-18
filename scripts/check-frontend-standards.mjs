import { promises as fs } from 'node:fs'
import path from 'node:path'

const rootDir = process.cwd()
const srcDir = path.join(rootDir, 'src')

const allowedPrimeVuePrefixes = [
  `${path.join('src', 'components', 'ui')}${path.sep}`,
  path.join('src', 'plugins', 'primevue.js')
]

const bannedLegacyTokens = [
  'submit-btn',
  'secondary-btn',
  'danger-btn',
  'urgent-btn',
  'mode-btn',
  'monthly-tab-btn',
  'monthly-mode-btn',
  'result-tab-btn',
  'home-auth-'
]

const textExtensions = new Set(['.js', '.mjs', '.vue', '.css'])
const ignoredDirectories = new Set([
  'node_modules',
  'dist',
  'coverage',
  'playwright-report',
  'test-results'
])

async function collectFiles(directory) {
  const entries = await fs.readdir(directory, { withFileTypes: true })
  const files = []

  for (const entry of entries) {
    const fullPath = path.join(directory, entry.name)

    if (entry.isDirectory()) {
      if (!ignoredDirectories.has(entry.name)) {
        files.push(...(await collectFiles(fullPath)))
      }
      continue
    }

    if (textExtensions.has(path.extname(entry.name))) {
      files.push(fullPath)
    }
  }

  return files
}

function relativePath(filePath) {
  return path.relative(rootDir, filePath)
}

function isPrimeVueImportAllowed(filePath) {
  const relPath = relativePath(filePath)
  return allowedPrimeVuePrefixes.some((prefix) => relPath === prefix || relPath.startsWith(prefix))
}

function findMatchingLines(content, token) {
  return content
    .split('\n')
    .map((line, index) => ({ lineNumber: index + 1, text: line }))
    .filter(({ text }) => text.includes(token))
}

async function main() {
  const files = await collectFiles(srcDir)
  const violations = []

  for (const filePath of files) {
    const relPath = relativePath(filePath)
    const content = await fs.readFile(filePath, 'utf8')

    if (!isPrimeVueImportAllowed(filePath) && content.includes('primevue/')) {
      for (const match of findMatchingLines(content, 'primevue/')) {
        violations.push(
          `${relPath}:${match.lineNumber} direct PrimeVue import outside wrapper layer`
        )
      }
    }

    for (const token of bannedLegacyTokens) {
      for (const match of findMatchingLines(content, token)) {
        violations.push(`${relPath}:${match.lineNumber} banned legacy token "${token}"`)
      }
    }
  }

  if (violations.length > 0) {
    console.error('Frontend standards check failed:\n')
    for (const violation of violations) {
      console.error(`- ${violation}`)
    }
    process.exit(1)
  }

  console.log('Frontend standards check passed.')
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
