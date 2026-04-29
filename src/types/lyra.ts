export type Lang = 'en' | 'zh';

export type LyraStatus =
  | 'idle'
  | 'connecting'
  | 'listening'
  | 'thinking'
  | 'speaking'
  | 'error'
  | 'blocked';

export interface LyraMessage {
  id: string;
  role: 'user' | 'lyra';
  content: string;
  pending?: boolean;
}
