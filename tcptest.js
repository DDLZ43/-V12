const net = require('net');
const tls = require('tls');
const hosts = [
  { host: 'github.com', port: 443 },
  { host: 'codeload.github.com', port: 443 },
  { host: 'objects.githubusercontent.com', port: 443 }
];
function test({host, port}) {
  return new Promise(resolve => {
    const s = tls.connect({ host, port, servername: host, rejectUnauthorized:false }, () => {
      resolve(host + ':443 → TLS 连接成功');
      s.destroy();
    });
    s.setTimeout(8000, () => { resolve(host + ':443 → 超时'); s.destroy(); });
    s.on('error', e => resolve(host + ':443 → 错误: ' + e.code));
  });
}
(async () => {
  for (const h of hosts) console.log(await test(h));
})();
