'use client';

import { useState, forwardRef } from 'react';
import { Eye, EyeOff } from 'lucide-react';

type Props = Omit<React.InputHTMLAttributes<HTMLInputElement>, 'type'> & {
  /** Override the default styles entirely. Otherwise we use the auth-page input look. */
  className?: string;
};

/**
 * Password input with a show/hide eye toggle on the right.
 *
 * Drop-in replacement for `<input type="password">` — accepts all the same
 * props (`name`, `required`, `defaultValue`, `autoComplete`, etc.). The toggle
 * button is purely visual; the input still submits its value.
 */
export const PasswordInput = forwardRef<HTMLInputElement, Props>(function PasswordInput(
  { className, ...rest },
  ref,
) {
  const [visible, setVisible] = useState(false);

  const defaultCls =
    'w-full pl-3 pr-10 py-2 bg-surface2 border border-border rounded text-ink focus:outline-none focus:ring-2 focus:ring-terra/30';

  return (
    <div className="relative">
      <input
        {...rest}
        ref={ref}
        type={visible ? 'text' : 'password'}
        className={className ?? defaultCls}
      />
      <button
        type="button"
        onClick={() => setVisible((v) => !v)}
        aria-label={visible ? 'Hide password' : 'Show password'}
        title={visible ? 'Hide password' : 'Show password'}
        tabIndex={-1}
        className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-muted hover:text-ink transition-colors"
      >
        {visible ? <EyeOff size={16} strokeWidth={1.75} /> : <Eye size={16} strokeWidth={1.75} />}
      </button>
    </div>
  );
});
