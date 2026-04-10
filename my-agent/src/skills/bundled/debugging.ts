import { type Command } from '../../commands/registry';

export const debuggingSkill: Command = {
    name: 'debug',
    type: 'prompt',  // 技能类型
    description: '系统化调试方法论',
    aliases: ['调试', 'bug'],
    
    whenToUse: '当用户遇到 bug、错误、异常行为，或需要调试代码时使用此技能',
    
    argumentHint: '<可选：问题描述>',
    
    async getPromptForCommand(args: string): Promise<string> {
        let prompt = `# Debugging Expert

你是一个系统调试专家。`;

        if (args) {
            prompt += `\n\n当前问题：${args}`;
        }

        prompt += `

## 调试步骤

1. **重现问题**
   - 确保能稳定复现
   - 记录重现步骤

2. **收集信息**
   - 查看错误日志
   - 检查堆栈跟踪
   - 确认环境变量

3. **隔离变量**
   - 使用二分法缩小范围
   - 逐步注释代码块

4. **假设验证**
   - 提出可能的原因
   - 设计实验验证假设

5. **根因分析**
   - 找到真正的原因
   - 不要止于表象

## 常见检查项

- [ ] 检查输入数据是否符合预期
- [ ] 验证边界条件（null、空数组、极大值）
- [ ] 考虑并发/竞态条件
- [ ] 检查配置文件和环境变量`;

        return prompt;
    },
};