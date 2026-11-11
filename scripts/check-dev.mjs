// Runs the repository's real checks and prints them in the format `bumperail check` parses.
import { spawnSync } from 'node:child_process'
import { readdirSync } from 'node:fs'
import { join } from 'node:path'

function sourcesUnder(dir) {
  let entries
  try { entries = readdirSync(dir, { withFileTypes: true }) } catch { return [] }
  return entries.flatMap(e => e.isDirectory() ? sourcesUnder(join(dir, e.name)) : /\.(mjs|cjs|js)$/.test(e.name) ? [join(dir, e.name)] : [])
}

const run = (args) => {
  const r = spawnSync(process.execPath, args, { encoding: 'utf8' })
  process.stdout.write(r.stdout ?? '')
  process.stderr.write(r.stderr ?? '')
  return { code: r.status ?? 1, out: r.stdout ?? '' }
}

const sources = ['src', 'test', 'scripts'].flatMap(sourcesUnder)
const checks = [
  { id: 'syntax', run() {
    let code = 0
    for (const file of sources) { const r = run(['--check', file]); if (r.code !== 0) code = r.code }
    return { code, reason: sources.length === 0 ? 'no source files found' : null }
  } },
  { id: 'unit', run() {
    const r = run(['--test'])
    const n = name => Number(new RegExp(`^ℹ ${name} (\\d+)$`, 'm').exec(r.out)?.[1] ?? NaN)
    const [tests, pass, skipped, todo] = [n('tests'), n('pass'), n('skipped'), n('todo')]
    let reason = null
    if (![tests, pass, skipped, todo].every(Number.isFinite)) reason = 'no test summary'
    else if (tests === 0) reason = 'zero tests ran'
    else if (pass !== tests) reason = `${pass} of ${tests} tests passed`
    else if (skipped > 0 || todo > 0) reason = `${skipped} skipped, ${todo} todo`
    return { code: r.code, reason }
  } }
]

console.log(JSON.stringify({ base: 'origin/main', groups: checks.map(c => c.id), omittedGroups: [] }, null, 2))

let failed = false
for (const check of checks) {
  const started = Date.now()
  const { code, reason } = check.run()
  const exit = code === 0 && reason ? 1 : code
  console.log(`${check.id}: ${Date.now() - started}ms, exit ${exit}${reason ? `; ${reason}` : ''}`)
  if (exit !== 0) failed = true
}
if (failed) process.exit(1)
console.log('Development checks passed.')
