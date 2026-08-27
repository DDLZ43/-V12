const https = require('https');
function get(url) { return new Promise((res, rej) => { https.get(url, {headers:{'User-Agent':'node'}}, r => { let d=''; r.on('data',c=>d+=c); r.on('end',()=>res({status:r.statusCode,body:d})); }).on('error',e=>rej(e)); }); }
(async () => {
  try {
    const r = await get('https://api.github.com/repos/DDLZ43/-V12/contents/');
    if (r.status !== 200) { console.log('API status', r.status, r.body.slice(0,200)); return; }
    const files = JSON.parse(r.body).map(f => f.name);
    console.log('仓库根目录文件:');
    console.log(JSON.stringify(files));
    console.log('含有 上传.bat:', files.includes('上传.bat'));
    console.log('含有 editor.html:', files.includes('editor.html'));
  } catch(e) { console.log('ERR', e.message); }
})();
