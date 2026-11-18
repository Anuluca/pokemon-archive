# 宝可梦网站归档

公开访问：https://pokemon-web-archive.anuluca.com/

Netlify 地址：https://pokemon-web-archive.netlify.app/

| 集合 | 访问路径 | 当前内容 |
| --- | --- | --- |
| TOMY | `/tomy/` | 腾讯儿童 × 多美宝可梦专区 |
| 杰外 | `/jiewai/` | 杰外动漫宝可梦专题（2019-03-05） |

## 仓库结构

```text
archives/
  tomy/              # 腾讯 × 多美离线归档、原始下载文件、资源清单
  jiewai/            # 杰外专题、不可变原件和独立清单
collections.json     # 集合注册表；新增归档只需添加配置
scripts/
  build.mjs          # 生成独立的集合路径，改写本地资源链接
  verify.mjs         # 检查部署后的本地引用
netlify.toml         # Netlify 构建和发布配置
dist/                # 构建产物，不提交 Git
```

## 构建与部署

需要 Node.js 22 或更新版本。Ruffle 固定版本由锁文件管理，构建后随网站自托管。

```sh
npm ci
npm run build
npm run verify
```

Netlify 连接本仓库的 `main` 分支，构建命令和发布目录由 `netlify.toml` 提供。

- 构建命令：`npm run build && npm run verify`
- 发布目录：`dist`
- Netlify 项目名：`pokemon-web-archive`
- 默认域名：`pokemon-web-archive.netlify.app`
- 自定义域名：`pokemon-web-archive.anuluca.com`

## 以后新增归档

1. 将完成的离线归档放进 `archives/<集合名>/`。
2. 在 `collections.json` 加入一个集合，填写原始首页的仓库相对路径，例如：

```json
{
  "slug": "example",
  "title": "新的网站归档",
  "source": "archives/example",
  "homepage": "site/原域名/index.html",
  "capturedAt": "实际归档日期",
  "referenceSnapshot": "历史快照日期"
}
```

3. 运行 `npm test`，检查本地资源引用。向 `main` 推送后，由 Netlify 自动发布。

构建脚本将集合首页发布到 `/<slug>/`，同目录的其他 HTML 页面保留文件名；其他页面、资源和原件分别隔离保存，不影响 `/tomy/`。

## 归档范围与限制

TOMY 集合保存 16 个原始 HTML 页面和 311 个图片文件。主站五个页面直接引用的图片已全部取回；部分关联文章分页、壁纸原图和游戏资源未取回。准确结果以 `archives/tomy/manifest.json` 及 `report.html` 为准。

`originals/` 保留原始下载字节，`site/` 是离线链接改写后的副本。构建只改变发布副本，不改动原件。网站中的 `deployment-map.json` 记录原归档路径与发布路径的对应关系。

发布副本通过 Ruffle 模拟器运行已保存的 Flash 绘本和问答小游戏，无需安装 Adobe Flash。腾讯 Flash 视频播放器替换为腾讯 HTML5 播放器；视频是否可播取决于腾讯服务和内容是否仍然存在。未取回的英语游戏 SWF 显示缺失说明。评论和投稿等在线服务无法通过静态归档恢复。

`runtime/` 提供当前标签页导航和播放器兼容层。构建会禁用已退役的腾讯迷你导航首页跳转及移动端跳转；历史原件保持不变。Netlify 水印已在项目设置中关闭。

原站文字、图像、品牌与动画素材的权利归各自权利人所有。本仓库不对这些第三方归档内容授予新的许可。

## 2026-11-18 子页面与有奖竞猜修复

- 从 `originals/` 按 UTF-16 正确解码 `headnav.css`，补取导航精灵图；发布时使用新 CSS 文件名，避免旧缓存继续破坏横幅与菜单。
- 从全部可浏览页面移除已退役的腾讯迷你导航脚本和移动端跳转，保留历史原件。
- 首页底部“有奖竞猜”图片先进入活动介绍页，再点击参加进入答题页；选择三个答案后提交，进入信息填报页。
- 两页分别依据用户指定的 [2013 年答题快照](https://web.archive.org/web/20130325001136/http://www.tomy.cn/toy/pokemon/events/step1.php) 和 [2013-01-01 信息填报快照](https://web.archive.org/web/20130101180044/http://www.tomy.cn:80/toy/pokemon/step1.php)。前一快照本身包含额外调查表，原内容保留；两个不同时间的页面按归档浏览流程接通，不声称复原 PHP 服务端。
- 表单只在本地浏览，不上传、不保存字段。信息页点击提交仅显示活动结束提示。
- 三张标题图、两张按钮图及部分无关 CSS 装饰资源未取回。发布副本的缺失标题和按钮使用文字替代；未取回的 CSS 背景禁用。信息页复用答题页已取回的同版本 jQuery。原始字节及准确来源、大小、SHA-256、失败结果在 `restoration-2026-11-18.json` 中记录，未替换成伪造的历史文件。
- 首次归档的 `manifest.json` 和报告保持原批次记录；此次新增两页和依赖的来源以补充清单为准。

## 补充历史页面与归档声明

补充保存三个独立归档页面，竞猜活动介绍由首页竞猜图片进入，来源与原始字节保存在 `additional-pages.json` 和 `originals/`：

- 精灵宝可梦介绍：`http://tomy.cn/toy/pokemon/what.html`，用户指定快照 `20160331194245`。
- 精灵宝可梦漫画连载活动：`http://tomy.cn/toy/activity.php?id=48#titl48`，用户指定快照 `20160331194325`。查询参数 `id=48` 对应独立静态文件，保留 `titl48` 锚点。
- 有奖竞猜活动介绍：`http://www.tomy.cn/toy/pokemon/events/event.php`，用户指定快照 `20130325001130`；“点击参加”通往已恢复的答题页。

页面依赖与原站无关的广告统计脚本已从浏览副本移除；原件保持不变。无法取回的图片使用明确标记的占位，缺失按钮可用文字控件浏览，所有失败请求记录于补充清单，不冒充已取回的原文件。

归档首页与根目录增加说明：“本站仅用于互联网失传媒体的保存与归档，不用于任何商业用途。”同时提供 [GitHub](https://github.com/Anuluca/pokemon-archive) 链接。

## 杰外专题归档

`/jiewai/` 保存用户提供的 [2019-03-05 专题快照](https://web.archive.org/web/20190305200502/http://jya.cn/?page_id=394)。正文为原站的介绍、节目信息和六个系列展示项；原始 HTML 与静态资源放在 `archives/jiewai/originals/`，浏览副本在 `site/`，来源、哈希、可用资源和缺失记录在 `manifest.json`。

TOMY 首页底部链接栏自动加入“杰外宝可梦专题”，杰外页底部可返回 TOMY 集合；根目录同时显示两个集合。每个集合的页面、图片、脚本和原件分别位于各自的路径下。

浏览副本移除与内容展示无关的 Feed、REST 和 emoji 检测；响应式图片候选和灯箱地址随资源一起本地化。原件保持下载字节。部分灯箱原图或插件装饰资源未取回时，清单保留缺失状态。

杰外清单本次保存 123 个文件，另记录 28 个未取回的资源候选；包括六个灯箱原图地址。`report.html` 提供逐项来源与原件下载。构建使用 Acorn 按 JavaScript 语法树改写静态字符串，保留旧脚本的正则表达式和 HTML 拼接；集合链接执行完整页面导航，避免 Samba 的 WordPress 局部加载拦截。

竞猜浏览顺序：主页竞猜图片 → 活动介绍 → 点击参加 → 答题 → 提交 → 信息填报。活动介绍不在补充链接栏重复展示；该栏以“其他页面归档：”开头。所有归档页脚已移除 Anutrium 链接。
