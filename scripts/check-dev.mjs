// Runs the repository's real checks and prints them in the format `bumperail check` parses.
import { spawnSync } from 'node:child_process'
import { readdirSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { run } from 'node:test'

function sourcesUnder(dir) {
  let entries
  try { entries = readdirSync(dir, { withFileTypes: true }) } catch { return [] }
  return entries.flatMap(e => e.isDirectory() ? sourcesUnder(join(dir, e.name)) : /\.(mjs|cjs|js)$/.test(e.name) ? [join(dir, e.name)] : [])
}

const exec = (args) => {
  const r = spawnSync(process.execPath, args, { encoding: 'utf8' })
  process.stdout.write(r.stdout ?? '')
  process.stderr.write(r.stderr ?? '')
  return { code: r.status ?? 1, out: r.stdout ?? '' }
}

const sources = ['src', 'test', 'scripts'].flatMap(sourcesUnder)
const checks = [
  { id: 'syntax', run() {
    let code = 0
    for (const file of sources) { const r = exec(['--check', file]); if (r.code !== 0) code = r.code }
    return { code, reason: sources.length === 0 ? 'no source files found' : null }
  } },
  { id: 'unit', async run() {
    // Count from node:test's structured events; a test file's own stdout cannot forge them.
    // No `files`: Node's own discovery, the same set `node --test` runs. A file Node reports as a test itself had no tests in it.
    const c = { tests: 0, failed: 0, skipped: 0, todo: 0 }
    const empty = []
    try {
      for await (const e of run({ concurrency: false, timeout: 60_000 })) {
        if (e.type !== 'test:pass' && e.type !== 'test:fail') continue
        const d = e.data
        if (d.details?.type === 'suite') { if (e.type === 'test:fail') c.failed++; continue }
        if (d.file && resolve(d.name) === d.file) { // Node's entry for a file itself (named by its path): no tests inside it, or it failed to load
          if (e.type === 'test:fail') c.failed++
          else empty.push(d.file)
          continue
        }
        c.tests++
        if (e.type === 'test:fail') c.failed++
        if (d.skip !== undefined && d.skip !== false) c.skipped++
        if (d.todo !== undefined && d.todo !== false) c.todo++
      }
    } catch (error) { return { code: 1, reason: `test stream error: ${error?.message ?? error}` } }
    let reason = null
    if (c.tests === 0) reason = 'zero tests ran'
    else if (empty.length > 0) reason = `no tests in ${empty.map(f => f.split('/').pop()).join(', ')}`
    else if (c.failed > 0) reason = `${c.failed} failed of ${c.tests}`
    else if (c.skipped > 0 || c.todo > 0) reason = `${c.skipped} skipped, ${c.todo} todo`
    return { code: reason ? 1 : 0, reason }
  } }
]

console.log(JSON.stringify({ base: 'origin/main', groups: checks.map(c => c.id), omittedGroups: [] }, null, 2))

let failed = false
for (const check of checks) {
  const started = Date.now()
  const { code, reason } = await check.run()
  const exit = code === 0 && reason ? 1 : code
  console.log(`${check.id}: ${Date.now() - started}ms, exit ${exit}${reason ? `; ${reason}` : ''}`)
  if (exit !== 0) failed = true
}
if (failed) process.exit(1)
console.log('Development checks passed.')
