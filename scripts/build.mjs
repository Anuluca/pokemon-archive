/**
 * 将各归档独立发布到 /<slug>/。
 * 原始归档保持不变；构建副本将所有已保存依赖映射到本集合，避免跨集合冲突。
 * 使用 Node.js 生成静态文件，Acorn 负责安全改写旧脚本；新集合无需前端框架。
 */
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { rewriteJavaScript } from './rewrite-javascript.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const dist = path.join(root, 'dist');
const collections = JSON.parse(await fs.readFile(path.join(root, 'collections.json'), 'utf8'));
const toPosix = value => value.split(path.sep).join('/');
const htmlEscape = value => String(value).replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('"', '&quot;');
const archiveStatement = '本站仅用于互联网失传媒体的保存与归档，不用于任何商业用途。';
const projectLinks = '<a href="https://github.com/Anuluca/pokemon-archive">GitHub</a>';

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
  const restoration = await fs.readFile(path.join(source, 'restoration-2026-11-18.json'), 'utf8').then(JSON.parse).catch(() => ({records: []}));
  const additional = await fs.readFile(path.join(source, 'additional-pages.json'), 'utf8').then(JSON.parse).catch(() => ({records: [], pages: []}));
  const collectionManifest = collection.manifest
    ? JSON.parse(await fs.readFile(path.join(source, collection.manifest), 'utf8')) : {records: []};
  const records = [...restoration.records, ...additional.records, ...collectionManifest.records];
  // 原始清单存在两种字段格式；日期只取该 HTML 自身的来源，不借用首页或图片的时间。
  const originalManifest = JSON.parse(await fs.readFile(path.join(source, 'manifest.json'), 'utf8'));
  const snapshotRecords = [...Object.values(originalManifest.records || {}), ...records];
  function snapshotNote(file) {
    const record = snapshotRecords.find(entry => (entry.localPath || entry.local_path || (entry.path && `site/${entry.path}`)) === file);
    const stamp = (record?.source || record?.source_url || '').match(/\/web\/(\d{14})/)?.[1];
    if (!stamp) return file.startsWith('site/') ? '快照时间：来源未记录或未取回。' : '本页为归档资料索引，无对应历史快照。';
    return `快照时间：${stamp.slice(0,4)}-${stamp.slice(4,6)}-${stamp.slice(6,8)} ${stamp.slice(8,10)}:${stamp.slice(10,12)}:${stamp.slice(12,14)}（UTC）。`;
  }
  const unavailable = new Set(records.filter(record => record.errors || record.status === 'missing').map(record => {
    const url = new URL(record.url);
    return `site/${url.hostname}${url.pathname}`;
  }));
  function missingRestoredAsset(value, file) {
    const url = new URL(value, `https://archive.invalid/${file}`);
    const key = url.hostname === 'archive.invalid' ? url.pathname.slice(1) : `site/${url.hostname}${url.pathname}`;
    return unavailable.has(key) && !mapping.has(key);
  }
  for (const file of files) {
    let target;
    if (file === 'index.html') target = `${slug}/index.html`; // 旧入口是跳转壳，与真正首页共用映射。
    else if (path.posix.dirname(file) === primaryDirectory && /\.html?$/i.test(file)) target = `${slug}/${path.posix.basename(file)}`;
    else if (file.startsWith('site/')) {
      target = `${slug}/${/\.(?:html?|shtml)$/i.test(file) ? 'pages' : 'assets'}/${file.slice(5)}`;
    } else target = `${slug}/${file}`;
    // 已修复的依赖使用新文件名，避免浏览器继续使用旧缓存。
    if (file.endsWith('/mi.MiniNav_110901V1.js')) target = target.replace(/\.js$/, '.archive.js');
    if (file.endsWith('/headnav.css')) target = target.replace(/\.css$/, '.restored.css');
    mapping.set(file, target);
  }

  // 只有能映射到实际归档文件的地址才改写；原站外链与 JavaScript 表达式保持原样。
  function rewriteReference(value, file) {
    if (!value || !value.trim() || /^(?:javascript:|data:|mailto:|#)/i.test(value)) return value;
    let url;
    try { url = new URL(value.replaceAll('&amp;', '&'), `https://archive.invalid/${file}`); }
    catch { return value; }
    let decoded;
    try {
      decoded = decodeURIComponent(url.pathname.slice(1));
      if (url.hostname !== 'archive.invalid') {
        // 查询参数属于原页面身份的一部分，例如 activity.php?id=48；本地文件名由来源清单确定。
        const original = `http://${url.hostname}${url.pathname}${url.search}`;
        const record = records.find(entry => entry.url === original);
        const recordedTarget = record && mapping.get(record.placeholderPath || record.localPath || `site/${record.path}`);
        if (recordedTarget) return `/${recordedTarget}${url.hash}`;
        decoded = `site/${url.hostname}/${decoded}`;
      }
      if (decoded.endsWith('.php')) decoded += '.html';
    } catch { return value; }
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
      if (text.includes('\0')) throw new Error(`Invalid text encoding: ${file}`);
      if (/^site\/(?:www\.)?tomy\.cn\//.test(file)) {
        // 未取回的装饰图不制造假原件。缺失状态保留在补充来源记录中，发布副本用文字控件降级。
        if (file.endsWith('.css')) text = text.replace(/url\(\s*(['"]?)([^)'"\s]+)\1\s*\)/gi,
          (match, quote, value) => missingRestoredAsset(value, file) ? 'none' : match);
        if (file.endsWith('.html')) {
          text = text.replace(/<link\b[^>]*href=["']favicon\.ico["'][^>]*>/gi, '');
          text = text.replace(/<img\b[^>]*src=["']\.\/images\/title-([123])\.png["'][^>]*>/gi,
            (_, number) => `<span class="archive-event-heading">${{1:'问卷调查',2:'提交表单',3:'有奖竞猜'}[number]}</span>`);
          text = text.replace(/<input\b(?=[^>]*type=["']image["'])[^>]*>/gi,
            '<button type="submit" class="submit archive-event-submit">提交</button>');
          if (!file.includes('/events/')) text = text.replace(/src=["']\.\/js\/jquery-1\.7\.1\.min\.js["']/gi,
            'src="events/js/jquery-1.7.1.min.js"');
        }
      }
      // 腾讯已将旧迷你导航脚本替换为首页跳转；只禁用发布副本中的这一退役行为。
      if (file.endsWith('/mi.MiniNav_110901V1.js') && /^\s*location\.href\s*=\s*['"]https:\/\/www\.qq\.com/.test(text)) {
        text = '// Archived mini navigation retired; automatic redirect disabled.\n';
      }
      const isHtml = /\.(?:html?|shtml)$/i.test(file);
      const rewriteScript = script => {
        try { return rewriteJavaScript(script, value => rewriteReference(value, file)); }
        catch (error) {
          // 旧批次的无效脚本保持原样；杰外新归档必须通过语法检查。
          if (slug === 'jiewai') throw new Error(`${file}: ${error.message}`);
          return script;
        }
      };
      const inlineScripts = [];
      if (isHtml) {
        // 脚本正文必须与 HTML 属性处理隔离，避免把正则或 HTML 字符串改坏。
        text = text.replace(/(<script\b[^>]*>)([\s\S]*?)(<\/script>)/gi, (_, open, body, close) => {
          const index = inlineScripts.push(rewriteScript(body)) - 1;
          return `${open}__ARCHIVE_SCRIPT_${index}__${close}`;
        });
        text = text.replace(/\b(href|src|background|poster|data-src|data-original|data-mfp-src|data-background|action|value)=(['"])([^'"<>]*)\2/gi,
          (_, attribute, quote, value) => `${attribute}=${quote}${rewriteReference(value, file)}${quote}`);
      }
      // 响应式图片候选与灯箱原图必须一起本地化，避免浏览器选中仍指向原站的候选图。
      if (isHtml) text = text.replace(/\bsrcset=(['"])([^'"<>]*)\1/gi, (_, quote, value) => {
        const candidates = value.split(',').filter(entry => !entry.includes('.missing.svg')).map(entry => {
          const [url, ...descriptor] = entry.trim().split(/\s+/);
          return [rewriteReference(url, file), ...descriptor].join(' ');
        }).join(', ');
        return `srcset=${quote}${candidates}${quote}`;
      });
      if (isHtml || file.endsWith('.css')) {
        text = text.replace(/\burl\(\s*(['"]?)([^)'"]+)\1\s*\)/gi,
          (_, quote, value) => `url(${quote}${rewriteReference(value, file)}${quote})`);
        text = text.replace(/@import\s+(['"])([^'"]+)\1/gi,
          (_, quote, value) => `@import ${quote}${rewriteReference(value, file)}${quote}`);
      }
      if (file.endsWith('.js')) text = rewriteScript(text);
      if (isHtml) text = text.replace(/__ARCHIVE_SCRIPT_(\d+)__/g, (_, index) => inlineScripts[Number(index)]);
      if (/\.(?:html?|shtml)$/i.test(file)) {
        let formPolicy = '';
        if (additional.pages.some(page => page.localPath === file)) {
          // 统计脚本和 Adobe 插件安装器不属于历史正文；Flash 由共用的 Ruffle 兼容层接管。
          text = text.replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, script =>
            /piwikTracker|_gaq|swffix_modified\.js|SWFFix\.registerObject/.test(script) ? '' : script);
          text = text.replace(/<img\b[^>]*src=["']https?:\/\/www\.adobe\.com\/[^"']*get_flash_player\.gif["'][^>]*>/gi, '');
          text = text.replace(/href=(["'])https?:\/\/(?:www\.)?tomy\.cn\/toy\/pokemon\/index\.php\1/gi, `href="/${slug}/"`);
          // 原图未取回的活动按钮使用文字控件，仍能进入真实保存的答题页。
          text = text.replace(/<img\b[^>]*src=["'][^"']*dianjicanjia\.jpg(?:\.missing\.svg)?["'][^>]*>/gi,
            '<span class="archive-enter-event">点击参加</span>');
        }
        // 退役的腾讯迷你导航完全从可浏览副本中移除，动态插入脚本也一并处理。
        text = text.replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, script =>
          script.includes('mi.MiniNav_110901V1') ? '' : script);
        if (file === homepage) {
          // 竞猜图片先进入活动介绍，再由活动介绍进入答题、信息填报流程。
          text = text.replace(/<a\b[^>]*>\s*(<img\b[^>]*src=["'][^"']*\/ivent\.jpg["'][^>]*>)\s*<\/a>/gi,
            `<a href="/${slug}/pages/www.tomy.cn/toy/pokemon/events/event.php.html">$1</a>`);
          // 补充页面单独列出，不改变历史页面中的原始导航和版权栏。
          const extraLinks = additional.pages.filter(page => page.showInFooter !== false).map(page => {
            const destination = mapping.get(page.localPath);
            if (!destination) throw new Error(`Additional archive page missing: ${page.localPath}`);
            return `<a href="/${destination}${page.fragment ? `#${htmlEscape(page.fragment)}` : ''}">${htmlEscape(page.title)}</a>`;
          }).join('');
          const otherCollections = collections.filter(entry => entry.slug !== slug)
            .map(entry => `<a href="/${entry.slug}/">${htmlEscape(entry.shortTitle || entry.title)}</a>`).join('');
          const footer = `<aside class="archive-supplement" aria-label="补充归档页面"><nav aria-label="补充页面链接"><span class="archive-nav-label">其他页面归档：</span>${extraLinks}${otherCollections}</nav><footer><p>${archiveStatement}</p><p>${projectLinks}</p></footer></aside>`;
          if (text.includes('<div id="archive-footer-slot"></div>')) text = text.replace('<div id="archive-footer-slot"></div>', footer);
          else text = text.replace(/<\/body>/i, footer + '</body>');
        }
        if (/site\/www\.tomy\.cn\/toy\/pokemon\/(?:events\/)?step1\.php\.html$/.test(file)) {
          formPolicy = "; form-action 'none'";
          const quiz = file.includes('/events/');
          const next = `/${slug}/pages/www.tomy.cn/toy/pokemon/step1.php.html`;
          text = text.replace(/<form\b[^>]*>/i,
            `<p class="archive-event-notice">历史活动归档：活动已结束；填写内容不会上传或保存。${quiz ? '答题后点击提交可查看信息填报页。' : '本页仅供查看当年的填报流程。'}</p><form id="infomationform" data-archive-event-stage="${quiz ? 'quiz' : 'information'}" data-next-page="${next}">`);
          text = text.replace(/<\/head>/i, '<script src="/shared/archive-event.js" defer></script></head>');
          // 已下线的原站首页改回归档入口。
          text = text.replace(/href=(["'])(?:http:\/\/www\.tomy\.cn\/toy\/pokemon\/)?index\.php\1/gi, `href="/${slug}/"`);
        }
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
        const policy = "default-src 'self' data: blob: 'unsafe-inline' 'unsafe-eval'; connect-src 'self'; frame-src 'self' https://v.qq.com; object-src 'self'; worker-src 'self' blob:" + formPolicy;
        const compatibility = `<meta http-equiv="Content-Security-Policy" content="${policy}"><link rel="stylesheet" href="/shared/archive-runtime.css"><script src="/shared/archive-runtime.js" data-archive-collection="${slug}" defer></script>`;
        text = text.replace(/<head\b[^>]*>/i, match => match + compatibility);
        if (!/<head\b/i.test(text)) text = compatibility + text;
        const snapshot = `<p class="archive-snapshot">${snapshotNote(file)}</p>`;
        // 专题首页已有页脚容器；放入其中，避免杰外旧主题的固定侧栏遮挡新增文字。
        if (text.includes('class="archive-supplement"')) text = text.replace(/(<aside class="archive-supplement"[\s\S]*?)(<\/footer>)/, `$1${snapshot}$2`);
        else if (/<\/body>/i.test(text)) text = text.replace(/<\/body>/i, `${snapshot}</body>`);
        else text += snapshot;
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
<h1>宝可梦网站归档</h1><ul>${links}</ul><footer>${archiveStatement}<br>原站图片与内容的权利归原权利人所有。<br>${projectLinks}<p class="archive-snapshot">本页为归档目录，无对应历史快照。</p></footer></html>`);
await fs.writeFile(path.join(dist, '404.html'), '<!doctype html><meta charset="utf-8"><title>未找到归档页面</title><h1>未找到归档页面</h1><p><a href="/">返回归档目录</a></p><p class="archive-snapshot">本页为错误提示，无对应历史快照。</p>');
await fs.writeFile(path.join(dist, 'build-summary.json'), JSON.stringify(summary, null, 2));
console.log(JSON.stringify(summary, null, 2));
