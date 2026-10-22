import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import AdminLogin from './AdminLogin';

const signInWithPassword = vi.hoisted(() => vi.fn());
vi.mock('../lib/supabase', () => ({ supabase: { auth: { signInWithPassword } } }));

beforeEach(() => {
  signInWithPassword.mockReset();
  signInWithPassword.mockResolvedValue({ error: { message: 'Invalid credentials' } });
});

describe('staff sign-in', () => {
  it.each([false, true])('keeps password sign-in and error feedback working with custom branding: %s', async (branded) => {
    render(
      <AdminLogin
        {...(branded
          ? { title: 'GroundSwell', className: 'gs-admin-branding gs-admin-login', logo: <img src="/gs.svg" alt="GroundSwell" /> }
          : {})}
      />,
    );

    expect(screen.getByRole('heading', { name: branded ? 'GroundSwell' : 'Admin Panel' })).toBeInTheDocument();
    expect(screen.queryByRole('img', { name: 'GroundSwell' }) !== null).toBe(branded);
    fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'staff@example.test' } });
    fireEvent.change(screen.getByLabelText('Password'), { target: { value: 'test-password' } });
    fireEvent.click(screen.getByRole('button', { name: 'Sign In' }));
    await waitFor(() => expect(signInWithPassword).toHaveBeenCalledWith({ email: 'staff@example.test', password: 'test-password' }));
    expect(await screen.findByText('Invalid credentials. Please try again.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Sign In' })).toBeEnabled();
  });
});
