import { clearCommand } from './clear';
import { exitCommand } from './exit';
import { helpCommand } from './help';
import { compactCommand } from './compact';
import { costCommand } from './cost';
import { reloadCommand } from './reload';
import { commandRegistry } from './registry';

commandRegistry.register(clearCommand);
commandRegistry.register(exitCommand);
commandRegistry.register(helpCommand);
commandRegistry.register(compactCommand);
commandRegistry.register(costCommand);
commandRegistry.register(reloadCommand);
