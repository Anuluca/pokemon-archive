/**
 * 将各归档独立发布到 /<slug>/。
 * 原始归档保持不变；构建副本将所有已保存依赖映射到本集合，避免跨集合冲突。
 * 仅使用 Node.js 标准库，新集合无需增加框架或安装依赖。
 */
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const dist = path.join(root, 'dist');
const collections = JSON.parse(await fs.readFile(path.join(root, 'collections.json'), 'utf8'));
const toPosix = value => value.split(path.sep).join('/');
const htmlEscape = value => String(value).replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('"', '&quot;');

async function filesIn(folder, relative = '') {
  const result = [];
  for (const entry of await fs.readdir(path.join(folder, relative), { withFileTypes: true })) {
    const name = toPosix(path.join(relative, entry.name));
    if (entry.isDirectory()) result.push(...await filesIn(folder, name));
    else if (entry.isFile() && entry.name !== '.DS_Store') result.push(name);
  }
  return result.sort();
}

// 只清理构建产物，不触碰 archives 中的归档原件。
await fs.rm(dist, { recursive: true, force: true });
await fs.mkdir(dist, { recursive: true });
// 现代播放兼容层与 Ruffle 在所有集合之间共享。
await fs.cp(path.join(root, 'runtime'), path.join(dist, 'shared'), { recursive: true });
await fs.cp(path.join(root, 'node_modules/@ruffle-rs/ruffle'), path.join(dist, 'shared/ruffle'), { recursive: true, filter: source => !source.endsWith('.map') });
const slugs = new Set();
const summary = [];
for (const collection of collections) {
  const { slug, homepage } = collection;
  if (!/^[a-z0-9][a-z0-9-]*$/.test(slug) || slugs.has(slug)) throw new Error(`Invalid or duplicate collection: ${slug}`);
  slugs.add(slug);
  const source = path.resolve(root, collection.source);
  if (!source.startsWith(`${root}${path.sep}`)) throw new Error('Archive source must be inside the repository');
  const files = await filesIn(source);
  if (!files.includes(homepage)) throw new Error(`Missing homepage for ${slug}: ${homepage}`);
  const primaryDirectory = path.posix.dirname(homepage);
  const mapping = new Map();
  for (const file of files) {
    let target;
    if (file === 'index.html') target = `${slug}/index.html`; // 旧入口是跳转壳，与真正首页共用映射。
    else if (path.posix.dirname(file) === primaryDirectory && /\.html?$/i.test(file)) target = `${slug}/${path.posix.basename(file)}`;
    else if (file.startsWith('site/')) {
      target = `${slug}/${/\.(?:html?|shtml)$/i.test(file) ? 'pages' : 'assets'}/${file.slice(5)}`;
    } else target = `${slug}/${file}`;
    mapping.set(file, target);
  }

  // 只有能映射到实际归档文件的地址才改写；原站外链与 JavaScript 表达式保持原样。
  function rewriteReference(value, file) {
    if (!value || /^(?:[a-z][a-z\d+.-]*:|\/\/|#)/i.test(value)) return value;
    let url;
    try { url = new URL(value.replaceAll('&amp;', '&'), `https://archive.invalid/${file}`); }
    catch { return value; }
    if (url.hostname !== 'archive.invalid') return value;
    let decoded;
    try { decoded = decodeURIComponent(url.pathname.slice(1)); } catch { return value; }
    const target = mapping.get(decoded);
    return target ? `/${target}${url.search}${url.hash}` : value;
  }

  let copied = 0;
  for (const file of files) {
    // 保留原始文件于仓库；部署无需本地服务器启动脚本，也不使用旧入口跳转壳。
    if (file === 'index.html' || ['start_server.py', '启动.command', '启动.bat'].includes(file)) continue;
    const target = path.join(dist, mapping.get(file));
    await fs.mkdir(path.dirname(target), { recursive: true });
    if (!file.startsWith('originals/') && /\.(?:html?|shtml|css|js)$/i.test(file)) {
      let text = await fs.readFile(path.join(source, file), 'utf8');
      // 腾讯已将旧迷你导航脚本替换为首页跳转；只禁用发布副本中的这一退役行为。
      if (file.endsWith('/mi.MiniNav_110901V1.js') && /^\s*location\.href\s*=\s*['"]https:\/\/www\.qq\.com/.test(text)) {
        text = '// Archived mini navigation retired; automatic redirect disabled.\n';
      }
      text = text.replace(/\b(href|src|background|poster|data-src|data-original|action|value)=(['"])([^'"<>]*)\2/gi,
        (_, attribute, quote, value) => `${attribute}=${quote}${rewriteReference(value, file)}${quote}`);
      text = text.replace(/\burl\(\s*(['"]?)([^)'"]+)\1\s*\)/gi,
        (_, quote, value) => `url(${quote}${rewriteReference(value, file)}${quote})`);
      // 同时覆盖脚本中已本地化的静态地址；不存在的动态路径不会被猜测或替换。
      text = text.replace(/(['"])([^'"\r\n]{1,4096})\1/g,
        (_, quote, value) => `${quote}${rewriteReference(value, file)}${quote}`);
      if (/\.(?:html?|shtml)$/i.test(file)) {
        // 原站移动端跳转会将归档文章送往已退役的 xw.qq.com，保留桌面归档正文。
        text = text.replace(/<script\b[^>]*>([\s\S]*?)<\/script>/gi, (script, body) =>
          body.includes('#TencentContent') && body.includes('navigator.userAgent') ? '' : script);
        // 旧二维码函数名 Request 会覆盖浏览器 Fetch API 构造器，导致 Ruffle 请求变成 [object Object]。
        text = text.replace(/<script\b[^>]*>([\s\S]*?)<\/script>/gi, (script, body) =>
          /function\s+Request\s*\(/.test(body) && body.includes('qrcode/gen.php')
            ? script.replace(/\bRequest\s*\(/g, 'archiveQrCodeRequest(') : script);
        // 所有默认导航改到当前标签页；动态 window.open 由兼容层接管。
        text = text.replace(/(<(?:a|form|base)\b[^>]*?)\s+target=(['"])[^'"]*\2/gi, '$1');
        // 仅允许同源 Flash/WASM 资源请求；腾讯视频使用其 HTTPS HTML5 播放页。
        text = text.replace(/<meta\b(?=[^>]*http-equiv=["']Content-Security-Policy["'])[^>]*>/gi, '');
        const policy = "default-src 'self' data: blob: 'unsafe-inline' 'unsafe-eval'; connect-src 'self'; frame-src 'self' https://v.qq.com; object-src 'self'; worker-src 'self' blob:";
        const compatibility = `<meta http-equiv="Content-Security-Policy" content="${policy}"><link rel="stylesheet" href="/shared/archive-runtime.css"><script src="/shared/archive-runtime.js" data-archive-collection="${slug}" defer></script>`;
        text = text.replace(/<head\b[^>]*>/i, match => match + compatibility);
        if (!/<head\b/i.test(text)) text = compatibility + text;
      }
      await fs.writeFile(target, text);
    } else await fs.copyFile(path.join(source, file), target);
    copied++;
  }
  await fs.writeFile(path.join(dist, slug, 'deployment-map.json'), JSON.stringify({
    slug, source: collection.source, homepage: `/${slug}/`, files: Object.fromEntries(mapping)
  }, null, 2));
  summary.push({ slug, files: copied, title: collection.title });
}

// 根目录只展示已有集合。未来添加 jiewai 配置后会自动出现，不预建空归档。
const links = collections.map(c => `<li><a href="/${c.slug}/">${htmlEscape(c.title)}</a><span>参考存档：${htmlEscape(c.referenceSnapshot ?? '')}</span></li>`).join('');
await fs.writeFile(path.join(dist, 'index.html'), `<!doctype html>
<html lang="zh-CN"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>宝可梦网站归档</title><style>body{max-width:760px;margin:10vh auto;padding:24px;font:16px/1.7 system-ui;color:#1f2937}h1{font-size:30px}ul{padding:0;list-style:none}li{padding:24px 0;border-bottom:1px solid #ddd}a{color:#0759ad}span{display:block;color:#666;font-size:14px}footer{margin-top:40px;font-size:13px;color:#666}</style>
<h1>宝可梦网站归档</h1><ul>${links}</ul><footer>历史网站静态归档。原站图片与内容的权利归原权利人所有。<br><a href="https://github.com/Anuluca/pokemon-archive">GitHub 仓库</a></footer></html>`);
await fs.writeFile(path.join(dist, '404.html'), '<!doctype html><meta charset="utf-8"><title>未找到归档页面</title><h1>未找到归档页面</h1><p><a href="/">返回归档目录</a></p>');
await fs.writeFile(path.join(dist, 'build-summary.json'), JSON.stringify(summary, null, 2));
console.log(JSON.stringify(summary, null, 2));
