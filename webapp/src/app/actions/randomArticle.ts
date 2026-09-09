"use server";

import fs from 'fs/promises';
import path from 'path';
import { redirect } from 'next/navigation';

export async function goToRandomArticle() {
  const articlesDir = path.join(process.cwd(), '..', 'docs', 'docs', 'articles');
  
  let targetUrl = 'http://localhost:8000/';

  try {
    const files = await fs.readdir(articlesDir, { recursive: true });
    const mdFiles = files
      // filter out directories, only take strings ending with .md
      .filter((file) => typeof file === 'string' && file.endsWith('.md'))
      .map(file => {
        // Normalize path separators for URL
        const normalized = file.split(path.sep).join('/');
        // Remove .md extension
        return normalized.replace(/\.md$/, '');
      });

    if (mdFiles.length > 0) {
      const randomFile = mdFiles[Math.floor(Math.random() * mdFiles.length)];
      // The MkDocs site is served at http://localhost:8000
      targetUrl = `http://localhost:8000/articles/${randomFile}/`;
    }
  } catch (error) {
    console.error("Failed to read articles directory:", error);
  }
  
  redirect(targetUrl);
}
