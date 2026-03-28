import { promises as fs } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const rootDir = process.cwd()
const srcDir = path.join(rootDir, 'src')

export const allowedPrimeVuePrefixes = [
  `${path.join('src', 'components', 'ui')}${path.sep}`,
  path.join('src', 'plugins', 'primevue.js')
]

export const bannedLegacyTokens = [
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

export const legacyBlueUtilityPattern =
  /\b(?:bg|text|border|ring|from|to|via|stroke|fill|shadow|outline|decoration)-blue-(?:50|100|200|300|400|500|600|700|800|900|950)\b/g

const browserDialogChecks = [
  {
    pattern: /\bwindow\.(confirm|prompt)\s*\(/g,
    buildMessage: (match) => `browser-native dialog "${match[1]}" is not allowed; use shared dialog patterns`
  },
  {
    pattern: /(?<![\w.])(confirm|prompt)\s*\(/g,
    buildMessage: (match) => `browser-native dialog "${match[1]}" is not allowed; use shared dialog patterns`
  }
]

const primeVuePtChecks = [
  {
    pattern: /\bpt\s*=/g,
    message: 'PrimeVue pt usage outside wrapper layer'
  },
  {
    pattern: /\bpt\s*:\s*\{/g,
    message: 'PrimeVue pt usage outside wrapper layer'
  }
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

function isTestFile(relPath) {
  return (
    relPath.includes(`${path.sep}__tests__${path.sep}`) ||
    /\.(spec|test)\.(js|mjs|vue)$/.test(relPath)
  )
}

function isPrimeVueImportAllowed(relPath) {
  return allowedPrimeVuePrefixes.some((prefix) => relPath === prefix || relPath.startsWith(prefix))
}

function findMatchingLines(content, token) {
  return content
    .split('\n')
    .map((line, index) => ({ lineNumber: index + 1, text: line }))
    .filter(({ text }) => text.includes(token))
}

function findRegexMatches(content, pattern) {
  return content.split('\n').flatMap((line, index) => {
    const regex = new RegExp(pattern.source, pattern.flags)
    return [...line.matchAll(regex)].map((match) => ({
      lineNumber: index + 1,
      match
    }))
  })
}

export function scanFrontendFile(relPath, content) {
  const violations = []

  if (!isPrimeVueImportAllowed(relPath) && content.includes('primevue/')) {
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

  for (const match of findRegexMatches(content, legacyBlueUtilityPattern)) {
    violations.push(`${relPath}:${match.lineNumber} legacy blue utility "${match.match[0]}"`)
  }

  if (!isPrimeVueImportAllowed(relPath)) {
    for (const check of browserDialogChecks) {
      for (const match of findRegexMatches(content, check.pattern)) {
        violations.push(`${relPath}:${match.lineNumber} ${check.buildMessage(match.match)}`)
      }
    }

    for (const check of primeVuePtChecks) {
      for (const match of findRegexMatches(content, check.pattern)) {
        violations.push(`${relPath}:${match.lineNumber} ${check.message}`)
      }
    }
  }

  return violations
}

export async function checkFrontendStandards(directory = srcDir) {
  const files = await collectFiles(directory)
  const violations = []

  for (const filePath of files) {
    const relPath = relativePath(filePath)

    if (isTestFile(relPath)) {
      continue
    }

    const content = await fs.readFile(filePath, 'utf8')
    violations.push(...scanFrontendFile(relPath, content))
  }

  return violations
}

async function main() {
  const violations = await checkFrontendStandards()

  if (violations.length > 0) {
    console.error('Frontend standards check failed:\n')
    for (const violation of violations) {
      console.error(`- ${violation}`)
    }
    process.exit(1)
  }

  console.log('Frontend standards check passed.')
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch((error) => {
    console.error(error)
    process.exit(1)
  })
}
