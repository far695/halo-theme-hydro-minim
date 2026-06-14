#!/usr/bin/env bash
set -euo pipefail

SCRIPT_NAME="${0##*/}"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
cd "$REPO_ROOT"

DRY_RUN=0
ASSUME_YES=0
NO_CHECKS=0
NO_PUSH=0
DRAFT=0
FETCH_REMOTE=1
BASE_BRANCH=""
TITLE=""
ISSUE_NUMBER=""
SLUG=""
COMMAND=""

usage() {
  cat <<'EOF'
用法:
  issue-pr.sh doctor
  issue-pr.sh start <issue-number> [slug] [--base <branch>] [--dry-run] [--yes] [--no-fetch]
  issue-pr.sh status [issue-number]
  issue-pr.sh finish [issue-number] [title] [--title <title>] [--base <branch>] [--dry-run] [--yes] [--no-checks] [--no-push] [--draft]

推荐流程:
  issue-pr.sh doctor
  issue-pr.sh start 3 footer-menu
  issue-pr.sh status 3
  issue-pr.sh finish 3 "feat: allow custom footer menu" --yes

说明:
  - start: 从默认分支创建 codex/issue-<num>-<slug> 分支，工作区必须干净。
  - finish: 默认会执行 pnpm run check 和 pnpm run build，随后自动 stage、commit、push 并创建 PR。
  - PR body 会自动带上 Closes #<num>，PR 合并后会自动关闭 issue。
  - 非交互环境请加 --yes。
EOF
}

die() {
  printf '错误: %s\n' "$*" >&2
  exit 1
}

warn() {
  printf '警告: %s\n' "$*" >&2
}

info() {
  printf '%s\n' "$*"
}

require_cmd() {
  command -v "$1" >/dev/null 2>&1 || die "缺少命令: $1"
}

run() {
  if ((DRY_RUN)); then
    printf '[dry-run] '
    printf '%q ' "$@"
    printf '\n'
    return 0
  fi
  "$@"
}

confirm() {
  local prompt="$1"
  if ((DRY_RUN)); then
    return 0
  fi
  if ((ASSUME_YES)); then
    return 0
  fi
  if [[ ! -t 0 ]]; then
    die "当前不是交互终端，请加 --yes"
  fi
  read -r -p "${prompt} [y/N] " reply
  [[ "$reply" =~ ^([yY]|[yY][eE][sS])$ ]]
}

current_branch() {
  git branch --show-current
}

worktree_is_clean() {
  [[ -z "$(git status --porcelain)" ]]
}

ensure_clean_worktree() {
  worktree_is_clean || die "工作区不干净，请先提交、清理或暂存变更后再开始新的 issue。"
}

normalize_slug() {
  printf '%s' "$1" \
    | tr '[:upper:]' '[:lower:]' \
    | sed -E 's/[^a-z0-9]+/-/g; s/-{2,}/-/g; s/^-+|-+$//g'
}

detect_default_branch() {
  local ref branch
  ref="$(git symbolic-ref --quiet --short refs/remotes/origin/HEAD 2>/dev/null || true)"
  if [[ -n "$ref" ]]; then
    printf '%s\n' "${ref#origin/}"
    return 0
  fi

  branch="$(git remote show origin 2>/dev/null | sed -n 's/.*HEAD branch: //p' | head -n 1 || true)"
  if [[ -n "$branch" ]]; then
    printf '%s\n' "$branch"
    return 0
  fi

  if git show-ref --verify --quiet refs/remotes/origin/master; then
    printf '%s\n' "master"
    return 0
  fi

  if git show-ref --verify --quiet refs/remotes/origin/main; then
    printf '%s\n' "main"
    return 0
  fi

  printf '%s\n' "master"
}

build_branch_name() {
  local issue_number="$1"
  local slug="${2:-}"
  local cleaned=""

  if [[ -n "$slug" ]]; then
    cleaned="$(normalize_slug "$slug")"
    [[ -n "$cleaned" ]] || cleaned="issue-${issue_number}"
    printf 'codex/issue-%s-%s\n' "$issue_number" "$cleaned"
    return 0
  fi

  printf 'codex/issue-%s\n' "$issue_number"
}

infer_issue_from_branch() {
  local branch="$1"
  if [[ "$branch" =~ issue-([0-9]+) ]]; then
    printf '%s\n' "${BASH_REMATCH[1]}"
    return 0
  fi
  return 1
}

issue_title() {
  gh issue view "$1" --json title --jq '.title'
}

issue_state() {
  gh issue view "$1" --json state --jq '.state'
}

issue_url() {
  gh issue view "$1" --json url --jq '.url'
}

pr_exists_for_branch() {
  local branch="$1"
  gh pr view --head "$branch" --json url --jq '.url' 2>/dev/null || true
}

print_issue_summary() {
  local issue_number="$1"
  local state title
  state="$(issue_state "$issue_number")"
  title="$(issue_title "$issue_number")"
  info "Issue: #${issue_number} [${state}] ${title}"
  info "Issue URL: $(issue_url "$issue_number")"
}

build_pr_body() {
  local issue_number="$1"
  local pr_title="$2"
  local issue_title_value="$3"
  local issue_url_value="$4"

  cat <<EOF
## Summary
- ${pr_title}

## Issue
- #${issue_number}
- ${issue_title_value}
- ${issue_url_value}

## Checks
$(if ((NO_CHECKS)); then
    printf '%s\n' "- Skipped via --no-checks"
  else
    printf '%s\n' "- pnpm run check"
    printf '%s\n' "- pnpm run build"
  fi)

Closes #${issue_number}
EOF
}

print_pr_summary() {
  local branch="$1"
  local pr_url
  pr_url="$(pr_exists_for_branch "$branch")"
  if [[ -z "$pr_url" ]]; then
    info "PR: 未找到"
    return 0
  fi

  info "PR: $(gh pr view --head "$branch" --json number,title,state --jq '"#\(.number) [\(.state)] \(.title)"' 2>/dev/null)"
  info "PR URL: $pr_url"
}

print_worktree_summary() {
  if worktree_is_clean; then
    info "工作区: 干净"
  else
    info "工作区: 有未提交变更"
    git status --short
  fi
}

cmd_doctor() {
  require_cmd git
  require_cmd gh
  require_cmd pnpm

  info "仓库: $REPO_ROOT"
  info "当前分支: $(current_branch)"
  info "默认分支: $(detect_default_branch)"
  info "远端 origin: $(git remote get-url origin 2>/dev/null || printf '未配置')"
  gh auth status >/dev/null 2>&1 || die "gh 未登录或授权失效，请先运行 gh auth login"
  info "GitHub CLI: 已登录"
  print_worktree_summary
}

cmd_start() {
  local issue_number="$1"
  local slug="${2:-}"

  require_cmd git
  require_cmd gh

  [[ "$issue_number" =~ ^[0-9]+$ ]] || die "issue 编号必须是数字"
  ensure_clean_worktree

  if ((FETCH_REMOTE)); then
    run git fetch origin --prune
  fi

  local base_branch branch_name state title url
  base_branch="${BASE_BRANCH:-$(detect_default_branch)}"
  title="$(issue_title "$issue_number")"
  state="$(issue_state "$issue_number")"
  url="$(issue_url "$issue_number")"

  [[ "$state" == "OPEN" ]] || die "issue #${issue_number} 当前状态是 ${state}，不是 OPEN"

  branch_name="$(build_branch_name "$issue_number" "$slug")"

  info "Issue: #${issue_number} ${title}"
  info "Issue URL: ${url}"
  info "基准分支: ${base_branch}"
  info "目标分支: ${branch_name}"

  confirm "创建并切换到该分支？" || die "已取消"

  if git show-ref --verify --quiet "refs/heads/${branch_name}"; then
    run git switch "$branch_name"
  else
    run git switch "$base_branch"
    run git pull --ff-only origin "$base_branch"
    run git switch -c "$branch_name" "$base_branch"
  fi
}

cmd_status() {
  local issue_number="${1:-}"
  local branch

  require_cmd git
  require_cmd gh

  branch="$(current_branch)"
  info "当前分支: ${branch:-<detached>}"
  info "默认分支: $(detect_default_branch)"
  print_worktree_summary

  if [[ -z "$issue_number" ]]; then
    issue_number="$(infer_issue_from_branch "$branch" 2>/dev/null || true)"
  fi

  if [[ -n "$issue_number" ]]; then
    print_issue_summary "$issue_number"
  else
    warn "无法从分支名推断 issue 编号，也未手动提供。"
  fi

  print_pr_summary "$branch"
}

cmd_finish() {
  local issue_number="${1:-}"
  local branch
  local issue_title_value issue_state_value issue_url_value pr_url body

  require_cmd git
  require_cmd gh
  require_cmd pnpm

  branch="$(current_branch)"
  [[ -n "$branch" ]] || die "当前处于 detached HEAD，请切到 issue 分支后再 finish"

  if [[ -z "$issue_number" ]]; then
    issue_number="$(infer_issue_from_branch "$branch" 2>/dev/null || true)"
  fi
  [[ -n "$issue_number" ]] || die "无法从分支名推断 issue 编号，请显式传入 issue 编号"
  [[ "$issue_number" =~ ^[0-9]+$ ]] || die "issue 编号必须是数字"

  issue_title_value="$(issue_title "$issue_number")"
  issue_state_value="$(issue_state "$issue_number")"
  issue_url_value="$(issue_url "$issue_number")"

  if [[ -z "$TITLE" ]]; then
    TITLE="$issue_title_value"
  fi

  [[ -n "$TITLE" ]] || die "PR 标题不能为空"

  if [[ -z "$BASE_BRANCH" ]]; then
    BASE_BRANCH="$(detect_default_branch)"
  fi

  info "当前分支: ${branch}"
  info "Issue: #${issue_number} [${issue_state_value}] ${issue_title_value}"
  info "PR 标题: ${TITLE}"
  info "基准分支: ${BASE_BRANCH}"

  if ((NO_CHECKS == 0)); then
    run pnpm run check
    run pnpm run build
  else
    warn "已跳过检查"
  fi

  info "即将 stage 当前工作区的全部未忽略改动。"
  print_worktree_summary
  confirm "继续执行 stage / commit / push / 创建 PR？" || die "已取消"

  body="$(build_pr_body "$issue_number" "$TITLE" "$issue_title_value" "$issue_url_value")"

  if ((DRY_RUN)); then
    run git add -A
    run git commit -m "$TITLE"
    if ((NO_PUSH == 0)); then
      run git push -u origin "$branch"
      if ((DRAFT)); then
        run gh pr create --draft --base "$BASE_BRANCH" --head "$branch" --title "$TITLE" --body "$body"
      else
        run gh pr create --base "$BASE_BRANCH" --head "$branch" --title "$TITLE" --body "$body"
      fi
    else
      warn "已跳过推送和 PR 创建"
    fi
    exit 0
  fi

  run git add -A
  if git diff --cached --quiet; then
    die "没有可提交的变更"
  fi

  info "已暂存文件:"
  git diff --cached --name-only
  info "Diffstat:"
  git diff --cached --stat

  run git commit -m "$TITLE"

  if ((NO_PUSH == 0)); then
    run git push -u origin "$branch"
  else
    warn "已跳过推送"
  fi

  pr_url="$(pr_exists_for_branch "$branch")"
  if [[ -n "$pr_url" ]]; then
    info "PR 已存在: $pr_url"
    exit 0
  fi

  if ((NO_PUSH)); then
    warn "未推送分支，跳过 PR 创建"
    exit 0
  fi

  if ((DRAFT)); then
    run gh pr create --draft --base "$BASE_BRANCH" --head "$branch" --title "$TITLE" --body "$body"
  else
    run gh pr create --base "$BASE_BRANCH" --head "$branch" --title "$TITLE" --body "$body"
  fi
}

if [[ "${1:-}" == "--" ]]; then
  shift
fi

if [[ $# -lt 1 ]]; then
  usage
  exit 1
fi

COMMAND="$1"
shift

case "$COMMAND" in
  doctor)
    while [[ $# -gt 0 ]]; do
      case "$1" in
        --dry-run)
          DRY_RUN=1
          shift
          ;;
        --yes)
          ASSUME_YES=1
          shift
          ;;
        --help|-h)
          usage
          exit 0
          ;;
        *)
          die "doctor 不支持参数: $1"
          ;;
      esac
    done
    cmd_doctor
    ;;
  start)
    [[ $# -ge 1 ]] || die "start 需要 issue 编号"
    ISSUE_NUMBER="$1"
    shift
    if [[ $# -gt 0 && ${1:0:1} != "-" ]]; then
      SLUG="$1"
      shift
    fi
    while [[ $# -gt 0 ]]; do
      case "$1" in
        --base)
          [[ $# -ge 2 ]] || die "--base 后需要分支名"
          BASE_BRANCH="$2"
          shift 2
          ;;
        --dry-run)
          DRY_RUN=1
          shift
          ;;
        --yes)
          ASSUME_YES=1
          shift
          ;;
        --no-fetch)
          FETCH_REMOTE=0
          shift
          ;;
        --help|-h)
          usage
          exit 0
          ;;
        *)
          die "未知参数: $1"
          ;;
      esac
    done
    cmd_start "$ISSUE_NUMBER" "$SLUG"
    ;;
  status)
    while [[ $# -gt 0 ]]; do
      case "$1" in
        --help|-h)
          usage
          exit 0
          ;;
        *)
          if [[ -n "$ISSUE_NUMBER" ]]; then
            die "status 只接受一个可选 issue 编号"
          fi
          ISSUE_NUMBER="$1"
          shift
          ;;
      esac
    done
    cmd_status "$ISSUE_NUMBER"
    ;;
  finish)
    if [[ $# -gt 0 && ${1:0:1} != "-" ]]; then
      if [[ "$1" =~ ^[0-9]+$ ]]; then
        ISSUE_NUMBER="$1"
      else
        TITLE="$1"
      fi
      shift
    fi
    if [[ $# -gt 0 && ${1:0:1} != "-" ]]; then
      if [[ -n "$TITLE" ]]; then
        die "多余参数: $1"
      fi
      TITLE="$1"
      shift
    fi
    while [[ $# -gt 0 ]]; do
      case "$1" in
        --title)
          [[ $# -ge 2 ]] || die "--title 后需要标题文本"
          TITLE="$2"
          shift 2
          ;;
        --base)
          [[ $# -ge 2 ]] || die "--base 后需要分支名"
          BASE_BRANCH="$2"
          shift 2
          ;;
        --dry-run)
          DRY_RUN=1
          shift
          ;;
        --yes)
          ASSUME_YES=1
          shift
          ;;
        --no-checks)
          NO_CHECKS=1
          shift
          ;;
        --no-push)
          NO_PUSH=1
          shift
          ;;
        --draft)
          DRAFT=1
          shift
          ;;
        --help|-h)
          usage
          exit 0
          ;;
        *)
          die "未知参数: $1"
          ;;
      esac
    done
    cmd_finish "$ISSUE_NUMBER"
    ;;
  help|-h|--help)
    usage
    ;;
  *)
    die "未知命令: $COMMAND"
    ;;
esac
