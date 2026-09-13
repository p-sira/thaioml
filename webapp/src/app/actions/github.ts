'use server';

import { Octokit } from 'octokit';
import { currentUser } from '@clerk/nextjs/server';

const getOctokit = () => {
  const token = process.env.THAIOML_BOT;
  if (!token) {
    throw new Error('THAIOML_BOT token is not set');
  }
  return new Octokit({ auth: token });
};

const OWNER = 'p-sira';
const REPO = 'thaioml';

export async function saveMarkdownFile(filePath: string, content: string, message: string) {
  const user = await currentUser();
  if (!user) {
    throw new Error('Unauthorized');
  }

  const octokit = getOctokit();

  // 1. Check if 'editorial' branch exists
  let editorialBranchExists = false;
  try {
    await octokit.rest.repos.getBranch({ owner: OWNER, repo: REPO, branch: 'editorial' });
    editorialBranchExists = true;
  } catch (error: unknown) {
    if (typeof error === 'object' && error !== null && 'status' in error && (error as { status: number }).status === 404) {
      editorialBranchExists = false;
    } else {
      throw error;
    }
  }

  // 2. If it doesn't exist, create it from main
  if (!editorialBranchExists) {
    const { data: mainRef } = await octokit.rest.git.getRef({
      owner: OWNER,
      repo: REPO,
      ref: 'heads/main'
    });
    
    await octokit.rest.git.createRef({
      owner: OWNER,
      repo: REPO,
      ref: 'refs/heads/editorial',
      sha: mainRef.object.sha
    });
  } else {
    // 3. If it does exist, attempt to merge main into editorial
    try {
      await octokit.rest.repos.merge({
        owner: OWNER,
        repo: REPO,
        base: 'editorial',
        head: 'main',
        commit_message: 'Merge main into editorial'
      });
    } catch (error: unknown) {
      // 409 means merge conflict. 
      if (typeof error === 'object' && error !== null && 'status' in error && (error as { status: number }).status === 409) {
        throw new Error('Merge conflict when updating editorial branch from main. Please resolve manually on GitHub.');
      }
      // Any other error we might just log or throw
      console.warn('Merge main into editorial failed (it might be already up to date):', error);
    }
  }

  // 4. Try to get the current file on the editorial branch to get its SHA (required for updating)
  let sha: string | undefined = undefined;
  try {
    const { data } = await octokit.rest.repos.getContent({
      owner: OWNER,
      repo: REPO,
      path: filePath,
      ref: 'editorial',
    });

    if (!Array.isArray(data) && data.type === 'file') {
      sha = data.sha;
    }
  } catch (error: unknown) {
    if (typeof error === 'object' && error !== null && 'status' in error && (error as { status: number }).status !== 404) {
      throw error;
    }
    // File doesn't exist, which is fine (we're creating it)
  }

  // 5. Commit the file to the editorial branch
  const base64Content = Buffer.from(content).toString('base64');
  
  await octokit.rest.repos.createOrUpdateFileContents({
    owner: OWNER,
    repo: REPO,
    path: filePath,
    message: message || `Update ${filePath}`,
    content: base64Content,
    sha,
    branch: 'editorial',
    committer: {
      name: user.firstName ? `${user.firstName} ${user.lastName || ''}`.trim() : 'ThaiOML Studio',
      email: user.emailAddresses[0]?.emailAddress || 'studio@thaioml.org',
    },
    author: {
      name: user.firstName ? `${user.firstName} ${user.lastName || ''}`.trim() : 'ThaiOML Studio',
      email: user.emailAddresses[0]?.emailAddress || 'studio@thaioml.org',
    },
  });
  return { success: true };
}

export async function getMarkdownFile(filePath: string) {
  const user = await currentUser();
  if (!user) {
    throw new Error('Unauthorized');
  }

  const octokit = getOctokit();

  // Try fetching from editorial branch first
  try {
    const { data } = await octokit.rest.repos.getContent({
      owner: OWNER,
      repo: REPO,
      path: filePath,
      ref: 'editorial'
    });

    if (!Array.isArray(data) && data.type === 'file') {
      const content = Buffer.from(data.content, 'base64').toString('utf-8');
      return { content };
    }
  } catch (error: unknown) {
    if (typeof error === 'object' && error !== null && 'status' in error && (error as { status: number }).status !== 404) {
      throw error;
    }
    // If not found or editorial doesn't exist, fall through to fetching from main
  }

  // Fallback to fetching from main (default branch)
  try {
    const { data } = await octokit.rest.repos.getContent({
      owner: OWNER,
      repo: REPO,
      path: filePath,
    });

    if (Array.isArray(data) || data.type !== 'file') {
      throw new Error('Path is not a file');
    }

    const content = Buffer.from(data.content, 'base64').toString('utf-8');
    return { content };
  } catch (error: unknown) {
    if (typeof error === 'object' && error !== null && 'status' in error && (error as { status: number }).status === 404) {
      return { content: null }; // File not found on either branch
    }
    throw error;
  }
}

export async function listMarkdownFiles(directoryPath: string) {
  const user = await currentUser();
  if (!user) {
    throw new Error('Unauthorized');
  }

  const octokit = getOctokit();

  // Try fetching from editorial branch first
  try {
    const { data } = await octokit.rest.repos.getContent({
      owner: OWNER,
      repo: REPO,
      path: directoryPath,
      ref: 'editorial'
    });

    if (Array.isArray(data)) {
      return { files: data.filter(f => f.type === 'file' && f.name.endsWith('.md')) };
    }
  } catch (error: unknown) {
    if (typeof error === 'object' && error !== null && 'status' in error && (error as { status: number }).status !== 404) {
      throw error;
    }
  }

  // Fallback to fetching from main
  try {
    const { data } = await octokit.rest.repos.getContent({
      owner: OWNER,
      repo: REPO,
      path: directoryPath,
    });

    if (Array.isArray(data)) {
      return { files: data.filter(f => f.type === 'file' && f.name.endsWith('.md')) };
    }
    return { files: [] };
  } catch (error: unknown) {
    if (typeof error === 'object' && error !== null && 'status' in error && (error as { status: number }).status === 404) {
      return { files: [] };
    }
    throw error;
  }
}

export async function moveMarkdownFile(oldPath: string, newPath: string, content: string, message: string) {
  const user = await currentUser();
  if (!user) {
    throw new Error('Unauthorized');
  }

  const octokit = getOctokit();
  
  // 1. Determine the publish branch name based on the file name
  const filename = newPath.split('/').pop()?.replace('.md', '') || 'article';
  const publishBranch = `publish/${filename}`;
  const publishRef = `refs/heads/${publishBranch}`;

  // 2. Check if publish branch exists
  let publishBranchExists = false;
  try {
    await octokit.rest.repos.getBranch({ owner: OWNER, repo: REPO, branch: publishBranch });
    publishBranchExists = true;
  } catch (error: unknown) {
    if (typeof error === 'object' && error !== null && 'status' in error && (error as { status: number }).status === 404) {
      publishBranchExists = false;
    } else {
      throw error;
    }
  }

  // 3. If it doesn't exist, create it from main
  if (!publishBranchExists) {
    const { data: mainRef } = await octokit.rest.git.getRef({
      owner: OWNER,
      repo: REPO,
      ref: 'heads/main'
    });
    
    await octokit.rest.git.createRef({
      owner: OWNER,
      repo: REPO,
      ref: publishRef,
      sha: mainRef.object.sha
    });
  }

  // 4. Get SHA if file already exists on publish branch
  let sha: string | undefined = undefined;
  try {
    const { data } = await octokit.rest.repos.getContent({
      owner: OWNER,
      repo: REPO,
      path: newPath,
      ref: publishBranch,
    });
    if (!Array.isArray(data) && data.type === 'file') {
      sha = data.sha;
    }
  } catch (error: unknown) {
    if (typeof error === 'object' && error !== null && 'status' in error && (error as { status: number }).status !== 404) {
      throw error;
    }
  }

  // 5. Commit the new file to the publish branch
  const base64Content = Buffer.from(content).toString('base64');
  await octokit.rest.repos.createOrUpdateFileContents({
    owner: OWNER,
    repo: REPO,
    path: newPath,
    message: message || `Publish ${newPath}`,
    content: base64Content,
    sha,
    branch: publishBranch,
    committer: {
      name: user.firstName ? `${user.firstName} ${user.lastName || ''}`.trim() : 'ThaiOML Studio',
      email: user.emailAddresses[0]?.emailAddress || 'studio@thaioml.org',
    },
    author: {
      name: user.firstName ? `${user.firstName} ${user.lastName || ''}`.trim() : 'ThaiOML Studio',
      email: user.emailAddresses[0]?.emailAddress || 'studio@thaioml.org',
    },
  });

  // 6. Delete the old file from the editorial branch
  try {
    const { data } = await octokit.rest.repos.getContent({
      owner: OWNER,
      repo: REPO,
      path: oldPath,
      ref: 'editorial',
    });

    if (!Array.isArray(data) && data.type === 'file') {
      await octokit.rest.repos.deleteFile({
        owner: OWNER,
        repo: REPO,
        path: oldPath,
        message: `Delete ${oldPath} (published to ${newPath})`,
        sha: data.sha,
        branch: 'editorial',
        committer: {
          name: user.firstName ? `${user.firstName} ${user.lastName || ''}`.trim() : 'ThaiOML Studio',
          email: user.emailAddresses[0]?.emailAddress || 'studio@thaioml.org',
        },
        author: {
          name: user.firstName ? `${user.firstName} ${user.lastName || ''}`.trim() : 'ThaiOML Studio',
          email: user.emailAddresses[0]?.emailAddress || 'studio@thaioml.org',
        },
      });
    }
  } catch (error: unknown) {
    if (typeof error === 'object' && error !== null && 'status' in error && (error as { status: number }).status !== 404) {
      throw error;
    }
  }

  // 7. Check if an open Pull Request exists from publish branch to main
  const { data: pulls } = await octokit.rest.pulls.list({
    owner: OWNER,
    repo: REPO,
    state: 'open',
    head: `${OWNER}:${publishBranch}`,
    base: 'main'
  });

  if (pulls.length === 0) {
    const { data: pr } = await octokit.rest.pulls.create({
      owner: OWNER,
      repo: REPO,
      title: `Publish: ${filename}`,
      head: publishBranch,
      base: 'main',
      body: `Automated PR for publishing article \`${filename}\` from ThaiOML Studio.`
    });

    await octokit.rest.pulls.requestReviewers({
      owner: OWNER,
      repo: REPO,
      pull_number: pr.number,
      reviewers: ['p-sira']
    });
  }

  return { success: true };
}
