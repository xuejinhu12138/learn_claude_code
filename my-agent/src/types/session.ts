export type SessionEntry = 
  | UserEntry
  | AssistantEntry
  | ToolUseEntry
  | ToolResultEntry;

export interface UserEntry {
  type: 'user';
  content: string;
  uuid: string;
  timestamp: string;
  parentUuid?: string;
}

export interface AssistantEntry {
  type: 'assistant';
  content: string;
  uuid: string;
  timestamp: string;
  parentUuid?: string;
}

export interface ToolUseEntry {
  type: 'tool_use';
  tool: string;
  input: Record<string, unknown>;
  tool_use_id: string;
  uuid: string;
  timestamp: string;
  parentUuid?: string;
}

export interface ToolResultEntry {
  type: 'tool_result';
  tool_use_id: string;
  output: string;
  is_error?: boolean;
  uuid: string;
  timestamp: string;
  parentUuid?: string;
}

/**
 * 会话元数据
 */
export interface SessionMetadata {
  sessionId: string;
  createdAt: string;
  lastUpdatedAt: string;
  messageCount: number;
  title?: string;
}