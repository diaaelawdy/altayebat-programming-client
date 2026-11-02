import { fireEvent, screen } from '@testing-library/react';
import { useState } from 'react';
import { describe, expect, it } from 'vitest';
import { TagPicker } from '@/features/questions/TagPicker';
import { emptyTags } from '@/features/questions/tags';
import type { QuestionTagDraft } from '@/shared/types';
import { renderApp } from './utils';

function Harness({ initial = emptyTags() }: { initial?: QuestionTagDraft }) {
  const [v, setV] = useState(initial);
  return (
    <>
      <TagPicker value={v} onChange={setV} />
      <output data-testid="value">{JSON.stringify(v)}</output>
    </>
  );
}
const value = () => JSON.parse(screen.getByTestId('value').textContent!) as QuestionTagDraft;
const click = (role: 'radio' | 'button', name: string) =>
  fireEvent.click(screen.getByRole(role, { name }));

describe('TagPicker', () => {
  it('offers only the specializations of the chosen field', () => {
    renderApp(<Harness />);
    expect(screen.queryByRole('button', { name: 'Backend' })).not.toBeInTheDocument();
    click('radio', 'Software');
    expect(screen.getByRole('radio', { name: 'Software' })).toHaveAttribute('aria-checked', 'true');
    expect(screen.getByRole('button', { name: 'Backend' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Data Science' })).not.toBeInTheDocument();
  });

  it('drops specializations that belong to the old field', () => {
    renderApp(
      <Harness initial={{ ...emptyTags(), field: 'Software', specializations: ['Backend'] }} />,
    );
    click('radio', 'Data');
    expect(value()).toMatchObject({ field: 'Data', specializations: [] });
  });

  it('takes at most three picks per facet', () => {
    renderApp(<Harness />);
    for (const level of ['Intern', 'Junior', 'Mid', 'Senior']) click('button', level);
    expect(value().levels).toEqual(['Intern', 'Junior', 'Mid']);
    click('button', 'Junior');
    expect(value().levels).toEqual(['Intern', 'Mid']);
  });

  it('has no specializations for General', () => {
    renderApp(<Harness />);
    click('radio', 'General');
    expect(screen.queryByText('Specialization (up to 3)')).not.toBeInTheDocument();
    expect(screen.getByText(/any role gets/)).toBeInTheDocument();
  });
});
