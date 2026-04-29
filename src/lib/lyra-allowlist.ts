const PRODUCTION_HOSTS = new Set([
  'infolead.ca',
  'www.infolead.ca',
  'demo.infolead.ca',
]);

export function isAllowedHost(hostname: string, isDev: boolean): boolean {
  if (PRODUCTION_HOSTS.has(hostname)) return true;
  if (isDev && hostname === 'localhost') return true;
  return false;
}
