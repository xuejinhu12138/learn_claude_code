import { clearCommand } from './clear';
import { exitCommand } from './exit';
import { helpCommand } from './help';
import { compactCommand } from './compact';
import { costCommand } from './cost';
import { reloadCommand } from './reload';
import { commandRegistry } from './registry';
import { loadCommand } from './load';
import { memoryCommand } from './memory';

// 导入技能
import { loadSkills } from '../skills/loader';


commandRegistry.register(clearCommand);
commandRegistry.register(exitCommand);
commandRegistry.register(helpCommand);
commandRegistry.register(compactCommand);
commandRegistry.register(costCommand);
commandRegistry.register(reloadCommand);
commandRegistry.register(loadCommand);
commandRegistry.register(memoryCommand);

// 注册技能命令
const skills = loadSkills({
    loadBundled: true,
    loadDisk: true,
});
for (const skill of skills) {
    commandRegistry.register(skill);
}
