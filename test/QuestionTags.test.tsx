import { screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { QuestionTags } from '@/features/questions/QuestionTags';
import type { QuestionTagFields } from '@/shared/types';
import { renderApp } from './utils';

const q: QuestionTagFields = {
  field: 'Software',
  specializations: ['Backend'],
  levels: ['Junior', 'Mid'],
  stage: 'Technical Interview',
  difficulty: 'Medium',
  topics: ['Problem Solving (DSA)', 'System Design'],
};

const chips = () => [...screen.getByTestId('tags').children].map((c) => c.textContent);

describe('QuestionTags', () => {
  it('shows one chip per facet, in the standard order', () => {
    renderApp(
      <div data-testid="tags">
        <QuestionTags q={q} />
      </div>,
    );
    expect(chips()).toEqual([
      'Software',
      'Backend',
      'Junior / Mid',
      'Technical Interview',
      'Medium',
      'Problem Solving (DSA) / System Design',
    ]);
  });

  it('skips facets with nothing in them', () => {
    renderApp(
      <div data-testid="tags">
        <QuestionTags q={{ ...q, specializations: [], levels: [] }} />
      </div>,
    );
    expect(chips()).toEqual([
      'Software',
      'Technical Interview',
      'Medium',
      'Problem Solving (DSA) / System Design',
    ]);
  });
});
