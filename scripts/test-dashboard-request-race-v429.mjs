import fs from 'node:fs'
import assert from 'node:assert/strict'

const source = fs.readFileSync(new URL('../src/main.parts/part-03.jsxpart', import.meta.url), 'utf8')
const dashboard = source.match(/function Dashboard\(\{ t \}\)[\s\S]*?\n}\n\nfunction Finance/)?.[0] || ''

assert.ok(dashboard, 'Dashboard component must exist')
assert.match(dashboard, /const loadRequestRef = useRef\(0\)/, 'Dashboard must track the newest load request')
assert.match(dashboard, /const requestId = \+\+loadRequestRef\.current/, 'Every Dashboard load must receive a request id')
assert.ok(
  (dashboard.match(/if \(requestId !== loadRequestRef\.current\) return/g) || []).length >= 2,
  'Stale successful and failed requests must not update Dashboard state'
)

console.log('Dashboard v429 request race checks passed')
