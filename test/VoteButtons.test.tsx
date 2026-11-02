import { describe, expect, it, vi } from 'vitest';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { VoteButtons } from '@/features/threads/VoteButtons';
import { renderApp } from './utils';

describe('VoteButtons', () => {
  it('upvotes, toggles off, and switches', async () => {
    const onVote = vi.fn();
    const { unmount } = renderApp(<VoteButtons score={3} myVote={0} onVote={onVote} />);
    const up = screen.getByRole('button', { name: 'Upvote' });
    const down = screen.getByRole('button', { name: 'Downvote' });
    await userEvent.click(up);
    expect(onVote).toHaveBeenLastCalledWith(1);
    await userEvent.click(down);
    expect(onVote).toHaveBeenLastCalledWith(-1);
    unmount();
    renderApp(<VoteButtons score={4} myVote={1} onVote={onVote} />);
    expect(screen.getByText('4')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Upvote' })).toHaveAttribute('aria-pressed', 'true');
    await userEvent.click(screen.getByRole('button', { name: 'Upvote' }));
    expect(onVote).toHaveBeenLastCalledWith(0); // clicking the active arrow clears the vote
  });

  it('does nothing when disabled', async () => {
    const onVote = vi.fn();
    renderApp(
      <VoteButtons
        score={0}
        myVote={0}
        onVote={onVote}
        disabledReason="You can’t vote on your own post"
      />,
    );
    await userEvent.click(screen.getByRole('button', { name: 'Upvote' }));
    expect(onVote).not.toHaveBeenCalled();
    expect(screen.getByRole('button', { name: 'Upvote' })).toHaveAttribute('aria-disabled', 'true');
  });
});
