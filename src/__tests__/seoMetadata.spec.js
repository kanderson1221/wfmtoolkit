import { readFileSync } from 'node:fs'
import path from 'node:path'

const readWorkspaceFile = (relativePath) => (
  readFileSync(path.resolve(process.cwd(), relativePath), 'utf8')
)

describe('SEO metadata', () => {
  it('uses absolute canonical and social URLs on the homepage', () => {
    const html = readWorkspaceFile('index.html')

    expect(html).toContain('<link rel="canonical" href="https://www.wfmtoolkit.com/" />')
    expect(html).toContain('<meta property="og:url" content="https://www.wfmtoolkit.com/" />')
    expect(html).toContain('"url": "https://www.wfmtoolkit.com/"')
  })

  it('uses absolute canonical and social URLs on the planning landing page', () => {
    const html = readWorkspaceFile('public/planning-workspace/index.html')

    expect(html).toContain('<link rel="canonical" href="https://www.wfmtoolkit.com/planning-workspace/" />')
    expect(html).toContain('<meta property="og:url" content="https://www.wfmtoolkit.com/planning-workspace/" />')
    expect(html).toContain('"url": "https://www.wfmtoolkit.com/planning-workspace/"')
  })

  it('uses absolute canonical and social URLs on the Erlang Tools landing page', () => {
    const html = readWorkspaceFile('public/erlang-tools/index.html')

    expect(html).toContain('<link rel="canonical" href="https://www.wfmtoolkit.com/erlang-tools/" />')
    expect(html).toContain('<meta property="og:url" content="https://www.wfmtoolkit.com/erlang-tools/" />')
    expect(html).toContain('"url": "https://www.wfmtoolkit.com/erlang-tools/"')
  })
})
