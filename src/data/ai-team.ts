export type TeamMemberStatus = 'live' | 'coming-soon';
export type AgentRoute = 'castor' | 'lyra';

export interface TeamMember {
  id: AgentRoute;
  status: TeamMemberStatus;
  nameEn: string;
  nameZh: string;
  role: { en: string; zh: string };
  tagline: { en: string; zh: string };
  primaryColor: string;
  secondaryColor?: string;
  glowColor: string;
  portraitSrc: string;
  videoStreamUid?: string;
  posterImageSrc: string;
  hasSpectrum: boolean;
}

export const team: TeamMember[] = [
  {
    id: 'castor',
    status: 'live',
    nameEn: 'Castor',
    nameZh: '星语',
    role: {
      en: 'AI Technology Host',
      zh: 'AI 技术主理人',
    },
    tagline: {
      en: 'Explains the "how" with precision and clarity.',
      zh: '用清晰精准的方式，解释技术如何运转。',
    },
    primaryColor: '#00E5FF',
    glowColor: 'rgba(0, 229, 255, 0.4)',
    portraitSrc: '/castor-portrait.png',
    videoStreamUid: 'd16e68b2fbfeb0c080a1c55757b0b2da',
    posterImageSrc: '/castor-portrait.png',
    hasSpectrum: false,
  },
  {
    id: 'lyra',
    status: 'live',
    nameEn: 'Lyra',
    nameZh: '莱拉',
    role: {
      en: 'AI Brand Storyteller',
      zh: 'AI 品牌叙事官',
    },
    tagline: {
      en: 'Tells your story with warmth and resonance.',
      zh: '用温度与共鸣，讲述每一个业务的故事。',
    },
    primaryColor: '#A78BFA',
    secondaryColor: '#FFD700',
    glowColor: 'rgba(167, 139, 250, 0.4)',
    portraitSrc: '/lyra.png',
    videoStreamUid: undefined,
    posterImageSrc: '/lyra.png',
    hasSpectrum: true,
  },
];

export function getMember(id: AgentRoute): TeamMember {
  const m = team.find((t) => t.id === id);
  if (!m) throw new Error(`Unknown team member: ${id}`);
  return m;
}
