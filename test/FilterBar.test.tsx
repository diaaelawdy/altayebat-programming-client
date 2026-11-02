import { fireEvent, screen } from '@testing-library/react';
import { useLocation } from 'react-router-dom';
import { beforeAll, describe, expect, it, vi } from 'vitest';
import { FilterBar } from '@/features/questions/FilterBar';
import { renderApp } from './utils';

// jsdom does no layout, so it has no scrollIntoView (the dropdown scrolls to the active option).
beforeAll(() => {
  Element.prototype.scrollIntoView = vi.fn();
});

function Search() {
  return <output data-testid="search">{useLocation().search}</output>;
}
const params = () => new URLSearchParams(screen.getByTestId('search').textContent ?? '');
const pick = (label: string, option: string) => {
  fireEvent.click(screen.getByRole('button', { name: new RegExp(`^${label}:`) }));
  fireEvent.click(screen.getByRole('option', { name: option }));
};

describe('FilterBar', () => {
  it('keeps field and specialization consistent', () => {
    renderApp(
      <>
        <FilterBar />
        <Search />
      </>,
      { path: '/c/noon' },
    );
    pick('Specialization', 'Backend');
    expect(params().get('specialization')).toBe('Backend');
    expect(params().get('field')).toBe('Software');

    pick('Field', 'Data');
    expect(params().get('field')).toBe('Data');
    expect(params().get('specialization')).toBeNull();

    pick('Level', 'Junior');
    pick('Topic', 'SQL & Databases');
    expect(params().get('level')).toBe('Junior');
    expect(params().get('topic')).toBe('SQL & Databases');
  });
});
