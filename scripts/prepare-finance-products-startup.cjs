// Applies the verified Finance and Products startup optimization during a Vercel build.
// It is intentionally idempotent so cached build workspaces remain safe.
const fs = require('node:fs');
const path = require('node:path');
const zlib = require('node:zlib');
const { spawnSync } = require('node:child_process');

const root = path.resolve(__dirname, '..');
const sourcePath = path.join(root, 'src', 'main.jsx');
const source = fs.readFileSync(sourcePath, 'utf8');

const financeApplied = source.includes('async function calcFor(branch, y, m, { includeForecast = true } = {})');
const productsApplied = source.includes('Load it once and');
if (financeApplied && productsApplied) {
  process.exit(0);
}

const patch = zlib.gunzipSync(Buffer.from('H4sIAAAAAAACA81YW28bxxV+F6D/cAy42d1ouaIuli0WSkLLcmvAdh1KDwUEQRrtDqlN9tbZXUkEQ0CO0RZFgSTIcwP0qX013Lhx40T9C8u/4F/SM5e9kRRFqyhQP1izM2fOnDnnO985Q8ftdqHR6LkJkOWY2cs+cQPrs/gcjmufC27g0HMgx5vd7j1qWfe6d1dWj9dgpdncWF9faDQaY/sXlpaWxnV88gk0VptrmxvmXVjKBzjZTQM7ccMAHroBCWyqDyAxwSNBz4Qw+FW4F+6cRzSIKQwNGCwA/8dokrIAfBIt8okh/r+40AAgcT+wS4028eyHIdOPGSo+MaFvgo86FheW5hI1YQBuYHupQ3GJ2iROYAsSlqIpOBiU9thhgGt+GCQnD0hCcVGMdxPCEl2cKiwUsh5N0P7TT1PK+igYpxE5JjG1uiz0dU3s8/qH0o5DFKRBSjXDiqlH7UTXPsQx/Z0S1MzyUDxCunh9rSldzAebN3WxvBLtdvFU95TukfOOvJkyCT6CJnwMCTmH5WLuQw4JaIFyI9za2oL248eH9zvtp9u/3tnFDV1pgtKHfr0vRAvHJ3IhNlDNXvu3h5323o6xWLUpoEnFjAZQaXuMw5h4BL2KA8pOXZtuhyjf4DpzhORKePSpUwkrOSOYBsyPlY/ypZ2g5wZUl3iQRhoCQFdqGoOMlAW8+vscke9qIQbJaa8FTRO6Sr4jr16be8bCrpuIKYcmxPXiFuwflOsqwHFt0xPC8GScgmHVwXgeXiMiLKZPU1+vX9DC1Xo8xsyasXVMcroaeZM5tEjBEvYbd82VFYH7jU1z5UbAX5wnnSlhKu2McVTZKWM0KOFUZ5VHDvJKbXdla+TzKyOqn/A1/Wo5FHHDNJ5xRuRbcjsOpmhwEB397RO8Syc8K/V4IXEe8CUVHb6IeoVg1Zwcoo+cXG1Mk/GNev2QesbMuGpVbF950yzubI7ZflAYj1jwXSRR4nn6fp47s71vXi024cAplaAFXeIJ4Fg2SZDAKGMhg62PEEdKsbxI6FFLrOnaszx2igQhoswNHdTketRpIZsLQaNUoArdIKc7kb60msuS8uSwJD3xjWaeiMExCT4Xg7PQk0vIiPlfzrYl1ZrQY2EsVSPRir/vyT/51IMb8ZC6+rCMzw2AOX9IFDFIYIHNdV4fjv2D0kw5OlB/50iFKsXEnFFyeuFUUyMgGji80PnxU3qePCkZ6Oj2AGnxmDJxe2PYuD3YTZgb9HQ1LQFuWBFx5I5VE7SmZgyPjEoTgjC6ogkRFh/mMKs0H6orcTFHiB+mPDft0PdFktppnIT+IXqe9kLWL2Caz7g01gPiUwP19RKqa/m6g+voa+ELw/KSiRX0g2G5MdqFZiTUOSQJzgap5xXkf2f9Hqd8JP87d+6ZGzdtekBivqg8ioEsnDWK9uI3pwgL1+GtB9JNyK/n7KZR5LmUKZV7YUI8czFXOp4kE/onSpoEl+JXtwsFOcHWWEsl+tkGwH/R2kyWGsgrGYrmGbJVOQjAsqwJEbOyPsEV8/YE05RM+G12R1BVIbhrVisz7byCucbkVWcFX3zBOW3KxpLdrjM1l5x6fs6H1ymRcmXQcsDwv/XeSgaobScp8e4zSj53wrNAlf99jKXKOFFU1U6OuokQW9XGGl8AxgzVVpTGJ5h1POlboO3KnYJjexSyf2evRxej59ll9nP2Mns7eqHlpNKC2ecOjZkm8ifJe5l2lH3HLUBL/gG3B10/ma5UvH8w9MWrZPiLo1kmczuGBUNtIEMJgtpYv2Ou3L05QwFQP/LCPhXRatW+JDIL3hlWGtQcCpJI2m4e/INiHVGF7qwIQdhVI/4cq2Z/VQorTHJVN2q5Ey3v0hUaar1otZ3TcxPk5QwLX/26fL0rM+sFPsGKVvms9FD5E7Nyamsus2e2f2XPgg4H0XiA7DyMuh31zuMo51V1CW5B6hGBB9mAiIDcHhQmDVtHkx3JddfjVbJmYdm5GNNiUQFGvlzBxdRD8NYFUIpQ1u7O8/RWRcDgRyYu0v0CTIOUgv0TEqEhAT0DHOnGYin8S50VaDesrusl2PWITo9ZRY8iSmXhPYOz5g7BrlB2hBVtxQ8LyAa84bImO5ePLbGIBzJrrNHhk9izoJl5x6SppF9b31wVub6Eo7WmubpSy/oOjUKWxDLr8SWAiI9xXjrfBDduO74b4FeBtPKFqjq4/NcZqaqDzCF/oSm+qvnPd9joAOq0Pe9ZypCI+a8mWwIjYywhXbotpKuiwu8mMK7b4H6M+UnivEJMnxacSK3yPfn4UVCxu5BQ2vn+AYLUELWsUQKpoJCZ96lj+//oOgtLuWnLy7BLsWxQ6DzbxlYSC5TTV+kcQ3JCESqYvMVRJy7ijvUteIwPIkDSCjl9kMCpKGQ0RUlX/JoiVEgs4MO5jwB27ZjLq5rVwNYdOww3RizKh2hs5arSiPfeHT9GJnZSG3NaOoWFPUbjWF/F15uW/T17M/oyezn6CnDwHIeXowsc4ecPWFB/HL3AIn+Z/Qj43/fZm+xnwOWX2Q+AX29HX0P2Csv/69HvVS+AElzuMnv17uJvmtCPKl9je/Amez2mUivJaxoCJKl3KXJxGcfBsOJ8jqSSAW5VUsaSbqHtU2RhcuxR+OCDClncimoe4Y+2h1itrhXaC+siorA8FGgSRKVhrdMKoNfL7XzR+Cv66p/oq5/g3cVfsm+5b7mnX46+HP353cV3LRj9cd54veECfxq94JG5REVvUfX3IhD/guwnDNbz0dejP+Rh+gYDiboaOMvj+woFi6iNRVYzql3E+4SuSPtaZbnWM+tzeeZ/dtvx+nZKPNfhcBDsM8UBkmZqxUk0PBFnGvXKj6ycE8QLme/R+CPdwwZZRyisNI0xDYq17ofYfxD+YPgP4oaylfoZAAA=', 'base64'));
const result = spawnSync('git', ['apply', '--whitespace=nowarn', '--recount', '-'], {
  cwd: root,
  input: patch,
  encoding: 'utf8',
});

if (result.status !== 0) {
  process.stderr.write(result.stderr || result.stdout || 'Could not apply Finance and Products startup optimization.\n');
  process.exit(result.status || 1);
}
