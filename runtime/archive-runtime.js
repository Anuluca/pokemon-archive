/**
 * 归档浏览兼容层：保持当前页导航，替换已退役的 Flash 插件。
 * 本文件只作用于构建后的副本；archives/ 中的历史文件不被修改。
 */
(() => {
  'use strict';
  const collection = document.currentScript?.dataset.archiveCollection;
  const prefix = `/${collection}`;
  let rufflePromise;
  let scanQueued = false;

  // 旧页面的下拉菜单、搜索和 Flash 链接也可能调用 window.open。
  // 统一使用当前标签页，避免只移除 target 后仍有旧脚本弹出窗口。
  window.open = function openInCurrentPage(url) {
    if (url && String(url) !== 'about:blank') window.location.assign(String(url));
    return window;
  };

  // 某些旧主题会拦截同域链接以局部加载页面；归档集合之间统一执行完整导航。
  document.addEventListener('click', event => {
    const link = event.target.closest?.('.archive-supplement a[href]');
    if (!link || event.button !== 0 || event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    window.location.assign(link.href);
  }, true);

  // 原站全屏按钮直接打开 SWF，现代浏览器会下载文件；改用现有播放器的全屏功能。
  document.addEventListener('click', event => {
    const link = event.target.closest?.('a');
    const action = link?.getAttribute('href') ?? '';
    const frame = document.querySelector('.archive-flash-player[data-archive-swf]');
    if (!frame || !/^javascript:(?:FullPlay|Reload|flashCopy)\(/i.test(action)) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    if (/FullPlay/i.test(action)) void frame.requestFullscreen?.();
    else if (/Reload/i.test(action)) {
      const player = frame.querySelector('ruffle-player');
      void player?.ruffle().load({url: frame.dataset.archiveSwf, allowScriptAccess: false});
    } else {
      const download = document.createElement('a');
      download.href = frame.dataset.archiveSwf;
      download.download = '';
      download.click();
    }
  }, true);

  function keepNavigationInPage(root = document) {
    root.querySelectorAll('a[target],form[target],base[target]').forEach(node => {
      node.setAttribute('target', '_self');
    });
  }

  function parameter(object, name) {
    const match = [...object.querySelectorAll(':scope > param')]
      .find(node => node.getAttribute('name')?.toLowerCase() === name.toLowerCase());
    return match?.getAttribute('value') ?? '';
  }

  function describeFlash(node) {
    const embed = node.tagName === 'EMBED' ? node : node.querySelector('embed');
    const candidates = [parameter(node, 'movie'), parameter(node, 'src'), node.getAttribute('data'), embed?.getAttribute('src')].filter(Boolean);
    const source = candidates.find(value => value.includes(`${prefix}/assets/`)) ?? candidates[0] ?? '';
    return {
      source,
      flashvars: parameter(node, 'flashvars') || embed?.getAttribute('flashvars') || '',
      width: Number.parseInt(node.getAttribute('width') || embed?.getAttribute('width') || '550', 10),
      height: Number.parseInt(node.getAttribute('height') || embed?.getAttribute('height') || '400', 10)
    };
  }

  function frameFor(node, info, className) {
    const frame = document.createElement('div');
    frame.className = className;
    frame.style.width = `${Math.max(1, info.width)}px`;
    frame.style.height = `${Math.max(1, info.height)}px`;
    frame.style.maxWidth = '100%';
    if (node.id) frame.id = node.id;
    node.replaceWith(frame);
    return frame;
  }

  function unavailable(node, info) {
    const frame = frameFor(node, info, 'archive-flash-unavailable');
    frame.dataset.flashState = 'unavailable';
    const message = document.createElement('p');
    message.textContent = '原始 Flash 文件未能取回，暂时无法运行。';
    const link = document.createElement('a');
    link.href = `${prefix}/report.html`;
    link.textContent = '查看归档记录';
    frame.append(message, link);
  }

  function getPoster(value) {
    if (!value) return '';
    // 旧 FlashVars 中的相对路径以原站目录为基准，这些资源现已统一放入 assets。
    if (/^(\.\.\/)+[^/]+\.(?:qq|gtimg)\.com\//.test(value)) {
      return `${prefix}/assets/${value.replace(/^(\.\.\/)+/, '')}`;
    }
    return value;
  }

  function replaceTencentPlayer(node, info) {
    const parameters = new URLSearchParams(info.flashvars);
    const vid = parameters.get('vid');
    if (!vid || !/^[a-zA-Z0-9]+$/.test(vid)) return unavailable(node, info);
    const frame = frameFor(node, info, 'archive-video-player');
    frame.dataset.videoId = vid;
    frame.dataset.player = 'html5';
    const poster = document.createElement('img');
    poster.src = getPoster(parameters.get('pic'));
    poster.alt = '精灵宝可梦动画预览';
    const play = document.createElement('button');
    play.type = 'button';
    play.className = 'archive-video-play';
    play.textContent = '▶ 播放视频';
    play.setAttribute('aria-label', '使用腾讯视频 HTML5 播放器播放');
    const footer = document.createElement('a');
    footer.className = 'archive-video-link';
    footer.href = `https://v.qq.com/x/page/${vid}.html`;
    footer.textContent = '在腾讯视频查看';
    const note = document.createElement('small');
    note.className = 'archive-video-note';
    note.textContent = '使用腾讯视频播放；已下架的视频可能无法播放。';
    play.addEventListener('click', () => {
      const iframe = document.createElement('iframe');
      iframe.title = '腾讯视频 HTML5 播放器';
      iframe.src = `https://v.qq.com/txp/iframe/player.html?vid=${encodeURIComponent(vid)}&auto=1`;
      iframe.allow = 'autoplay; fullscreen; picture-in-picture';
      iframe.allowFullscreen = true;
      iframe.referrerPolicy = 'strict-origin-when-cross-origin';
      poster.remove();
      play.remove();
      note.remove();
      frame.prepend(iframe);
    }, { once: true });
    frame.append(poster, play, footer, note);
  }

  function loadRuffle() {
    if (!rufflePromise) {
      // 自托管固定版本，避免依赖访客访问第三方 CDN，也避免版本自动变化。
      window.RufflePlayer = window.RufflePlayer || {};
      window.RufflePlayer.config = {
        polyfills: false,
        publicPath: '/shared/ruffle/',
        autoplay: 'auto',
        allowScriptAccess: false,
        openUrlMode: 'allow',
        upgradeToHttps: true,
        logLevel: 'error'
      };
      rufflePromise = new Promise((resolve, reject) => {
        const script = document.createElement('script');
        script.src = '/shared/ruffle/ruffle.js';
        script.addEventListener('load', () => resolve(window.RufflePlayer.newest()), { once: true });
        script.addEventListener('error', () => reject(new Error('Ruffle 脚本加载失败')), { once: true });
        document.head.appendChild(script);
      });
    }
    return rufflePromise;
  }

  async function replaceStandaloneFlash(node, info) {
    const frame = frameFor(node, info, 'archive-flash-player');
    frame.dataset.flashState = 'loading';
    frame.dataset.archiveSwf = info.source;
    try {
      const ruffle = await loadRuffle();
      if (!frame.isConnected) return;
      const player = ruffle.createPlayer();
      player.style.width = '100%';
      player.style.height = '100%';
      frame.appendChild(player);
      await player.ruffle().load({ url: info.source, parameters: info.flashvars, allowScriptAccess: false });
      frame.dataset.flashState = 'ready';
    } catch (error) {
      frame.dataset.flashState = 'failed';
      frame.replaceChildren();
      const message = document.createElement('p');
      message.textContent = '播放器未能加载，请刷新重试。';
      const download = document.createElement('a');
      download.href = info.source;
      download.download = '';
      download.textContent = '下载原始 Flash 文件';
      frame.append(message, download);
      console.error('Archive Flash player:', error);
    }
  }

  function enhanceFlash() {
    // 只处理最外层对象，防止 object 和内部 embed 被重复替换。
    document.querySelectorAll('object,embed[type="application/x-shockwave-flash"]').forEach(node => {
      if (!node.isConnected || node.closest('.archive-flash-player') || node.dataset.archiveHandled) return;
      if (node.tagName === 'EMBED' && node.closest('object')) return;
      if (!node.getClientRects().length) return; // 隐藏弹层按需加载，不提前下载其 Flash 内容。
      const info = describeFlash(node);
      if (!info.source.toLowerCase().includes('.swf')) return;
      node.dataset.archiveHandled = 'true';
      if (/TencentPlayer\.swf/i.test(info.source)) replaceTencentPlayer(node, info);
      else if (info.source.startsWith(`${prefix}/assets/`)) void replaceStandaloneFlash(node, info);
      else unavailable(node, info);
    });
  }

  function scan() {
    keepNavigationInPage();
    enhanceFlash();
  }
  scan();
  new MutationObserver(() => {
    if (scanQueued) return;
    scanQueued = true;
    queueMicrotask(() => { scanQueued = false; scan(); });
  }).observe(document.documentElement, { childList: true, subtree: true });
})();
