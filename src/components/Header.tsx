'use client';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { isDemo, supabase } from '@/lib/supabase';
import { APP_NAME } from '@/lib/config';

export default function Header({ signOut = false }: { signOut?: boolean }) {
  const router = useRouter();
  return (
    <>
      {isDemo && (
        <div className="demo-bar">
          Demo mode: sample data saved only in this browser. Any phone number and any code will sign you in. Try the trip link{' '}
          <Link href="/t/demo123">/t/demo123</Link>.
        </div>
      )}
      <header className="top">
        <Link href="/" className="brand">{APP_NAME}</Link>
        {signOut && (
          <button
            className="btn ghost small"
            onClick={async () => {
              await supabase.auth.signOut();
              router.replace('/');
            }}
          >
            Sign out
          </button>
        )}
      </header>
    </>
  );
}
