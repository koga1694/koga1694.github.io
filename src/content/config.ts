import { defineCollection, z } from 'astro:content';

const blogCollection = defineCollection({
  type: 'content',
  schema: z.object({
    title: z.string(),
    description: z.string(),
    publishDate: z.coerce.date(),
    updatedDate: z.coerce.date().optional(),
    tags: z.array(z.string()),
    category: z.enum(['troubleshooting', 'tutorial', 'news', 'opinion']),
    featured: z.boolean().default(false),
    draft: z.boolean().default(false),
    image: z
      .object({
        src: z.string(),
        alt: z.string(),
      })
      .optional(),
  }),
});

const projectCollection = defineCollection({
  type: 'content',
  schema: z.object({
    title: z.string(),
    description: z.string(),
    publishDate: z.coerce.date(),
    updatedDate: z.coerce.date().optional(),
    tags: z.array(z.string()),
    category: z.enum(['calculator', 'converter', 'game', 'visualization', 'tool']),
    featured: z.boolean().default(false),
    demoUrl: z.string().url().optional(),
    sourceUrl: z.string().url().optional(),
    image: z
      .object({
        src: z.string(),
        alt: z.string(),
      })
      .optional(),
    techStack: z.array(z.string()),
  }),
});

export const collections = {
  blog: blogCollection,
  projects: projectCollection,
};
