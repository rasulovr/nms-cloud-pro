import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { build } from 'esbuild'
const report = await readFile('src/main.parts/part-05.jsxpart', 'utf8')
const sales = await readFile('src/main.parts/part-04.jsxpart', 'utf8')
assert.match(report, /<ReportMonthPeriod showModeSelect=\{false\}/)
assert.doesNotMatch(sales, /showModeSelect=\{false\}/)
const {outputFiles} = await build({stdin:{contents:`import React from 'react';import {renderToStaticMarkup} from 'react-dom/server';import {ReportMonthPeriod} from './src/MonthYearPicker.jsx';export const render = props=>renderToStaticMarkup(<ReportMonthPeriod onChange={()=>{}} {...props}/>);`,resolveDir:process.cwd(),loader:'jsx'},bundle:true,write:false,loader:{'.css':'empty'},format:'esm',platform:'node',banner:{js:"import {createRequire} from 'node:module';const require=createRequire(process.cwd()+'/package.json');"}})
const {render} = await import('data:text/javascript;base64,'+Buffer.from(outputFiles[0].text).toString('base64'))
assert.doesNotMatch(render({value:'all',showModeSelect:false}), /<select/)
assert.match(render({value:'all',showModeSelect:false}), /Выбрать месяц и год/)
assert.match(render({value:'2026-11',showModeSelect:false}), /ноябрь 2026/)
assert.match(render({value:'all'}), /<select/)
assert.match(render({value:'year:2026',showModeSelect:false}), /aria-label="Год"/)
console.log('PASS report dropdown hidden; month picker and year selector retained; sales default unchanged')
