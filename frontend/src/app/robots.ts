import type { MetadataRoute } from 'next';
import { SITE_URL } from '@/config/seo';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: [
          '/api/',
          '/dashboard/',
          '/patients/',
          '/schedule/',
          '/activity-log/',
          '/settings/',
          '/food-scan/',
          '/offline/',
          '/400/',
          '/401/',
          '/402/',
          '/403/',
          '/405/',
          '/408/',
          '/409/',
          '/410/',
          '/422/',
          '/429/',
          '/500/',
          '/502/',
          '/503/',
          '/504/',
        ],
      },
      {
        userAgent: 'Googlebot',
        allow: '/',
        disallow: [
          '/api/',
          '/dashboard/',
          '/patients/',
          '/schedule/',
          '/activity-log/',
          '/settings/',
          '/food-scan/',
          '/offline/',
        ],
      },
    ],
    sitemap: `${SITE_URL}/sitemap.xml`,
    host: SITE_URL,
  };
}
