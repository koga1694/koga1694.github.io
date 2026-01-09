import rss from '@astrojs/rss';
import { getCollection } from 'astro:content';
import type { APIContext } from 'astro';

export async function GET(context: APIContext) {
  const posts = await getCollection('posts', ({ data }) => !data.draft);

  return rss({
    title: 'MLOps 엔지니어의 기술 블로그',
    description: 'PyTorch, Kubernetes, AWS를 활용한 MLOps 트러블슈팅 및 기술 블로그',
    site: context.site ?? 'https://yourusername.github.io',
    items: posts.map((post) => ({
      title: post.data.title,
      pubDate: post.data.pubDate,
      description: post.data.description,
      link: `/posts/${post.slug}/`,
      categories: post.data.tags,
    })),
    customData: `<language>ko-KR</language>`,
  });
}
