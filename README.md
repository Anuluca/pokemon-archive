# 宝可梦网站归档

公开访问：https://pokemon-archive.anuluca.com/

| 集合 | 访问路径 | 当前内容 |
| --- | --- | --- |
| TOMY | `/tomy/` | 腾讯儿童 × 多美宝可梦专区 |

## 仓库结构

```text
archives/
  tomy/              # 已保存的离线归档、原始下载文件、资源清单
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
- 自定义域名：`pokemon-archive.anuluca.com`

## 以后新增杰外归档

1. 将完成的离线归档放进 `archives/jiewai/`。
2. 在 `collections.json` 加入一个集合，填写原始首页的仓库相对路径，例如：

```json
{
  "slug": "jiewai",
  "title": "杰外宝可梦网站归档",
  "source": "archives/jiewai",
  "homepage": "site/原域名/index.html",
  "capturedAt": "实际归档日期",
  "referenceSnapshot": "历史快照日期"
}
```

3. 运行 `npm test`，检查本地资源引用。向 `main` 推送后，由 Netlify 自动发布。

构建脚本将集合首页发布到 `/jiewai/`，同目录的其他 HTML 页面保留文件名；其他页面、资源和原件分别隔离保存，不影响 `/tomy/`。

## 归档范围与限制

TOMY 集合保存 16 个原始 HTML 页面和 311 个图片文件。主站五个页面直接引用的图片已全部取回；部分关联文章分页、壁纸原图和游戏资源未取回。准确结果以 `archives/tomy/manifest.json` 及 `report.html` 为准。

`originals/` 保留原始下载字节，`site/` 是离线链接改写后的副本。构建只改变发布副本，不改动原件。网站中的 `deployment-map.json` 记录原归档路径与发布路径的对应关系。

发布副本通过 Ruffle 模拟器运行已保存的 Flash 绘本和问答小游戏，无需安装 Adobe Flash。腾讯 Flash 视频播放器替换为腾讯 HTML5 播放器；视频是否可播取决于腾讯服务和内容是否仍然存在。未取回的英语游戏 SWF 显示缺失说明。评论和投稿等在线服务无法通过静态归档恢复。

`runtime/` 提供当前标签页导航和播放器兼容层。构建会禁用已退役的腾讯迷你导航首页跳转及移动端跳转；历史原件保持不变。Netlify 水印已在项目设置中关闭。

原站文字、图像、品牌与动画素材的权利归各自权利人所有。本仓库不对这些第三方归档内容授予新的许可。
