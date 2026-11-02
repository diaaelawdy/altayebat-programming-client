import type { Post } from '@/shared/types';

export interface TreeNode extends Post {
  children: TreeNode[];
  /** Username of the parent author — shown when nesting is flattened. */
  parentAuthor: string | null;
}

/** Builds a reply tree from the flat, createdAt-ordered list the API returns. */
export function buildTree(rootId: string, rootAuthor: string | null, replies: Post[]): TreeNode[] {
  const byId = new Map<string, TreeNode>();
  const top: TreeNode[] = [];
  const authors = new Map<string, string | null>([[rootId, rootAuthor]]);
  for (const r of replies) authors.set(r.id, r.author?.username ?? null);
  for (const r of replies)
    byId.set(r.id, { ...r, children: [], parentAuthor: authors.get(r.parentId ?? '') ?? null });
  for (const node of byId.values()) {
    const parent = node.parentId && byId.get(node.parentId);
    if (parent) parent.children.push(node);
    else top.push(node);
  }
  return top;
}
