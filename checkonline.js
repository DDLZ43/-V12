const https = require('https');
function get(url) { return new Promise((res, rej) => { https.get(url, r => { let d=''; r.on('data',c=>d+=c); r.on('end',()=>res({status:r.statusCode,len:d.length})); }).on('error',e=>rej(e)); }); }
(async () => {
  try {
    const editor = await get('https://ddlz43.github.io/-V12/editor.html');
    console.log('editor.html online:', JSON.stringify(editor));
  } catch(e) { console.log('editor check ERR', e.message); }
  // 检查上传.bat 是否能通过 github raw 访问到（pages 不会直接提供 .bat，但可看仓库）
})();
