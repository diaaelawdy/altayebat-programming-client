import { describe, expect, it } from 'vitest';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AuthPage } from '@/features/auth/AuthPage';
import { renderApp } from './utils';

describe('AuthPage', () => {
  it('shows live username and password rules while registering', async () => {
    renderApp(<AuthPage />, {
      path: '/register',
      routes: { '/auth/username/check': { available: true } },
    });
    const user = screen.getByPlaceholderText('Username');
    const submit = screen.getByRole('button', { name: 'Create account' });
    expect(submit).toBeDisabled();

    await userEvent.type(user, '9x');
    expect(screen.getByText('At least 3 characters').closest('li')).toHaveClass('text-subtle');
    expect(screen.getByText('Doesn’t start with a number').closest('li')).toHaveClass(
      'text-subtle',
    );

    await userEvent.clear(user);
    await userEvent.type(user, 'calm_owl');
    expect(screen.getByText('At least 3 characters').closest('li')).toHaveClass('text-easy');
    expect(screen.getByText('Doesn’t start with a number').closest('li')).toHaveClass('text-easy');
    expect(screen.getByText('Only English letters (a–z), numbers, _ and -').closest('li')).toHaveClass(
      'text-easy',
    );
    expect(
      await screen.findByText('Username is available', {}, { timeout: 2000 }),
    ).toBeInTheDocument();

    await userEvent.type(screen.getByPlaceholderText('Password'), '12345');
    expect(screen.getByText('At least 6 characters').closest('li')).toHaveClass('text-subtle');
    expect(submit).toBeDisabled();
    await userEvent.type(screen.getByPlaceholderText('Password'), '6');
    expect(screen.getByText('At least 6 characters').closest('li')).toHaveClass('text-easy');
    expect(submit).toBeEnabled();
  });

  it('sign-in mode has no rules and toggles password visibility', async () => {
    renderApp(<AuthPage />, { path: '/login' });
    expect(screen.queryByText('At least 3 characters')).not.toBeInTheDocument();
    const pw = screen.getByPlaceholderText('Password');
    expect(pw).toHaveAttribute('type', 'password');
    await userEvent.click(screen.getByRole('button', { name: 'Show password' }));
    expect(pw).toHaveAttribute('type', 'text');
  });
});
