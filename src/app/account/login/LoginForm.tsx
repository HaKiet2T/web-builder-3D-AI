'use client';

import { useActionState, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { signInUser, signUpUser } from '@/lib/account/actions';
import type { AuthActionState } from '@/lib/account/actions';

const initialState: AuthActionState = {};

export function LoginForm() {
  const [mode, setMode] = useState<'signin' | 'signup'>('signin');
  const searchParams = useSearchParams();
  const redirectPath = searchParams.get('redirect') || '/account';

  const [signInState, signInAction, isSigningIn] = useActionState(signInUser, initialState);
  const [signUpState, signUpAction, isSigningUp] = useActionState(signUpUser, initialState);

  const activeState = mode === 'signin' ? signInState : signUpState;
  const isPending = mode === 'signin' ? isSigningIn : isSigningUp;

  return (
    <div className="w-full max-w-md mx-auto p-6 sm:p-8 bg-white dark:bg-[#111214] border border-neutral-200/80 dark:border-neutral-800 rounded-xl shadow-sm">
      {/* Tab switcher */}
      <div className="grid grid-cols-2 p-1 mb-6 bg-neutral-100 dark:bg-neutral-900 border border-neutral-200/50 dark:border-neutral-800 rounded-lg">
        <button
          type="button"
          onClick={() => setMode('signin')}
          className={`py-2 text-xs font-semibold uppercase tracking-wider rounded-md transition-all ${
            mode === 'signin'
              ? 'bg-white dark:bg-[#1a1c1e] text-neutral-900 dark:text-white shadow-xs'
              : 'text-neutral-500 hover:text-neutral-800 dark:hover:text-neutral-300'
          }`}
        >
          Đăng nhập
        </button>
        <button
          type="button"
          onClick={() => setMode('signup')}
          className={`py-2 text-xs font-semibold uppercase tracking-wider rounded-md transition-all ${
            mode === 'signup'
              ? 'bg-white dark:bg-[#1a1c1e] text-neutral-900 dark:text-white shadow-xs'
              : 'text-neutral-500 hover:text-neutral-800 dark:hover:text-neutral-300'
          }`}
        >
          Tạo tài khoản
        </button>
      </div>

      <div className="mb-6 text-center">
        <h1 className="text-xl font-bold tracking-tight text-neutral-900 dark:text-white">
          {mode === 'signin' ? 'Đăng nhập vào tài khoản' : 'Khởi tạo tài khoản mới'}
        </h1>
        <p className="mt-1 text-xs text-neutral-500 dark:text-neutral-400">
          {mode === 'signin'
            ? 'Quản lý đơn hàng, lưu địa chỉ giao hàng và nhận ưu đãi độc quyền'
            : 'Đồng bộ tức thì mọi đơn hàng và tận hưởng trải nghiệm mua sắm mượt mà'}
        </p>
      </div>

      {activeState.error && (
        <div className="mb-4 p-3 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900/50 text-red-700 dark:text-red-400 text-xs rounded-lg flex items-center gap-2">
          <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span>{activeState.error}</span>
        </div>
      )}

      {activeState.success && (
        <div className="mb-4 p-3 bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-900/50 text-emerald-700 dark:text-emerald-400 text-xs rounded-lg flex items-center gap-2">
          <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
          </svg>
          <span>{activeState.success}</span>
        </div>
      )}

      {mode === 'signin' ? (
        <form action={signInAction} className="space-y-4">
          <input type="hidden" name="redirect" value={redirectPath} />

          <div>
            <label className="block text-xs font-medium text-neutral-700 dark:text-neutral-300 mb-1.5" htmlFor="signin-email">
              Email
            </label>
            <input
              id="signin-email"
              name="email"
              type="email"
              required
              autoComplete="email"
              placeholder="ten@vidu.com"
              className="w-full px-3.5 py-2.5 bg-neutral-50/50 dark:bg-neutral-900/50 border border-neutral-300/80 dark:border-neutral-700 rounded-lg text-sm text-neutral-900 dark:text-white placeholder:text-neutral-400 focus:outline-hidden focus:border-neutral-900 dark:focus:border-white transition-colors"
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-xs font-medium text-neutral-700 dark:text-neutral-300" htmlFor="signin-password">
                Mật khẩu
              </label>
              <span className="text-[11px] text-neutral-400 hover:underline cursor-pointer">
                Quên mật khẩu?
              </span>
            </div>
            <input
              id="signin-password"
              name="password"
              type="password"
              required
              autoComplete="current-password"
              placeholder="••••••••"
              className="w-full px-3.5 py-2.5 bg-neutral-50/50 dark:bg-neutral-900/50 border border-neutral-300/80 dark:border-neutral-700 rounded-lg text-sm text-neutral-900 dark:text-white placeholder:text-neutral-400 focus:outline-hidden focus:border-neutral-900 dark:focus:border-white transition-colors"
            />
          </div>

          <button
            type="submit"
            disabled={isPending}
            className="w-full py-2.5 px-4 bg-neutral-900 hover:bg-black dark:bg-white dark:hover:bg-neutral-100 text-white dark:text-neutral-950 text-xs font-semibold uppercase tracking-wider rounded-lg transition-all active:scale-[0.985] disabled:opacity-50"
          >
            {isPending ? 'Đang xác thực...' : 'Đăng nhập'}
          </button>
        </form>
      ) : (
        <form action={signUpAction} className="space-y-4">
          <input type="hidden" name="redirect" value={redirectPath} />

          <div>
            <label className="block text-xs font-medium text-neutral-700 dark:text-neutral-300 mb-1.5" htmlFor="signup-name">
              Họ và tên
            </label>
            <input
              id="signup-name"
              name="fullName"
              type="text"
              required
              autoComplete="name"
              placeholder="Nguyễn Văn A"
              className="w-full px-3.5 py-2.5 bg-neutral-50/50 dark:bg-neutral-900/50 border border-neutral-300/80 dark:border-neutral-700 rounded-lg text-sm text-neutral-900 dark:text-white placeholder:text-neutral-400 focus:outline-hidden focus:border-neutral-900 dark:focus:border-white transition-colors"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-neutral-700 dark:text-neutral-300 mb-1.5" htmlFor="signup-email">
              Email
            </label>
            <input
              id="signup-email"
              name="email"
              type="email"
              required
              autoComplete="email"
              placeholder="ten@vidu.com"
              className="w-full px-3.5 py-2.5 bg-neutral-50/50 dark:bg-neutral-900/50 border border-neutral-300/80 dark:border-neutral-700 rounded-lg text-sm text-neutral-900 dark:text-white placeholder:text-neutral-400 focus:outline-hidden focus:border-neutral-900 dark:focus:border-white transition-colors"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-neutral-700 dark:text-neutral-300 mb-1.5" htmlFor="signup-password">
              Mật khẩu (tối thiểu 6 ký tự)
            </label>
            <input
              id="signup-password"
              name="password"
              type="password"
              required
              minLength={6}
              autoComplete="new-password"
              placeholder="••••••••"
              className="w-full px-3.5 py-2.5 bg-neutral-50/50 dark:bg-neutral-900/50 border border-neutral-300/80 dark:border-neutral-700 rounded-lg text-sm text-neutral-900 dark:text-white placeholder:text-neutral-400 focus:outline-hidden focus:border-neutral-900 dark:focus:border-white transition-colors"
            />
          </div>

          <button
            type="submit"
            disabled={isPending}
            className="w-full py-2.5 px-4 bg-neutral-900 hover:bg-black dark:bg-white dark:hover:bg-neutral-100 text-white dark:text-neutral-950 text-xs font-semibold uppercase tracking-wider rounded-lg transition-all active:scale-[0.985] disabled:opacity-50"
          >
            {isPending ? 'Đang tạo tài khoản...' : 'Tạo tài khoản'}
          </button>
        </form>
      )}

      <div className="mt-6 pt-4 border-t border-neutral-200/60 dark:border-neutral-800 text-center">
        <Link
          href="/"
          className="text-xs text-neutral-500 hover:text-neutral-900 dark:hover:text-white transition-colors"
        >
          ← Quay về trang chủ
        </Link>
      </div>
    </div>
  );
}
