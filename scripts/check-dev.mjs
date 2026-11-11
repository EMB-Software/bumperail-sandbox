// Runs the repository's real checks and prints them in the format `bumperail check` parses.
import { spawnSync } from 'node:child_process'
import { readdirSync } from 'node:fs'

const sources = ['src', 'test', 'scripts'].flatMap(dir => readdirSync(dir).filter(f => f.endsWith('.mjs')).map(f => `${dir}/${f}`))
const checks = [
  { id: 'syntax', args: sources.flatMap(file => ['--check', file]), each: true },
  { id: 'unit', args: ['--test'] }
]

console.log(JSON.stringify({ base: 'origin/main', groups: checks.map(c => c.id), omittedGroups: [] }, null, 2))

let failed = false
for (const check of checks) {
  const started = Date.now()
  let code = 0
  if (check.each) {
    for (const file of sources) {
      const r = spawnSync(process.execPath, ['--check', file], { stdio: 'inherit' })
      if (r.status !== 0) code = r.status ?? 1
    }
  } else {
    const r = spawnSync(process.execPath, check.args, { stdio: 'inherit' })
    code = r.status ?? 1
  }
  console.log(`${check.id}: ${Date.now() - started}ms, exit ${code}`)
  if (code !== 0) failed = true
}
if (failed) process.exit(1)
console.log('Development checks passed.')
