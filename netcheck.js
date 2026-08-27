const { execSync } = require('child_process');
function run(cmd) { try { return execSync(cmd, { encoding: 'utf8', timeout: 20000 }).trim(); } catch(e){ return (e.stderr||e.stdout||'').trim(); } }
console.log('--- TCP 443 connect test to github.com ---');
console.log(run('powershell Test-NetConnection github.com -Port 443 -InformationLevel Quiet'));
console.log('--- DNS 解析 github.com ---');
console.log(run('nslookup github.com').split('\n').slice(-3).join('\n'));
