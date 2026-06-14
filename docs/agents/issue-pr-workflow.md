# Issue 到 PR 工作流

本仓库提供 `scripts/issue-pr.sh` 统一处理 “读取 issue → 创建工作分支 → 验证 → 提交 → 推送 → 创建 PR → 合并后自动关闭 issue” 的常规流程。

这套流程适合开发者和 AI agent 直接使用。它不会替你判断需求是否合理，也不会替你写代码；它只负责把已经确认要做的 issue 送进一条干净、可追踪、可合并的工程流水线。

## 前提

- 已安装并登录 GitHub CLI：`gh auth status` 应通过。
- 已安装依赖：`pnpm install`。
- 从仓库根目录执行命令。
- 开始新 issue 前，工作区必须干净。
- `templates/` 和 `dist/` 是生成产物，不要手工提交。

## 快速开始

推荐使用 `pnpm` 包装命令：

```bash
pnpm run issue-pr -- doctor
pnpm run issue-pr -- start 3 footer-menu
pnpm run issue-pr -- status 3
pnpm run issue-pr -- finish 3 "feat: allow custom footer menu" --yes
```

也可以直接运行脚本：

```bash
bash scripts/issue-pr.sh doctor
bash scripts/issue-pr.sh start 3 footer-menu
bash scripts/issue-pr.sh finish 3 "feat: allow custom footer menu" --yes
```

## 命令说明

### doctor

检查本地环境：

```bash
pnpm run issue-pr -- doctor
```

它会确认：

- 当前仓库路径。
- 当前分支。
- 默认分支。
- `origin` 远端。
- `gh` 登录状态。
- 工作区是否干净。

### start

从默认分支创建 issue 分支：

```bash
pnpm run issue-pr -- start <issue-number> [slug]
```

示例：

```bash
pnpm run issue-pr -- start 3 footer-menu
```

默认分支名：

```text
codex/issue-3-footer-menu
```

如果不传 `slug`，分支名会退化为：

```text
codex/issue-3
```

`start` 会：

- 读取 GitHub issue。
- 确认 issue 是 `OPEN` 状态。
- 检查工作区必须干净。
- `git fetch origin --prune`。
- 切到默认分支并 `git pull --ff-only`。
- 创建并切换到 `codex/issue-<num>-<slug>` 分支。

可选参数：

```bash
--base <branch>   指定基准分支
--dry-run         只打印将执行的写操作
--yes             非交互确认
--no-fetch        跳过 git fetch
```

### status

查看当前 issue 分支状态：

```bash
pnpm run issue-pr -- status
pnpm run issue-pr -- status 3
```

它会展示：

- 当前分支。
- 默认分支。
- 工作区状态。
- issue 标题、状态和链接。
- 当前分支是否已有 PR。

### finish

完成当前 issue 分支并创建 PR：

```bash
pnpm run issue-pr -- finish <issue-number> "<commit-and-pr-title>" --yes
```

示例：

```bash
pnpm run issue-pr -- finish 3 "feat: allow custom footer menu" --yes
```

如果当前分支名已经包含 `issue-<number>`，也可以省略 issue 编号：

```bash
pnpm run issue-pr -- finish "feat: allow custom footer menu" --yes
```

`finish` 会：

- 从参数或当前分支名推断 issue 编号。
- 默认执行 `pnpm run check`。
- 默认执行 `pnpm run build`。
- `git add -A` 暂存所有未忽略改动。
- 创建提交。
- 推送当前分支。
- 创建 PR。
- 在 PR body 中写入 `Closes #<issue-number>`。

可选参数：

```bash
--title <title>   指定提交和 PR 标题
--base <branch>   指定 PR 基准分支
--dry-run         只打印将执行的写操作
--yes             非交互确认
--no-checks       跳过 check/build
--no-push         只提交，不推送、不创建 PR
--draft           创建 Draft PR
```

## 自动关闭 issue 的条件

PR body 必须包含 GitHub 支持的关闭关键字，例如：

```text
Closes #3
Fixes #3
Resolves #3
```

脚本默认使用：

```text
Closes #<issue-number>
```

注意：创建 PR 不会立刻关闭 issue。只有 PR 合并进默认分支后，GitHub 才会自动关闭对应 issue。别看见 PR 开了就以为 issue 完事了，那叫饭刚下锅，不叫吃完了。

## 给 AI agent 的建议

AI agent 使用时推荐加 `--yes`，避免非交互终端卡住：

```bash
pnpm run issue-pr -- start 3 footer-menu --yes
pnpm run issue-pr -- finish 3 "feat: allow custom footer menu" --yes
```

如果只是检查计划，不想改写 Git 状态：

```bash
pnpm run issue-pr -- start 3 footer-menu --dry-run
pnpm run issue-pr -- finish 3 "feat: allow custom footer menu" --dry-run
```

如果已经手动验证过，不希望脚本重复跑检查：

```bash
pnpm run issue-pr -- finish 3 "feat: allow custom footer menu" --yes --no-checks
```

## 使用边界

- 不要在有未提交变更的工作区运行 `start`。
- 不要在错误分支上运行 `finish`。
- 不要依赖脚本替你判断变更范围，提交前仍要看 `git status` 和 `git diff`。
- `finish` 会默认 `git add -A`，所以临时文件别乱扔在仓库里。脚本不是保姆，锅里放啥它就给你炖啥。
