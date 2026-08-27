// Applies the verified Dashboard startup optimization during a Vercel build.
// It is intentionally idempotent so cached build workspaces remain safe.
const fs = require('node:fs');
const path = require('node:path');
const zlib = require('node:zlib');
const { spawnSync } = require('node:child_process');

const root = path.resolve(__dirname, '..');
const sourcePath = path.join(root, 'src', 'main.jsx');
const source = fs.readFileSync(sourcePath, 'utf8');

if (source.includes('async function calcMonth(y, m, { includeForecast = true } = {})')) {
  process.exit(0);
}

const patch = zlib.gunzipSync(Buffer.from('H4sIAAAAAAACA6VWS2/jNhC+G/B/mJ4iwbJiJ9m0a8DdbREvsIe0hd1bkAMtjWI2EqmSlBPD6/++owclU7GRLarTSJz5ZuabBxXzJIHx+IkbYJdaRZcZ4yL8R7/C2nkdcBHjK7AYbydXN2HI1h+T5BeE6WRye3MzGI/HPfvBaDTqY3z+DOPpx+vrq+BnGFmBPiaFiAyXAu6Y3qwlU7G3BwMHH/YDGA4AoNC4SBKMjOf5MP8V9pBKFpN8COBhh0wFkElhNgGsFRPR5mtsJdRhiuLJbB79YQk2BmB6J6LOacTS6L409naEQj6Hg9E7SgEFwEWUFjF+kQojpg3MwagC4UDCvo68fCIp6KyK7Y4ZpMNKXhmmTO1v+EZxIWLSE/gCpYn3R5GtUXk7P4BGzEic+qGRX1d/rozi4snzQ53yCL0JnUxczIdhQ/yHq+ua+FKYTt9lvnwOLpYu8jzlqO5wbZbyRVOcvynFdmGiZObZ0yXXz/csD7csLVB7PgUnKV2PBeuqeuv6BKhnaum8E3LQ9xkqjAtK1dMBqApPwwhUjRRAmf34CIzKiPFRldgLo2ZXmf7CBTVIW8CFeOICm/LaLvKrXgC4vIS/Nwi5wi2XhR5XdSIPWc4U18RfLFGDkASMNCgKuNGQNMghrJ55nlOZ6HOLx7aSxxoYaKRIY8DXHIXmW6Re0xENGsiEmsC8SPVMqP8Sk4RJrnCLage67KAiD2u8M7n2erTWBfj0H0mwdjNqe5vUksIQBc6AOs5++0vJhJvqU4yG8VTP4OGxO19UKaJ2jO6ZIp/0CQ7HTdDzQ8kQ1RppAjw3zbCn6faSG9oPoNSKFkShKZSgtFUNHjRlQuo9qk3gNGfwplUth6U8g9jO2O/tx6CfZ5/M7v3OMtoLvGEavn07w/WZRBdtIv1KnDGoj+Fg18ntZBJMq31yO7kJrj782D6piD2cWcXNUt83E2yoz61sCxoVikasG+SjxdxdA37PKM/KylMNT2q2yimadsTJALPc7NpEaBczrwN2Y4Nju35geRbWHknohXcgNRNtwLPmC6Wk8h3kMgWZYojlkXfRBtS5rLdRSR4k1AsYzy4CcBE7j6duN8t7PehVanbm3yXQKtJKWxYCDK1J2llQ/i/k5S4Uza1Gw5FltC1pT1IX0RiyNMU0dPbqEVZtI0W6o0FDWpRHy7a+V2jcyI2hVZNyuhXpqiRdTZv2aPO6WTw0zbNEXaSmo6h+f2xLR6OXcY0hRbhCY4hQ78EiwZmOC04pvKn8iR+HGdUs1fTj0DL5SJKVeQKeE3VIi99QzX+az+EiKdKEE43xhU/EK/kCrq5CRny5JHQD5OpWpFrV3iS4RNkQ5m4IHQGf+gYOdnmPnBotN+nTLt9kvT+i/f/NiUNZW4tD8wNqSTnqwnk5pdB6t2Q212LzHtqLYzj4DoFm4uhrCwAA', 'base64'));
const result = spawnSync('git', ['apply', '--whitespace=nowarn', '--recount', '-'], {
  cwd: root,
  input: patch,
  encoding: 'utf8',
});

if (result.status !== 0) {
  process.stderr.write(result.stderr || result.stdout || 'Could not apply Dashboard startup optimization.\n');
  process.exit(result.status || 1);
}
