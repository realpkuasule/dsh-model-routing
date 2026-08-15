// routing-gate — 「标准模式·自动选路」的工具级守卫。
//
// 把「第一条任务消息自动选路」从 persona 建议升级为确定性约束：
// 在模型调用 skill(dsh-model-routing) 完成选路之前，本会话的其余
// 一切工具调用都会被拒绝，并把原因反馈给模型。
// 子代理（delegationDepth>0）不拦截，避免工作流内部噪音。
export default {
  name: 'routing-gate',
  apply(ctx) {
    const routed = new WeakSet()

    const reason = [
      '本会话启用了「标准模式·自动选路」硬约束：执行任何其他工具之前，',
      '你必须先调用 skill 工具（参数 name: "dsh-model-routing"）完成模型/模式选路。',
      '请立即调用该 skill；选路完成后其余工具自动放行。',
    ].join('')

    ctx.on('tools/pre-execute', (exec, next) => {
      try {
        const agent = exec === undefined ? undefined : exec.agent
        if (agent === undefined) return next()
        const session = agent.session
        if (
          session !== undefined &&
          session.header !== undefined &&
          session.header.delegationDepth !== undefined &&
          session.header.delegationDepth > 0
        ) return next()
        if (routed.has(agent)) return next()
        if (exec.name === 'skill') {
          const args = exec.arguments
          const skillName = args === undefined || args === null || typeof args !== 'object' ? undefined : args.name
          if (skillName === 'dsh-model-routing') {
            routed.add(agent)
            return next()
          }
        }
        return { kind: 'deny', reason }
      } catch (e) {
        return next()
      }
    })
  },
}
