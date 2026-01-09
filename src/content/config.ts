import { defineCollection, z } from 'astro:content';

// 기술 포스트 컬렉션 (트러블슈팅, 뉴스 큐레이팅)
const posts = defineCollection({
  type: 'content',
  schema: z.object({
    title: z.string(),
    description: z.string(),
    pubDate: z.coerce.date(),
    updatedDate: z.coerce.date().optional(),
    heroImage: z.string().optional(),
    tags: z.array(z.string()).default([]),
    category: z.enum(['troubleshooting', 'news', 'tutorial', 'review']).default('tutorial'),
    draft: z.boolean().default(false),
  }),
});

// 프로젝트/도구 컬렉션 (인터랙티브 위젯)
const projects = defineCollection({
  type: 'content',
  schema: z.object({
    title: z.string(),
    description: z.string(),
    pubDate: z.coerce.date(),
    updatedDate: z.coerce.date().optional(),
    heroImage: z.string().optional(),
    tags: z.array(z.string()).default([]),
    featured: z.boolean().default(false),
    demoUrl: z.string().optional(),
    sourceUrl: z.string().optional(),
  }),
});

export const collections = { posts, projects };
