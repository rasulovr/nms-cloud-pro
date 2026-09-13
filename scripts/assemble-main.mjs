import { readdir, readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const partsDirectory = path.join(root, 'src', 'main.parts')
const outputFile = path.join(root, 'src', 'main.generated.jsx')

const partNames = (await readdir(partsDirectory))
  .filter((name) => /^part-\d{2}\.jsxpart$/.test(name))
  .sort()

if (partNames.length === 0) {
  throw new Error('No source parts found in src/main.parts')
}

const parts = await Promise.all(
  partNames.map((name) => readFile(path.join(partsDirectory, name))),
)

await writeFile(outputFile, Buffer.concat(parts))
console.log(`Assembled ${partNames.length} source parts into src/main.generated.jsx`)
