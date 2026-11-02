/** API DTOs. Mirrors server/src/serializers. */
import type { Permission } from './permissions';

/** The one role shown next to a username. */
export interface DisplayRole {
  name: string;
  kind: 'founder' | 'staff' | 'member';
}

export interface UserRef {
  id: string;
  username: string;
  reputation: number;
  role: DisplayRole | null;
  avatar: string | null;
}

/** Sender shown as the site itself (a team reply). */
export interface SystemRef {
  system: true;
}

export type Restriction =
  | {
      type: 'banned' | 'disabled';
      reason: string;
      link: string;
      at: string | null;
      byIp: boolean;
      canMessage: boolean;
    }
  | { type: 'vpn' };

/** disabled: read-only. banned: only the ban screen, and every IP they used is blocked. */
export type UserStatus = 'active' | 'disabled' | 'banned';
export interface UserBan {
  reason: string;
  link: string;
  at: string;
  canMessage: boolean;
}

/** Who approved or rejected an item; present only with `moderation.view_reviewer`. */
export interface ReviewInfo {
  by: UserRef | null;
  at: string | null;
}

export interface Palette {
  bg?: string;
  surface?: string;
  fg?: string;
}
export interface Preferences {
  locale: 'en' | 'ar';
  mode: 'dark' | 'light' | 'system';
  accent: string | null;
  dark: Palette;
  light: Palette;
}

export interface Me {
  id: string;
  username: string | null;
  reputation: number;
  role: DisplayRole | null;
  avatar: string | null;
  restriction: Restriction | null;
  unreadMessages: number;
  badges: { key: string; awardedAt: string | null }[];
  streak: { current: number; longest: number; lastDay: string | null };
  stats: Record<string, number>;
  preferences: Preferences;
  permissions: Permission[];
  isFounder: boolean;
  unreadNotifications: number;
  joinedAt: string | null;
}
export interface MeResponse {
  user: Me | null;
}

export interface Rating {
  count: number;
  overall: number;
  experience: number;
  difficulty: number;
  communication: number;
  distribution: number[];
}
export interface Company {
  id: string;
  name: string;
  nameAr: string;
  slug: string;
  logoUrl: string;
  website: string;
  linkedinUrl: string;
  industry: string;
  description: string;
  questionCount: number;
  commentCount: number;
  lastUpdatedAt: string | null;
  status: string;
  rating: Rating;
  studied?: number | null;
  createdBy?: UserRef | null;
  review?: ReviewInfo;
}
/** A suggested company, as its author and the review queue see it. */
export interface CompanySubmission extends Company {
  status: 'pending' | 'approved' | 'rejected';
  rejectionReason: string;
  createdAt: string | null;
  createdBy: UserRef | null;
  own?: boolean;
  canReview?: boolean;
}
export interface CompanyMini {
  slug: string;
  name: string;
  nameAr?: string;
  logoUrl?: string;
}

export type Difficulty = 'Easy' | 'Medium' | 'Hard';
/** A question's tags, by facet (display order: see shared/constants.ts). */
export interface QuestionTagFields {
  field: string;
  specializations: string[];
  levels: string[];
  stage: string;
  difficulty: Difficulty;
  topics: string[];
}
/** The same while a form is being filled in: nothing picked yet is `''`. */
export type QuestionTagDraft = Omit<QuestionTagFields, 'difficulty'> & {
  difficulty: Difficulty | '';
};
export interface QuestionSummary extends QuestionTagFields {
  id: string;
  companyId: string;
  slug: string;
  title: string;
  timesAsked: number;
  lastAskedAt: string | null;
  publishedAt: string | null;
  answerCount: number;
  bookmarked?: boolean;
  studied?: boolean;
  company?: CompanyMini | null;
}
export interface QuestionDetail extends QuestionSummary {
  problem: string;
  problemHtml: string;
  examples: { input: string; output: string; explanation: string }[];
  constraints: string[];
  lookFor: string;
  lookForHtml: string;
  followUps: string[];
  author: UserRef | null;
  company: Company & CompanyMini;
  review?: ReviewInfo;
  askedByMe: boolean;
  prev: { slug: string; title: string } | null;
  next: { slug: string; title: string } | null;
}
export interface Submission extends Omit<
  QuestionDetail,
  'company' | 'prev' | 'next' | 'askedByMe'
> {
  status: 'pending' | 'approved' | 'rejected';
  rejectionReason: string;
  createdAt: string;
  company: (CompanyMini & Partial<Company>) | null;
  /** Review queue only: the viewer wrote it, and whether they may still review it. */
  own?: boolean;
  canReview?: boolean;
}

export interface Post {
  id: string;
  parentId: string | null;
  rootId: string | null;
  depth: number;
  author: UserRef | null;
  body: string;
  bodyHtml: string;
  score: number;
  replyCount: number;
  myVote: number;
  deleted: boolean;
  createdAt: string;
  edited: boolean;
}
export interface RootPost extends Post {
  replies: Post[];
}

export interface Review {
  id: string;
  author: UserRef;
  overall: number;
  experience: number;
  difficulty: number;
  communication: number;
  outcome: string;
  specialization: string;
  level: string;
  title: string;
  body: string;
  score: number;
  myVote: number;
  month: string | null;
}

export interface HistoryEntry {
  id: string;
  action: string;
  targetType: 'answer' | 'comment' | 'question' | 'company' | 'user' | 'role';
  label: string;
  link: string;
  detail: string;
  before: string | null;
  after: string | null;
  undo: 'done' | 'undone' | 'dropped' | null;
  actor: UserRef;
  createdAt: string;
}
export interface HistoryStacks {
  undo: { items: HistoryEntry[]; total: number };
  redo: { items: HistoryEntry[]; total: number };
}

export interface Page<T> {
  items: T[];
  nextCursor: string | null;
}

export interface Notification {
  id: string;
  type: string;
  data: Record<string, string | undefined>;
  read: boolean;
  createdAt: string;
}

export interface Role {
  id: string;
  name: string;
  description: string;
  permissions: Permission[];
  isSystem: boolean;
  isDefault: boolean;
  isFounder: boolean;
  userCount: number;
}

export interface PrivateUser {
  id: string;
  username: string | null;
  /** Every user has exactly one role. */
  role: { id: string; name: string } | null;
  status: UserStatus;
  ban: UserBan | null;
  avatar: string | null;
  reputation: number;
  stats: Record<string, number>;
  createdAt: string;
}

export interface AnswerActivity {
  id: string;
  excerpt: string;
  score: number;
  isReply: boolean;
  createdAt: string;
  question: QuestionSummary | null;
}

export interface PublicProfile {
  id: string;
  username: string;
  reputation: number;
  role: DisplayRole | null;
  avatar: string | null;
  badges: { key: string; awardedAt: string | null }[];
  stats: { questionsApproved: number; answers: number };
  joinedAt: string | null;
  counts: { questions: number; answers: number; feedback: number; companies: number };
}
export interface FeedbackActivity {
  id: string;
  excerpt: string;
  score: number;
  isReply: boolean;
  createdAt: string | null;
  company: CompanyMini;
}

export interface ConversationSummary {
  id: string;
  kind: 'team' | 'direct';
  subject: string;
  status: 'open' | 'answered';
  lastMessageAt: string;
  unread: boolean;
  with: UserRef | SystemRef;
  answeredBy: UserRef | null;
}
export interface ChatMessage {
  id: string;
  body: string;
  createdAt: string;
  mine: boolean;
  asTeam: boolean;
  author: UserRef | SystemRef;
}
export interface Conversation extends ConversationSummary {
  canReplyAsTeam: boolean;
  messages: ChatMessage[];
}
export const isSystem = (a: UserRef | SystemRef | null | undefined): a is SystemRef =>
  Boolean(a && 'system' in a);
