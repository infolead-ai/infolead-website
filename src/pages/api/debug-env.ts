import type { APIRoute } from 'astro';

export const prerender = false;

export const GET: APIRoute = async () => {
  const processKeys = Object.keys(process.env ?? {})
    .filter((k) => k.includes('OPENROUTER') || k.includes('VERCEL') || k === 'NODE_ENV');
  const importMetaKeys = Object.keys((import.meta as any).env ?? {})
    .filter((k) => k.includes('OPENROUTER') || k.startsWith('VERCEL'));

  return new Response(
    JSON.stringify({
      processEnvHasKey: !!process.env.OPENROUTER_API_KEY,
      importMetaEnvHasKey: !!import.meta.env.OPENROUTER_API_KEY,
      processEnvKeys: processKeys,
      importMetaEnvKeys: importMetaKeys,
      vercelRegion: process.env.VERCEL_REGION,
      vercelEnv: process.env.VERCEL_ENV,
      gitSha: process.env.VERCEL_GIT_COMMIT_SHA,
    }, null, 2),
    { headers: { 'Content-Type': 'application/json' } }
  );
};
