# dsh-model-routing

DeepSeek Harness 模型与模式选路 Skill：按任务特质自动判定用 `deepseek-v4-pro` 还是 `deepseek-v4-flash`，以及标准 / PTC / 极简 / 创造四种模式，输出中文结构化推荐，并可随用随启动态插件把默认模型写入 `agent-default-model` 设置。

## 目录结构

```
model-routing/
├── SKILL.md               # skill 主体：判定矩阵、选路流程、输出模板、插件用法
├── plugin-route-model.js  # 动态 Cordis 插件源码（Host 半身，随用随启）
├── presets/
│   └── routing-standard/  # 用户预设「标准模式·自动选路」：persona 强制首轮选路
├── docs/
│   └── dsh-plugin.md      # Topic：插件实现与官方 deepseek-harness 规范的对照
├── sync-skills            # 一键同步（GitHub ×2 + mbp/m2）
└── README.md              # 本文件
```

## 文档主题（Topics）

| Topic | 文件 | 内容 |
| --- | --- | --- |
| dsh-model-routing | `SKILL.md` | 选路规则、判定矩阵、输出模板、写入默认设置、工作流分派 |
| dsh-plugin | `docs/dsh-plugin.md` | 动态插件实现与官方 deepseek-harness 插件规范的逐条对照 |
| routing-standard preset | `presets/README.md` | 用户预设的安装、行为与修改方法 |

## 安装（全局可用）

软链到用户级 skills 根目录（DSH 的 skill-filesystem 会从 `~/.agents/skills` 发现）：

```bash
mkdir -p ~/.agents/skills
ln -sfn "$PWD" ~/.agents/skills/dsh-model-routing
```

新开会话后生效（当前已运行会话的 skill 目录不会热刷新）。

## 使用方式

1. **（推荐）用「标准模式·自动选路」预设开会话**：该预设（见 `presets/README.md`）在 persona 里强制首轮选路——第一条任务消息即自动加载本 skill 输出选路报告，闲聊消息静默。安装后 Web GUI 的预设选择器里会出现「标准模式·自动选路」，无需重启。
2. **其它预设下的触发**：skill description 要求"首轮必须加载"（尽力而为，模型可能忽略）；中途说"该用哪个模型/模式"、`/route`、`/model-route` 可靠触发。
3. **得到选路报告**：中文结构化推荐（模型 + 模式 + 理由 + 当前会话是否匹配 + 下一步）。
4. **自动写默认设置**：在报告后回复"写入默认设置"，skill 会 define/run 内嵌插件（`plugin-route-model.js`），先 dryRun 预览，确认后写入。影响之后新建的会话。
5. **工作流分派**：写 workflow 脚本时按 SKILL.md 里的 `pickModel()` 规则给 `agent()` 传 provider/model 覆盖。

## 核心规则速览

| 任务特质 | 模型 | 模式 |
| --- | --- | --- |
| 问答/翻译/摘要/格式转换/机械编辑/单文件小改 | flash | 极简（或标准） |
| 常规编码/多文件/重构/测试 | pro | 标准 |
| TypeScript 程序编排多步操作/批量改造 | pro | PTC |
| preset/Cordis 插件/harness 调试 | pro | 创造 |
| 拿不准 | pro | 标准 |

详细判定矩阵、冲突处理、输出模板见 `SKILL.md`。

## 约束

- 正在运行的会话无法中途切换模型/模式（DSH 硬约束）；路由只影响新会话、默认设置与工作流分派。
- 动态插件随进程存在，重启后按 SKILL.md 步骤重建即可，源码始终在本仓库。

## 同步到在线仓库

```bash
git init
git add -A && git commit -m "feat: dsh-model-routing skill v1"
git remote add origin <你的仓库地址>
git push -u origin main
```

## 一键同步（GitHub + mbp + m2）

仓库自带 `sync-skills` 脚本，一次执行完成：

1. 推送到 GitHub 两个远端（`realpkuasule` / `xiaozhiaixue`）
2. 确保本机 `~/.agents/skills/dsh-model-routing` 软链存在
3. rsync 到 `mbp`（/Users/morgan）与 `m2`（/Users/gitlab）的 `~/.agents/skills/dsh-model-routing`

```bash
./sync-skills            # 完整同步
./sync-skills --dry-run  # 只打印动作不执行
```

- 全程走 SSH（`git@github.com` + 本机 `mpm_key`），不落凭据
- 有未提交改动时会先提示：git push 只推送已提交内容，rsync 则同步工作区现状
- 远端机器路径/账号变了，改脚本顶部的 `SSH_TARGETS` 数组即可
