import type { Lang } from '../types/lyra';

export const LYRA_COPY = {
  en: {
    statusIdle: 'Tap to talk',
    statusConnecting: 'Connecting…',
    statusListening: 'Listening',
    statusThinking: 'Lyra is thinking…',
    statusSpeaking: 'Speaking',
    statusError: 'Connection issue',
    statusBlocked: 'Demo unavailable',
    micStart: 'Start voice',
    micStop: 'End call',
    inputPlaceholder: 'Or type a message…',
    sendLabel: 'Send',
    fallbackToText: 'Continue with text',
    permissionDenied: 'Microphone unavailable. You can keep chatting by typing.',
    wechatNotice: 'Voice is unavailable in WeChat. Type to chat with Lyra below.',
    blockedTitle: 'Demo not available here',
    blockedBody: 'This live demo only runs on infolead.ca.',
    missingConfig: 'Demo is not configured for this environment.',
    footer: 'Built by InfoLead AI · Toronto, Canada',
    youLabel: 'You',
    lyraLabel: 'Lyra',
    emptyPrompt: 'Start whenever you’re ready — speak or type below.',
  },
  zh: {
    statusIdle: '点击说话',
    statusConnecting: '连接中…',
    statusListening: '倾听中',
    statusThinking: 'Lyra 思考中…',
    statusSpeaking: '正在朗读',
    statusError: '连接异常',
    statusBlocked: '演示不可用',
    micStart: '开始通话',
    micStop: '结束通话',
    inputPlaceholder: '或输入文字…',
    sendLabel: '发送',
    fallbackToText: '改用文字模式',
    permissionDenied: '麦克风不可用。您可以继续以文字方式对话。',
    wechatNotice: '语音功能在微信中不可用。请在下方输入文字与 Lyra 对话。',
    blockedTitle: '演示在此处不可用',
    blockedBody: '此实时演示仅在 infolead.ca 上提供。',
    missingConfig: '当前环境未配置演示。',
    footer: '由 InfoLead AI 在加拿大多伦多打造',
    youLabel: '您',
    lyraLabel: 'Lyra',
    emptyPrompt: '随时开始对话——说话或输入文字。',
  },
} as const;

export type LyraCopy = (typeof LYRA_COPY)[Lang];

export function detectWeChat(): boolean {
  if (typeof navigator === 'undefined') return false;
  return /MicroMessenger/i.test(navigator.userAgent || '');
}
