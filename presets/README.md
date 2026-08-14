# routing-standard preset（标准模式·自动选路）

用户级 DSH agent preset：标准模式全部能力 + 会话第一轮自动选路。

## 它做什么

在 persona（系统提示）里注入最高优先级的会话启动路由指令：

- 第一条用户消息带任务 → **先调用 `dsh-model-routing` skill 执行选路**，输出推荐报告后再干活
- 寒暄/闲聊/反问 → 静默跳过，不打扰
- 中途问"该用哪个模型/模式"、说"帮我选路"、/route → 同样触发

## 为什么需要它

skill 目录的 description 只是给模型的"建议"，模型可能忽略（实测在 standard 预设中未触发）。persona 指令在系统提示里**每轮可见、第一轮必见**，是可靠的强制触发点。

## 安装（新机器）

在目标机器上（DSH 已安装、`~/.dsh` 存在）：

```bash
mkdir -p ~/.dsh/.agent-presets/routing-standard
cp presets/routing-standard/agent.cordis.yml presets/routing-standard/preset.yml \
   ~/.dsh/.agent-presets/routing-standard/
```

DSH 的预设名单是每次实时读取的：复制完成后，Web GUI 新建会话的预设选择器里就会出现「标准模式·自动选路」，无需重启。

## 修改

- 改选路指令 → 编辑 `agent.cordis.yml` 里 persona 的 text
- 改显示名/描述 → 编辑 `preset.yml`
- 改完在本机生效（picker 实时读），其他机器重新 cp 或 pull + sync-skills
