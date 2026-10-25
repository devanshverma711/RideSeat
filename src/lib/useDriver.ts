'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import type { Driver } from '@/lib/types';

type State = { loading: boolean; userId?: string; phone?: string; driver?: Driver | null };

// Redirects to /login when signed out. driver === null means signed in but no profile yet.
export function useDriver(): State {
  const router = useRouter();
  const [state, setState] = useState<State>({ loading: true });

  useEffect(() => {
    let alive = true;
    supabase.auth.getSession().then(async ({ data }) => {
      const user = data.session?.user;
      if (!user) {
        router.replace('/login');
        return;
      }
      const { data: d } = await supabase.from('drivers').select('*').eq('id', user.id).maybeSingle();
      if (alive) setState({ loading: false, userId: user.id, phone: (user.phone ?? '').slice(-10), driver: (d as Driver) ?? null });
    });
    return () => { alive = false; };
  }, [router]);

  return state;
}
