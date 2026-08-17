# Topic: dsh-plugin — 随用随启的动态插件实现

本仓库的插件部分是一个 **Host 半身的动态 Cordis 插件**（`plugin-route-model.js`），随用随启：需要时 define/run，用完即停/删，源码始终在本仓库。它提供两个模型工具，按官方 [deepseek-harness](https://github.com/deepseek-ai/deepseek-harness) 的插件规范实现。

## 提供的能力

| 工具 | 作用 |
| --- | --- |
| `route_default_model_status` | 只读当前默认模型选择（provider / model / reasoningEffort） |
| `route_default_model` | 预览（dryRun，默认）/ 写入 `agent-default-model` 设置；影响之后新建的会话 |

依赖服务：`agentDefaultModel`（web profile host 组合默认挂载，`ctx.get` 读取并做 undefined 检查）。

## 与官方规范的对应关系

对照 [docs/cookbook/adding-a-tool.md](https://github.com/deepseek-ai/deepseek-harness/blob/master/docs/cookbook/adding-a-tool.md) 与 [docs/cookbook/extension-cookbook.md](https://github.com/deepseek-ai/deepseek-harness/blob/master/docs/cookbook/extension-cookbook.md)：

| 官方规范要求 | 本实现 |
| --- | --- |
| 工具注册到 `ctx.tools`，经 `defineTool`（typed helper） | `harness.defineTool`（动态插件沙箱版）→ `harness.registerTool(ctx, tool)` |
| `parameters` 使用 ParameterSchemaSpec DSL，**属性级 `required: true`** | 属性级写法：`model: { type: 'string', required: true, enum: [...] }` |
| `output.schema` 使用 ValueSchemaSpec，object 节点显式 `additionalProperties: true \| false` | 全部 object 节点显式 `additionalProperties: false` |
| `output.render(args, value)` 返回**内容块数组**（如 `[{type:'text', text}]`） | 两个工具的 render 均返回内容块数组 |
| `execute` 只返回**一个规范的 JSON 值**，不返回内容块、不写散文式 id | 返回 `{dryRun, written, previous, current, wouldWrite?}` |
| `execute(args, exec)` 尊重 `exec.signal`，取消在途工作 | 无长任务，入口做 `exec.signal.aborted` 前置中止检查 |
| 注册是 effect 化的：插件 fiber 卸载即注销 | `ctx.effect(() => harness.registerTool(ctx, tool))` |
| 值校验：显式 object 节点必须声明 additionalProperties（动态沙箱在 define 时强校验） | 已按沙箱报错修正（初版缺 `required`/`additionalProperties` 被拒） |
| 不序列化活数据，只取叶子字段 | `cleanSelection()` 只构造 provider/model/reasoningEffort |

## 已知取舍

- 未使用 `presentationMeta` / `presentCall` / `presentResult`：两个工具都是设置类操作，回退到通用卡片即可（官方说明 optional）。
- 未使用 `ctx.jobs.start` 后台运行：本工具无长任务，前台执行即可。
- 写设置走 `agentDefaultModel.saveSelection()`（settings 服务），**不直接编辑** `~/.dsh/settings.yaml`。

## 使用流程（SKILL.md 有完整版）

1. read 本文件全文 → `cordis_define`（kind=new，idPrefix `mdrtg`，code.host = 全文，纯 Host 包无需审批）
2. `cordis_run`（mode=run）
3. 调 `route_default_model_status` 读当前值 → 调 `route_default_model`（dryRun 预览）→ 用户确认后 `dryRun:false` 写入
4. 用完 `cordis_stop` 或 `cordis_undefine` 清理

> 动态插件随进程存在：DSH 重启后消失，按上述步骤重建即可。

## 相关官方文档

- [Tool authoring reference（工具规范，本实现的主要依据）](https://github.com/deepseek-ai/deepseek-harness/blob/master/docs/cookbook/adding-a-tool.md)
- [Extension plugin shapes（扩展插件形态总览）](https://github.com/deepseek-ai/deepseek-harness/blob/master/docs/cookbook/extension-cookbook.md)
- [Cordis tutorial: your first plugin](https://github.com/deepseek-ai/deepseek-harness/blob/master/docs/cordis-tutorial/01-first-plugin.md)
- [capability-seams（能力归属：host / preset / plugin）](https://github.com/deepseek-ai/deepseek-harness/blob/master/docs/capability-seams.md)
