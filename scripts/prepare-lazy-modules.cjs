// Applies lazy loading for QR Menu, QR Admin and Loyalty during a Vercel build.
// It is intentionally idempotent so cached build workspaces remain safe.
const fs = require('node:fs');
const path = require('node:path');
const zlib = require('node:zlib');
const { spawnSync } = require('node:child_process');

const root = path.resolve(__dirname, '..');
const sourcePath = path.join(root, 'src', 'main.jsx');
const source = fs.readFileSync(sourcePath, 'utf8');

if (source.includes("const QRMenu = React.lazy(() => import('./QRMenu'))")) {
  process.exit(0);
}

const patch = zlib.gunzipSync(Buffer.from('H4sIAAAAAAACA+VXzW7bRhC+G/A7TNwikiBRVGLZcQpRiJvmVLtI5QA5FIWzIpcWW5LLcpdOVIaA6x6Kon+XPkBfoIDR1m2QH/UVqFfok3R2SUqkpMi+9FTD8HK/nZmdb/4WthzbBk07cQQQnYem7hHHb3/Gn8Gwst1wfIs+AzK8a9t7tN0mnR2Tdjtwq9PZ7XY3NE1b0N9oNpuLNu7dA627d6d1axua+YoQ4WPfBDvyTeEwH0KPP6Lm6D4Jrf3IcsSAmtQXddfx0EcDdjoNiDfA8QIWChhQYooWxBBx+sC2qdzg5yH1mPoYUFutR4IICgnYIfOgFkqt2ubMSgwmQoIOGBNVIc1inm66DnqwQv4hboi7rIGi2kyURwEZEj6/va0XUElOomLsUt42Oa/iGJBji/DRkGFIjs0RCcWC0MeDQ+pHM/PZtmokwxb0BodHGb5veY4/06/CVfkDNiauGJdlcwjlmtciPROrci7Db6O80dxomsznM8pGVgFtl3w5rtcbYPTzHNXncWg0CqUFvmuVF4JQMVIE4SoDRWRQGTbVr67D6e07e/DP2c8Q+Y7tUAtYQEOiSt9nAiFTbTjYLMzrTI8CSy4WdSkunJxSIKpb+KZqqp3OTqe1B818RWjWTvtBUFcdI3+eYhezp22XZXe0AyJGPvFomwsMMX/siFG9pn8Rap4KHDx/vrlacYTJqSi9M9dSTDUAx4a6w7MgogcKAwipiEIfenkC9T6WzZKshOaiWZCPIh5QH0vKJq47JObnRtyznFMwXcL5R0jC2PKYFblUC1xi0hFzLRpu9Q8YsRz/pN1u93QU7yf9+dU9vWq6L8kmWaYAsnR/4hL/pAWcigP1IT7FtONEkbt6Iw//7W5XhT9bV4a/ZBKr+2E0dB0zr4/HSIiKAYtwRBkgxgFldh5xuGEYUItw9tqOT60a3Lx5zSS6mW3dxA7Sq0lZc/9ynkrlXsrVehP/bfoqHq1PoXTVzSw0Zv4s3OqyE8fXOHYa9bf6q09lELf6MfZ1bq3WSDJ/sr95GWx3t1t3sAzkuqYLi59Cdx1UANoMWHAQM6EFIdOwtAS+UltZjnLZa4d+ycp1cvP2eCT9khNXXTUnG98wozBE8D7x0XVLVnuP0yyEJRNZOnqjbeUCjk/P4Rxlji3q40RVzuBhLygrjRx5Wfrr9DydTM9hepZepH+lf6SX6SuYfpW+nJ5Nv0MckVfTnwClLhH7evotrr+nE0j/Tid48j3qTNLf0gslgJJYlwGyzr3sJ6XcxctscmTfNCnnYMjmxgmf9fVSoPCA+e5YGxLfl/FOf8Er/0xfpK/RG/R/gm6/lmQkl/cko0v0/gLdPk9fyHPpZ/oGFS5h+oPkrZiUmacXIA2kL5HKj9NvEHqTTopWW0+lyIsiMXusMyYfFFsQRiwS7NOkaJHdHTUpt3d3W3ev0SIL4+fqVklKvXKV1zjUBRYvz5weePwoO30Qhix8n+HYJeEY5wbKfUjHRvykUNDejXNDyROcSEc5jNZVHRpx/pHk/MWIYkZjtSTyLXmUAcVXAvKVMWL5NyneGnV8oBA151a7VyFcxKT5/4pAadioAJT3K56H7ED+V1KUT6mW8KX8Fz9uMJUUDQAA', 'base64'));
const result = spawnSync('git', ['apply', '--whitespace=nowarn', '--recount', '-'], {
  cwd: root,
  input: patch,
  encoding: 'utf8',
});

if (result.status !== 0) {
  process.stderr.write(result.stderr || result.stdout || 'Could not apply lazy module optimization.\n');
  process.exit(result.status || 1);
}
