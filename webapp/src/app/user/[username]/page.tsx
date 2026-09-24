import { clerkClient, User } from '@clerk/nextjs/server';
import { notFound } from 'next/navigation';
import fs from 'fs';
import path from 'path';
import matter from 'gray-matter';

// Helper to check if a user is in a field list
function hasUser(field: unknown, clerkUser: User): boolean {
  if (!field || !clerkUser) return false;
  if (Array.isArray(field)) {
    return field.some((u: { user?: { id?: string, username?: string }, id?: string, username?: string }) => {
      const userData = u?.user || u;
      if (!userData) return false;
      
      if (userData.id && userData.id === clerkUser.id) return true;
      return userData.username === clerkUser.username;
    });
  }
  return false;
}

export default async function UserProfilePage({ params }: { params: Promise<{ username: string }> }) {
  const { username } = await params;
  
  if (!username) {
    notFound();
  }
  
  const client = await clerkClient();
  let users: User[] = [];
  
  if (username.startsWith('user_')) {
    try {
      const user = await client.users.getUser(username);
      if (user) users = [user];
    } catch {
      // User not found by ID
    }
  } else {
    const response = await client.users.getUserList({ username: [username] });
    users = response.data || response;
  }
  
  if (!users || users.length === 0) {
    notFound();
  }
  
  const user = users[0];
  const name = `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.username || 'Unknown';
  
  // Read all markdown articles
  const articlesDir = path.join(process.cwd(), 'content/docs/articles');
  const contributedArticles: { id: string, title: string, roles: string[], slug: string, type: string }[] = [];
  
  try {
    if (fs.existsSync(articlesDir)) {
      const files = fs.readdirSync(articlesDir);
      for (const file of files) {
        if (file.endsWith('.md')) {
          const filePath = path.join(articlesDir, file);
          const fileContents = fs.readFileSync(filePath, 'utf8');
          const { data } = matter(fileContents);
          
          const roles: string[] = [];
          if (hasUser(data.authors, user)) roles.push('Author');
          if (hasUser(data.reviewers, user)) roles.push('Reviewer');
          if (hasUser(data.editors, user)) roles.push('Editor');
          
          if (roles.length > 0) {
            contributedArticles.push({
              id: data.id || file,
              title: data.title || file.replace('.md', ''),
              roles: roles,
              slug: file.replace('.md', ''),
              type: data.type
            });
          }
        }
      }
    }
  } catch (err) {
    console.error("Error reading articles:", err);
  }
  
  return (
    <div className="min-h-screen p-8 max-w-4xl mx-auto pt-12">
      <div className="flex flex-col md:flex-row md:items-center gap-8 mb-16 bg-card border rounded-2xl p-8 shadow-sm">
        {user.imageUrl ? (
          <img src={user.imageUrl} alt={name} className="w-32 h-32 md:w-40 md:h-40 rounded-full border-4 border-primary/20 shadow-md object-cover" />
        ) : (
          <div className="w-32 h-32 md:w-40 md:h-40 rounded-full bg-secondary text-secondary-foreground flex items-center justify-center text-4xl font-bold shadow-sm">
            {name.charAt(0).toUpperCase()}
          </div>
        )}
        <div className="flex-1">
          <h1 className="text-4xl md:text-5xl font-extrabold text-foreground tracking-tight">{name}</h1>
          <p className="text-xl text-muted-foreground mt-2 font-medium">@{user.username}</p>
          <div className="mt-4 flex gap-3">
            <span className="inline-flex items-center rounded-md bg-primary/10 px-2.5 py-0.5 text-sm font-medium text-primary">
              {contributedArticles.length} Contributions
            </span>
          </div>
        </div>
      </div>
      
      <div>
        <h2 className="text-2xl font-semibold mb-6 border-b pb-4 flex items-center gap-2">
          <svg className="w-6 h-6 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" /></svg>
          Article Contributions
        </h2>
        
        {contributedArticles.length === 0 ? (
          <div className="text-center py-12 bg-muted/30 rounded-xl border border-dashed">
            <p className="text-muted-foreground text-lg">No contributions found for this user.</p>
          </div>
        ) : (
          <div className="grid gap-5 md:grid-cols-2">
            {contributedArticles.map((article) => (
              <a 
                key={article.id}
                href={`https://www.thaioml.org/articles/${article.slug}`} 
                target="_blank" 
                rel="noopener noreferrer"
                className="group block p-6 border rounded-xl shadow-sm hover:shadow-md transition-all hover:-translate-y-1 bg-card hover:border-primary/50 text-card-foreground"
              >
                <div className="flex flex-wrap gap-2 mb-4">
                  {article.roles.map(role => (
                    <span key={role} className="px-2.5 py-1 bg-secondary text-secondary-foreground text-xs rounded-full font-semibold shadow-sm">
                      {role}
                    </span>
                  ))}
                  {article.type && (
                    <span className="px-2.5 py-1 border text-xs rounded-full text-muted-foreground uppercase tracking-wider font-medium">
                      {article.type}
                    </span>
                  )}
                </div>
                <h3 className="text-xl font-bold group-hover:text-primary transition-colors line-clamp-2">
                  {article.title}
                </h3>
              </a>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
