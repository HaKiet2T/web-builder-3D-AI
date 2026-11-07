'use client';

import { useActionState } from 'react';
import { signInAdmin } from '@/app/admin/login/actions';

export function LoginForm() {
  const [state, action, pending] = useActionState(signInAdmin, {});

  return (
    <form className="admin-login-form" action={action}>
      <label htmlFor="admin-email">Email</label>
      <input id="admin-email" name="email" type="email" autoComplete="username" required />
      <label htmlFor="admin-password">Mật khẩu</label>
      <input
        id="admin-password"
        name="password"
        type="password"
        autoComplete="current-password"
        required
      />
      {state.error ? <p className="admin-form-error" role="alert">{state.error}</p> : null}
      <button className="admin-button admin-button-primary" type="submit" disabled={pending}>
        {pending ? 'Đang đăng nhập…' : 'Đăng nhập'}
      </button>
    </form>
  );
}
