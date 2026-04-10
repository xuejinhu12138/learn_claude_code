import { test, expect, describe } from 'bun:test';
import { parseFrontmatter } from '../skills/parser';
import { loadSkills } from '../skills/loader';
import { join } from 'path';
import { SkillSource } from '../types/skill';
import { type Skill } from '../types/skill';

describe('测试skill', () => {
    test('测试解析skill', async () => {
        // 测试 parseFrontmatter() - 正确解析 frontmatter
        // 测试 parseFrontmatter() - 没有 frontmatter 时的处理
        // 测试 loadDiskSkills() - 加载 skills 目录
        // 测试 loadDiskSkills() - 目录不存在时返回空数组
        
        // 1.测试parseFrontmatter
        let { metadata, content } = parseFrontmatter(join(process.cwd(), 'skills', 'debugging.md'));
        expect(metadata.name).toBe('Debugging Expert');
        expect(metadata.triggers as string[]).toEqual([ "debug", "bug", "error", "调试", "修复" ]);
        expect(metadata.description).toBe('系统化调试方法论');
        expect(content).toBe('# Debugging Skill\n\n你是一个系统调试专家。遇到 bug 时，遵循以下流程：\n\n## 调试步骤\n\n1. **重现问题**\n   - 确保能稳定复现\n   - 记录重现步骤\n\n2. **收集信息**\n   - 查看错误日志\n   - 检查堆栈跟踪\n   - 确认环境变量\n\n3. **隔离变量**\n   - 使用二分法缩小范围\n   - 逐步注释代码块\n\n4. **假设验证**\n   - 提出可能的原因\n   - 设计实验验证假设\n\n5. **根因分析**\n   - 找到真正的原因\n   - 不要止于表象\n\n## 常见检查项\n\n- [ ] 检查输入数据是否符合预期\n- [ ] 验证边界条件（null、空数组、极大值）\n- [ ] 考虑并发/竞态条件\n- [ ] 检查配置文件和环境变量');
    
        // 2.测试没有frontmatter时的处理
        try{
            ({ metadata, content } = parseFrontmatter(join(process.cwd(), 'src', 'tests', 'brokenSkill.md')));
        }catch (error: unknown) {
            if (error instanceof Error) {
                expect(error.message).toBe('File does not start with ---');
            }else{
                throw error;
            }
        }
       
    }); 

});