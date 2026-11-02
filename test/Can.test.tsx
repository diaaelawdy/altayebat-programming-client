import { describe, expect, it } from 'vitest';
import { screen } from '@testing-library/react';
import { Can } from '@/features/auth/Can';
import { RequirePermission } from '@/features/auth/guards';
import { makeMe, renderApp } from './utils';

describe('<Can/>', () => {
  it('renders children only with the permission', () => {
    renderApp(
      <>
        <Can permission="questions.review">
          <button>Review</button>
        </Can>
        <Can permission="roles.manage" fallback={<span>no roles</span>}>
          <button>Roles</button>
        </Can>
      </>,
      { me: makeMe(['questions.review']) },
    );
    expect(screen.getByText('Review')).toBeInTheDocument();
    expect(screen.queryByText('Roles')).not.toBeInTheDocument();
    expect(screen.getByText('no roles')).toBeInTheDocument();
  });

  it('requires every listed permission, or any of `any`', () => {
    renderApp(
      <>
        <Can permission={['users.ban', 'users.assign_roles']}>
          <span>both</span>
        </Can>
        <Can any={['users.ban', 'roles.manage']}>
          <span>either</span>
        </Can>
      </>,
      { me: makeMe(['users.ban']) },
    );
    expect(screen.queryByText('both')).not.toBeInTheDocument();
    expect(screen.getByText('either')).toBeInTheDocument();
  });

  it('hides everything from guests', () => {
    renderApp(
      <Can permission="answers.create">
        <span>answer</span>
      </Can>,
      { me: null },
    );
    expect(screen.queryByText('answer')).not.toBeInTheDocument();
  });

  it('protected routes render 404 instead of a disabled page', () => {
    renderApp(
      <RequirePermission permission="users.view_private">
        <h1>Users</h1>
      </RequirePermission>,
      { me: makeMe(['questions.review']) },
    );
    expect(screen.queryByText('Users')).not.toBeInTheDocument();
    expect(screen.getByText('404')).toBeInTheDocument();
  });
});
