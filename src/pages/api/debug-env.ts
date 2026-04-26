import type { APIRoute } from 'astro';

export const prerender = false;

export const GET: APIRoute = async () => {
  const allProcessKeys = Object.keys(process.env ?? {});
  const userKeys = allProcessKeys.filter(
    (k) => !k.startsWith('VERCEL') && !['NODE_ENV', 'PATH', 'HOME', 'PWD', 'TZ', 'LANG'].includes(k)
  );

  return new Response(
    JSON.stringify({
      hasOpenrouter: !!process.env.OPENROUTER_API_KEY,
      openrouterLen: (process.env.OPENROUTER_API_KEY ?? '').length,
      hasTestVar: !!process.env.INFOLEAD_TEST_VAR,
      testVarValue: process.env.INFOLEAD_TEST_VAR ?? null,
      totalProcessEnvKeys: allProcessKeys.length,
      userDefinedKeys: userKeys,
      gitSha: process.env.VERCEL_GIT_COMMIT_SHA,
      vercelEnv: process.env.VERCEL_ENV,
    }, null, 2),
    { headers: { 'Content-Type': 'application/json' } }
  );
};
