import { describe, expect, it } from 'vitest';
import { screen } from '@testing-library/react';
import { QuestionPage } from '@/features/questions/QuestionPage';
import { CompanyPage } from '@/features/companies/CompanyPage';
import { HomePage } from '@/features/home/HomePage';
import { SettingsPage } from '@/features/settings/SettingsPage';
import { makeMe, renderApp } from './utils';

const company = {
  id: 'c1',
  name: 'noon',
  nameAr: 'نون',
  slug: 'noon',
  logoUrl: '',
  website: '',
  industry: 'E-commerce',
  description: '',
  questionCount: 48,
  commentCount: 2,
  lastUpdatedAt: '2026-10-20T00:00:00Z',
  status: 'approved',
  rating: {
    count: 1,
    overall: 4,
    experience: 5,
    difficulty: 3,
    communication: 4,
    distribution: [0, 0, 0, 1, 0],
  },
  studied: 3,
};
const summary = {
  id: 'q1',
  companyId: 'c1',
  slug: 'cart-merge',
  title: 'Cart Merge',
  field: 'Software',
  specializations: ['Backend'],
  levels: ['Intern', 'Junior'],
  stage: 'Phone Screen',
  difficulty: 'Easy',
  topics: ['Problem Solving (DSA)'],
  timesAsked: 3,
  lastAskedAt: '2026-04-16T12:00:00Z',
  publishedAt: '2026-03-27T12:00:00Z',
  answerCount: 0,
};
const detail = {
  ...summary,
  problem: 'x',
  problemHtml: '<p>Merge the carts.</p>',
  examples: [{ input: 'a', output: 'b', explanation: 'c' }],
  constraints: ['n ≤ 10^4'],
  lookFor: '',
  lookForHtml: '<p>A single Map.</p>',
  followUps: ['Concurrency?'],
  author: null,
  company,
  askedByMe: false,
  prev: null,
  next: { slug: 'subarrays', title: 'Subarrays With K Odd Numbers' },
  bookmarked: false,
  studied: false,
};

describe('page smoke renders', () => {
  it('question page shows the full write-up', async () => {
    renderApp(<QuestionPage />, {
      me: makeMe(['answers.create', 'answers.vote', 'questions.create']),
      path: '/c/noon/cart-merge',
      route: '/c/:slug/:qslug',
      routes: {
        '/companies/noon/questions/cart-merge': detail,
        '/companies/noon': company,
        '/questions/q1/answers': { items: [], nextCursor: null },
        '/questions/q1/related': { items: [] },
        '/me/lists': { items: [] },
      },
    });
    expect(await screen.findByRole('heading', { name: 'Cart Merge' })).toBeInTheDocument();
    for (const s of [
      'Merge the carts.',
      'What interviewers look for',
      'Likely follow-ups',
      'Concurrency?',
      'Your solution',
      'I was asked this too',
      'Mark studied',
    ]) {
      expect(screen.getByText(s)).toBeInTheDocument();
    }
    // The standard tag line.
    for (const s of ['Software', 'Backend', 'Intern / Junior', 'Problem Solving (DSA)']) {
      expect(screen.getByText(s)).toBeInTheDocument();
    }
    expect(screen.queryByRole('button', { name: 'Edit tags' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /run/i })).not.toBeInTheDocument();
  });

  it('company page renders header and tabs', async () => {
    renderApp(<CompanyPage />, {
      me: makeMe([]),
      path: '/c/noon',
      route: '/c/:slug',
      routes: {
        '/companies/noon': company,
        '/companies/noon/questions': { items: [summary], nextCursor: null },
      },
    });
    expect(await screen.findByRole('heading', { name: 'noon' })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /Ratings/ })).toBeInTheDocument();
    expect(screen.getByText('3 / 48 studied')).toBeInTheDocument();
  });

  it('home page renders for guests', async () => {
    renderApp(<HomePage />, {
      routes: {
        '/companies': { items: [company] },
        '/questions/recent': { items: [{ ...summary, company }] },
        '/questions/daily': { question: { ...summary, company } },
      },
    });
    expect(await screen.findByText('Question of the day')).toBeInTheDocument();
    expect(await screen.findAllByText('Cart Merge')).not.toHaveLength(0);
  });

  it('Arabic switches direction to RTL', async () => {
    window.localStorage.setItem(
      'mk.prefs',
      JSON.stringify({ locale: 'ar', mode: 'dark', accent: null, dark: {}, light: {} }),
    );
    renderApp(<SettingsPage />);
    expect(await screen.findByText('الإعدادات')).toBeInTheDocument();
    expect(document.documentElement.dir).toBe('rtl');
    window.localStorage.clear();
  });
});
