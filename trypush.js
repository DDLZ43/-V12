const { execSync } = require('child_process');
const dir = 'E:/桌面/课表项目V12';
function run(cmd) {
  try { return { ok: true, out: execSync(cmd, { cwd: dir, encoding: 'utf8', timeout: 60000 }) }; }
  catch (e) { return { ok: false, out: (e.stdout||'') + (e.stderr||'') , msg: e.message}; }
}
console.log('git config user.name =', (run('git config user.name').out||'(空)').trim());
console.log('git config user.email =', (run('git config user.email').out||'(空)').trim());
console.log('--- 尝试提交并推送 ---');
let r = run('git add -A ');
console.log('add:', r.ok ? 'OK' : r.out);
r = run('git commit -m "test push bat" ');
console.log('commit:', r.ok ? 'OK: ' + r.out.split('\n')[0] : r.out);
r = run('git push origin main ');
console.log('push:', r.ok ? 'OK: ' + r.out.split('\n')[0] : r.out);
