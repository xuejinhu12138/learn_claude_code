function isDangerousCommand(command: string): boolean {
    if (command.includes('rm') || command.includes('sudo') || command.includes('shutdown') || command.includes('reboot') || command.includes('halt') || command.includes('poweroff') || command.includes('exit') || command.includes('quit') || command.includes('logout') || command.includes('kill')) {
        return true;
    }
    return false;
}

export { isDangerousCommand };