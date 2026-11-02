import { describe, expect, it } from 'vitest';
import { fireEvent, screen } from '@testing-library/react';
import { RequestRolePage } from '@/features/roles/RequestRolePage';
import { makeMe, renderApp } from './utils';

const roles = {
  items: [{ id: 'r1', name: 'Reviewer', description: 'Reviews new companies and questions.' }],
};

describe('RequestRolePage', () => {
  it('needs a role and a reason before sending', async () => {
    renderApp(<RequestRolePage />, {
      me: makeMe(),
      routes: { '/roles/requestable': roles, '/me/role-requests': { items: [] } },
    });
    const submit = await screen.findByRole('button', { name: 'Send request' });
    expect(submit).toBeDisabled();
    fireEvent.click(screen.getByRole('radio', { name: /Reviewer/ }));
    fireEvent.change(screen.getByRole('textbox'), {
      target: { value: 'I review questions every week.' },
    });
    expect(submit).toBeEnabled();
  });

  it('shows the pending note instead of the form', async () => {
    renderApp(<RequestRolePage />, {
      me: makeMe(),
      routes: {
        '/roles/requestable': roles,
        '/me/role-requests': {
          items: [
            {
              id: 'q1',
              role: 'Reviewer',
              reason: 'I review questions every week.',
              status: 'pending',
              note: '',
              createdAt: '2026-11-01T00:00:00Z',
            },
          ],
        },
      },
    });
    expect(await screen.findByText(/waiting for the team/)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Send request' })).toBeNull();
  });
});
