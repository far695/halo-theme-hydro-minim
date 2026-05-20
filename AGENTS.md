# AI Agent Handoff

本文件是后续 AI agent 进入 `halo-theme-hydro-minim` 时的第一入口。更完整的开发说明见 [docs/ai-development-guide.md](docs/ai-development-guide.md)。工作区级别的 Halo 主题开发通用指南见 [../AI-THEME-DEV-GUIDE.md](../AI-THEME-DEV-GUIDE.md)。

## 项目身份

- 中文名：氢·简
- 英文名：Hydro-Minim
- 项目标识：`halo-theme-hydro-minim`
- Halo 主题标识：`metadata.name: halo-theme-hydro-minim`
- 兼容目标：Halo `>=2.20.0`

## 工作区地图

- 当前主题：`/Users/lywq/Personalspace/blog/halo_theme_dev/halo-theme-hydro-vite/halo-theme-hydro-minim`
- 原始 React 原型：`../app`，只作为 UI、动画和交互参考。
- Halo Vite 标准模板：`../theme-vite-starter`，用于参考构建结构和 Halo 插件配置。
- 完整 Halo 主题参考：`../theme-earth`，用于参考成熟主题的页面组织和 Halo 数据接入。
- 参考主题 `../theme-clarity`：三栏博客（Vite + Tailwind v4 + Preact + Alpine.js），参考 PJAX 导航、侧边栏 Widget、双评论系统。
- 参考主题 `../theme-spark`：电商主题（预构建），参考多语言系统、DaisyUI 多主题配色、动态首页 section 排序。
- 参考主题 `../theme-walker`：极简博客（Vite + Svelte 5 Web Components + Tailwind v3），参考 Svelte 自定义元素、点赞 Tracker API、View Transition API。
- 参考主题 `../theme-microimmersion-1.5.0`：沉浸式博客（预构建），参考 Thymeleaf macro 复用、REST API 客户端渲染、Annotation Setting 扩展字段。
- 参考主题 `../halo-theme-vapor`：极简博客（Vite + Tailwind v3 + Alpine.js + Less + Lit Web Components 子包），参考 TOC、搜索、友链/瞬间/图库等插件页面适配、压缩产物和可复用小型 Web Component；不要照搬其预构建 `templates/` 产物到本主题。
- 参考主题 `../theme-sky-blog-3`：macOS 桌面壳层博客（Vite + Tailwind v4 + Alpine.js + PJAX，多 app/widget 架构），参考桌面壳层、Dock/窗口协议、PJAX 页面生命周期、插件页面模块化、reload/smoke 验证脚本；只借鉴架构和验证思路，不要把 Hydro-Minim 改成桌面系统风格。
- 参考主题 `../Serenity-Grace`：完整预构建博客主题（多页面模板、亮暗模式、PJAX、Lenis、欢迎页、天气时钟、音乐/图库/项目/留言等页面），参考后台设置组织、页面类型覆盖、View Transition 式深浅色切换和丰富插件集成；视觉上不可套用其粉蓝高装饰风格。
- 旧目标名 `halo-theme-hydro-mini` 已废弃，不要继续使用。

## 必须遵守

- 使用 `halo-theme-dev` 技能或对应 Halo 主题文档约束开发。
- 只编辑 `src/`、`public/`、`theme.yaml`、`settings.yaml`、配置和文档源文件。
- 不要手动编辑 `templates/`，它由 `pnpm run build-only` 生成。
- 不要手动编辑 `dist/`，它由 `pnpm run build` 生成。
- 主题运行时不使用 React，不要重新引入 React/Radix/shadcn 运行时。
- 静态资源必须放在 `public/assets/` 或由 Vite 输出到 `templates/assets/`。

## 视觉不变量

- 保持原始原型的灰白背景、Space Mono、黑色细边线、轻颗粒、克制极简氛围。
- 保持 Hero 图片 reveal、导航收缩、文字扰动、卡片 3D hover、分类 accordion、Footer marquee 等体验。
- 深色模式也要保持“氢·简”的低饱和、细线框、轻质感，不要改成高对比霓虹或纯黑仪表盘风格。
- 修改视觉前优先对照 `../app/dist/index.html` 或原始 `../app` 源码，不要把主题改成通用博客模板风格。

## Halo 平台常用模式速查

更完整的 Halo 数据接入、Thymeleaf 规范、Annotation Setting 等说明见 [../AI-THEME-DEV-GUIDE.md](../AI-THEME-DEV-GUIDE.md)。

核心模式：

- Finder 对象：`postFinder`、`categoryFinder`、`tagFinder`、`menuFinder`、`pluginFinder` 等，模板中直接调用。
- 设置读取：`theme.config.<group>.<name>`，字段在 `settings.yaml` 中定义。
- 路由变量：首页 `posts`、文章 `post`、页面 `singlePage`、分类 `category`+`posts`、标签 `tag`+`posts`、归档 `archives`、作者 `author`。
- 上下篇：`postFinder.cursor(post.metadata.name)` → `{ previous, next }`。
- 缩略图：`thumbnail.gen(url, 's' | 'm' | 'l' | 'xl')`。
- 评论组件：`<halo:comment group="content.halo.run" kind="Post" name="..." />`。
- 搜索插件检查：`pluginFinder.available('PluginSearchWidget')`。
- Annotation 读取：`entity.metadata.annotations['key']`，key 来自 `annotation-setting.yaml`。

## 常用命令

```bash
pnpm install
pnpm run check
pnpm run build
```

## 当前关键交互

- Header：桌面和移动端都保留“顶部菜单 / 胶囊菜单”滚动切换。
- PC 胶囊：滚动后偏右，进入动画从左到右。
- 移动胶囊：滚动后右上角白色长胶囊，内部为「氢 / 搜索 / 深浅色 / 菜单」。
- 深浅色：默认模式来自 `settings.yaml`，访客可点 Header 图标切换，偏好写入 `localStorage.hydro-color-scheme`，切换时必须走主题内置圆形光幕过渡。
- Hero 图片：使用独立 motion 层处理鼠标移动，避免和 GSAP reveal/parallax 的 transform 互相覆盖。
- 主内容滚动倾斜：滚动时短暂 `rotateX`，滚动停止后必须复位并清理 transform，避免点击命中区域错位。

## 交付前检查

至少运行：

```bash
pnpm run check
pnpm run build
```

如果改了视觉或交互，需要在 Halo 实例中检查首页桌面端、移动端、文章详情页、分类/标签/归档页。

## Agent skills

### Issue tracker

Issues and PRDs are tracked in GitHub Issues for `liuyiwuqing/halo-theme-hydro-minim`; use the `gh` CLI from this repo. See `docs/agents/issue-tracker.md`.

### Triage labels

Use the default five-label triage vocabulary: `needs-triage`, `needs-info`, `ready-for-agent`, `ready-for-human`, `wontfix`. See `docs/agents/triage-labels.md`.

### Domain docs

This is a single-context Halo theme repo. Read `AGENTS.md`, `README.md`, `docs/ai-development-guide.md`, and `../AI-THEME-DEV-GUIDE.md`; `CONTEXT.md` and ADRs are currently absent. See `docs/agents/domain.md`.
