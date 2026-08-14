---
name: dsh-model-routing
description: DeepSeek Harness 模型与模式选路 Skill。当用户要开始新任务并询问"该用哪个模型/模式"、要求"帮我选路/路由"、使用 /route 或 /model-route 命令、或任务开始前需要决定用 deepseek-v4-pro 还是 deepseek-v4-flash 以及标准模式/PTC 模式/极简模式/创造模式四种模式时使用。按任务特质输出中文结构化推荐报告；用户确认后可调用随用随启的动态插件把默认模型写入 agent-default-model 设置（影响之后新建的会话），并给出工作流/子代理级的模型分派规则。
---

# DeepSeek Harness 模型与模式选路

本 skill 为 DeepSeek Harness 的模型使用建立路由规则：根据任务特质自动判定 **模型（deepseek-v4-pro / deepseek-v4-flash）** 与 **模式（标准 / PTC / 极简 / 创造）**，输出推荐，并在用户确认后把默认模型写入设置。

## 硬约束（先记住，不要违反）

1. **正在运行的会话无法切换自己的模型或模式**——两者都在会话启动时定死（模型由 agent-default-model 设置在 Agent 启动时读取；模式即 agent preset，按会话在创建时选定）。
2. 路由的生效点只有三个：
   - **会话启动前**：用户在 Web GUI 新建会话时选择（本 skill 给出明确指引）；
   - **默认设置**：写入 agent-default-model，影响**之后新建**的会话；
   - **工作流分派**：workflow 的 `agent(prompt, opts)` 支持 provider/model 覆盖。
3. provider 固定为 `deepseek-official`；模型二选一：`deepseek-v4-pro`（强、贵、深度推理）与 `deepseek-v4-flash`（快、省、浅推理）。
4. 极简模式只有持久 bash + str_replace_editor 两个工具，且**不一定带 skill 工具**——选路流程本身要在有 skill 工具的模式（标准/PTC/创造）里跑。
5. 用户明确指定时永远听用户的，本 skill 只做建议。

## 选路流程

1. 读任务描述，提取任务特质（按下方判定矩阵逐条对照）。
2. 同时给出**模型**与**模式**两个维度的判定。
3. 按「输出模板」输出中文结构化报告。
4. 用户确认后按场景执行：
   - 说"写入默认设置"→ 按「写入默认设置」章节 define/run 动态插件，先 dryRun 预览，用户确认后 `dryRun: false` 真实写入；
   - 只是开新会话 → 明确告诉用户在 GUI 中选什么（模型 ID + 模式中文名）；
   - 写 workflow 脚本 → 按「工作流分派」章节的 pickModel 规则写。
5. 把判定理由留在报告里，便于下次复用与校正。

## 模型判定矩阵

### → deepseek-v4-flash（快、便宜、浅推理）

- 简单问答、知识查询、名词解释
- 翻译、润色、摘要（浅层加工）
- 格式转换、批量机械文本处理（日志清洗、CSV/JSON 转换、改名）
- 单文件小修改：修 typo、补注释、加日志、调文案
- 信息检索与汇总（无复杂综合判断）
- 低风险、结果可立即验证的任务

### → deepseek-v4-pro（强、贵、深度推理）

- 多步 / 多文件编程：新功能、架构设计、重构、跨模块改动
- 疑难 bug 排查与深度调试
- 长链推理：方案设计、规划、决策分析、技术评审
- 高难度数学 / 算法 / 逻辑
- 创意要求高的写作与设计
- 高风险操作规划、安全敏感改动

### 信号冲突 / 无法判定

- 一律 `deepseek-v4-pro`（宁贵勿错）
- 需要先读代码才能判断复杂度的任务 → 按 pro 预估，读完再降级

## 模式判定映射

| 任务特质 | 模式 | preset id |
| --- | --- | --- |
| 常规编码、多文件、重构、测试 | 标准模式 | `standard` |
| 用一个 TypeScript 程序编排多步操作、批量文件改造、流水线式任务 | PTC 模式 | `code` |
| 单文件小改、快速修 bug、终端操作密集的小任务 | 极简模式 | `minimal` |
| 创建/修改 agent preset、Cordis 插件、harness 自身调试 | 创造模式 | `cordis` |

- 无法判定 → 标准模式。
- 模式与模型正交，默认搭配：**极简 + flash，其余 + pro**；允许拆开（如"标准 + flash"跑快任务、"极简 + pro"做强推理的小改动），给出推荐时要说明组合理由。

## 输出模板

```markdown
## 选路结果
- **任务**：<一句话概括>
- **任务特质**：<2–4 个关键词，如"机械编辑 / 低风险 / 可立即验证">
- **推荐模型**：`deepseek-v4-flash`（<理由>）
- **推荐模式**：极简模式（<理由>）
- **替代方案**：`deepseek-v4-pro` + 标准模式（何时升级：<触发条件>）
- **成本/延迟预估**：flash 预计更省更快（定性说明即可，不必报数）
- **下一步**：在 Web GUI 新建会话时选「deepseek-v4-flash + 极简模式」；或回复"写入默认设置"，我把默认模型写入 agent-default-model
```

## 写入默认设置（随用随启的动态插件）

插件源码在本 skill 目录的 `plugin-route-model.js`，提供两个工具：`route_default_model_status`（读当前默认）与 `route_default_model`（预览/写入）。

操作步骤：

1. 用 read 读 `plugin-route-model.js` 全文。
2. `cordis_define`：plugin kind = `new`，idPrefix 用 `mdrtg`，name 如 `route-model-tools`，把文件全文作为 `code.host`（纯 Host 包，不需要 code.client，无需审批）。
3. `cordis_run`：mode = `run`。返回 `starting` 后等系统报最终结果。
4. 调用 `route_default_model_status` 读当前默认值。
5. 调用 `route_default_model`（dryRun 默认 true）预览；用户确认后传 `dryRun: false` 真正写入。
6. 用完 `cordis_stop`（保留版本可复用）或 `cordis_undefine`（彻底删除）清理。

影响范围与注意事项：

- 写入只改变**之后新建会话**的默认模型；当前会话、已开会话不变。
- 动态插件随进程存在：进程重启后消失，按上述步骤重建即可（源码一直在 skill 目录里）。
- 插件调用的是 `agentDefaultModel` 服务的 `saveSelection()`（走 settings 服务），不要直接改 `~/.dsh/settings.yaml`。
- `reasoningEffort` 可选（如 low / medium / high / max）；省略则沿用当前值。默认搭配建议：pro → `max`，flash → `low`。

## 工作流 / 子代理分派

- workflow 的 `agent(prompt, opts)` 支持 provider/model 覆盖：provider 传 `'deepseek-official'`，model 按下方规则。
- **叶子任务**（检索、提取、清洗、格式化、小改）→ flash；**核心/编排/高难任务** → pro。
- 普通 subagent 工具没有 model 参数 → 只在选路报告里给建议，不强制。
- 写 workflow 脚本时加入 helper：

```js
function pickModel(task) {
  const flashHints = ['格式化', '翻译', '摘要', '润色', '重命名', '小改', '简单', '检索', '提取', '清洗', 'typo', '注释', '日志', '批量', '转换']
  const proHints = ['架构', '重构', '调试', '排查', '设计', '规划', '算法', '数学', '推理', '多文件', '安全', '评审', '优化', '跨模块']
  const t = String(task || '')
  const flash = flashHints.filter((k) => t.includes(k)).length
  const pro = proHints.filter((k) => t.includes(k)).length
  if (pro > 0 || flash === 0) return 'deepseek-v4-pro'
  return 'deepseek-v4-flash'
}
// 用法：agent(prompt, { provider: 'deepseek-official', model: pickModel(item), label: '...' })
```

## 升级与兜底

- flash 结果不满意 → 建议换 pro 重跑（新会话），并把该任务特质记入 pro 侧。
- 拿不准 → pro + 标准模式。
- 用户明确指定 → 无条件服从，不输出选路报告。

## 维护

- 改判定矩阵 → 改本文件与 README 的规则说明。
- 模型 ID 变化 → 同步改 `plugin-route-model.js` 里的 enum 与本文件。
