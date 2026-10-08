export const ARTICLE_STATUSES = [
  ['pitch', 'Pitch'],
  ['accepted', 'Accepted'],
  ['drafting', 'Drafting'],
  ['in_review', 'In Review'],
  ['approved', 'Approved'],
  ['published', 'Published'],
] as const

export interface ArticleData {
  title?: string
  review_status?: string
  abstract?: string
  assigned_editor?: string
  assigned_reviewers?: string | string[]
  active_author?: string
}

export interface EditorialArticle {
  path: string
  data: ArticleData
}

export function isArticleAssignedTo(article: EditorialArticle, username: string) {
  const { active_author, assigned_editor, assigned_reviewers } = article.data
  return active_author === username
    || assigned_editor === username
    || (Array.isArray(assigned_reviewers)
      ? assigned_reviewers.includes(username)
      : assigned_reviewers === username)
}
