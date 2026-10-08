"use server";

import { source } from '@/lib/source';
import fs from 'fs/promises';
import path from 'path';
import { redirect } from 'next/navigation';

export async function goToRandomArticle() {
  let targetUrl = '/';

  try {
    const articlePages = source.getPages().filter(page => page.url.startsWith('/articles/'));
    if (articlePages.length > 0) {
      const randomPage = articlePages[Math.floor(Math.random() * articlePages.length)];
      targetUrl = randomPage.url;
    } else {
      const articlesDir = path.join(process.cwd(), 'content', 'docs', 'articles');
      const files = await fs.readdir(articlesDir);
      const mdFiles = files
        .filter((file) => typeof file === 'string' && file.endsWith('.md'))
        .map(file => file.replace(/\.md$/, ''));

      if (mdFiles.length > 0) {
        const randomFile = mdFiles[Math.floor(Math.random() * mdFiles.length)];
        targetUrl = `/articles/${randomFile}`;
      }
    }
  } catch (error) {
    console.error("Failed to get random article:", error);
  }

  redirect(targetUrl);
}
