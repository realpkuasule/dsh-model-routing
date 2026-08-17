// dsh-model-routing 动态插件（Host 半身）
//
// 用法：把本文件全文作为 cordis_define 的 code.host（纯 Host 包，无需审批）。
// 提供两个模型工具：
//   route_default_model_status —— 只读当前默认模型选择
//   route_default_model       —— 预览(dryRun) / 写入 agent-default-model 设置
//
// 依赖服务：agentDefaultModel（DeepSeek Harness web profile 默认已挂载）。
// 写入影响之后新建的会话；当前会话与已开会话不变。

return {
  apply(ctx) {
    const modelService = ctx.get('agentDefaultModel')
    if (modelService === undefined) return

    // 只取叶子字段，构造自有 JSON（不引用任何活对象）
    const cleanSelection = (s) => ({
      provider: s.provider,
      model: s.model,
      ...(s.reasoningEffort === undefined ? {} : { reasoningEffort: s.reasoningEffort }),
    })

    const statusTool = harness.defineTool({
      name: 'route_default_model_status',
      description: '读取 DeepSeek Harness 当前的默认模型选择（provider / model / reasoningEffort）。只读，不修改任何设置。',
      parameters: {},
      output: {
        schema: {
          type: 'object',
          additionalProperties: false,
          properties: {
            provider: { type: 'string' },
            model: { type: 'string' },
            reasoningEffort: { type: 'string' },
          },
        },
        render(args, value) {
          const text = '当前默认模型：`' + value.provider + '` / `' + value.model + '`' +
            (value.reasoningEffort === undefined ? '' : '，reasoningEffort: `' + value.reasoningEffort + '`')
          return [{ type: 'text', text }]
        },
      },
      execute: async () => cleanSelection(modelService.currentSelection()),
    })

    const setTool = harness.defineTool({
      name: 'route_default_model',
      description: '预览或写入 DeepSeek Harness 的默认模型设置（agent-default-model）。影响之后新建的会话，不改变当前会话。默认 dryRun=true 只预览；用户确认后传 dryRun:false 真正写入。',
      // 官方 ParameterSchemaSpec DSL（docs/cookbook/adding-a-tool.md）：属性级 required: true
      parameters: {
        model: {
          type: 'string',
          required: true,
          enum: ['deepseek-v4-pro', 'deepseek-v4-flash'],
          description: '目标默认模型 ID',
        },
        reasoningEffort: {
          type: 'string',
          description: '可选推理强度（如 low / medium / high / max）；省略则沿用当前值',
        },
        dryRun: {
          type: 'boolean',
          description: 'true 只预览不写入（默认 true）；false 真正写入',
        },
      },
      output: {
        schema: {
          type: 'object',
          additionalProperties: false,
          properties: {
            dryRun: { type: 'boolean' },
            written: { type: 'boolean' },
            previous: {
              type: 'object',
              additionalProperties: false,
              properties: {
                provider: { type: 'string' },
                model: { type: 'string' },
                reasoningEffort: { type: 'string' },
              },
            },
            current: {
              type: 'object',
              additionalProperties: false,
              properties: {
                provider: { type: 'string' },
                model: { type: 'string' },
                reasoningEffort: { type: 'string' },
              },
            },
            wouldWrite: {
              type: 'object',
              additionalProperties: false,
              properties: {
                provider: { type: 'string' },
                model: { type: 'string' },
                reasoningEffort: { type: 'string' },
              },
            },
          },
        },
        render(args, value) {
          const line = (s) => '`' + s.provider + '` / `' + s.model + '`' +
            (s.reasoningEffort === undefined ? '' : '（reasoningEffort: `' + s.reasoningEffort + '`）')
          const text = value.dryRun
            ? '预览（未写入）：\n- 当前默认：' + line(value.previous) + '\n- 将写入：' + line(value.wouldWrite) + '\n\n确认后再次调用并传 `dryRun: false`。'
            : '默认模型已写入：\n- 之前：' + line(value.previous) + '\n- 现在：' + line(value.current) + '\n\n影响范围：之后新建的会话（当前会话与已开会话不变）。'
          return [{ type: 'text', text }]
        },
      },
      // 官方 execute 契约（adding-a-tool.md）：尊重 exec.signal；本工具无长任务，仅做前置中止检查
      execute: async (args, exec) => {
        if (exec.signal.aborted) throw new Error('route_default_model aborted')
        const previous = cleanSelection(modelService.currentSelection())
        const next = {
          provider: previous.provider,
          model: args.model,
          reasoningEffort: args.reasoningEffort !== undefined ? args.reasoningEffort : previous.reasoningEffort,
        }
        if (next.reasoningEffort === undefined) delete next.reasoningEffort
        if (args.dryRun !== false) {
          return { dryRun: true, written: false, previous, current: previous, wouldWrite: next }
        }
        await modelService.saveSelection(next)
        const current = cleanSelection(modelService.currentSelection())
        return { dryRun: false, written: true, previous, current }
      },
    })

    ctx.effect(() => harness.registerTool(ctx, statusTool))
    ctx.effect(() => harness.registerTool(ctx, setTool))
  },
}
