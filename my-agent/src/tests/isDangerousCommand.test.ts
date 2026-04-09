import { test, expect } from 'bun:test';
import { isDangerousCommand } from '../utils/isDangerousCommand';

test('识别危险命令 rm', () => {
  expect(isDangerousCommand('rm -rf /')).toBe(true);
});

test('识别危险命令 kill', () => {
  expect(isDangerousCommand('kill -9 1234')).toBe(true);
});

test('安全命令 ls', () => {
  expect(isDangerousCommand('ls -la')).toBe(false);
});

test('安全命令 echo', () => {
  expect(isDangerousCommand('echo hello')).toBe(false);
});