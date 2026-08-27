const fs = require('fs');
const { execSync } = require('child_process');
const dir = 'E:/桌面/课表项目V12';
function run(cmd) { try { return { ok: true, out: execSync(cmd, { cwd: dir, encoding: 'utf8', timeout: 90000 }) }; } catch(e){ return { ok: false, out: (e.stdout||'')+(e.stderr||'') }; } }

// 先把剩余改动 add 并 commit（删除临时文件）
run('git add -A');
run('git commit -m "cleanup temp files"');
// 推送
console.log('--- push ---');
const r = run('git push origin main');
console.log(r.ok ? 'PUSH OK' : 'PUSH FAILED');
console.log(r.out.trim());
console.log('--- end ---');
