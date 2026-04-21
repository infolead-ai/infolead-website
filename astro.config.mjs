import { defineConfig } from 'astro/config';

export default defineConfig({
  // ... 其他配置
  i18n: {
    defaultLocale: 'en',
    locales: ['en', 'zh'],
    routing: {
        prefixDefaultLocale: false // 英文作为主域名，中文加 /zh
    }
  },
});