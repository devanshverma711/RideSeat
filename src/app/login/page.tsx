'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Header from '@/components/Header';
import { supabase } from '@/lib/supabase';
import { digits, isPhone } from '@/lib/format';

export default function Login() {
  const router = useRouter();
  const [phone, setPhone] = useState('');
  const [code, setCode] = useState('');
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');

  async function sendOtp() {
    setErr('');
    if (!isPhone(phone)) return setErr('Enter a valid 10-digit mobile number.');
    setBusy(true);
    const { error } = await supabase.auth.signInWithOtp({ phone: `+91${phone}` });
    setBusy(false);
    if (error) return setErr('Could not send the code. Check the number and try again.');
    setSent(true);
  }

  async function verify() {
    setErr('');
    setBusy(true);
    const { error } = await supabase.auth.verifyOtp({ phone: `+91${phone}`, token: code.trim(), type: 'sms' });
    setBusy(false);
    if (error) return setErr('That code is wrong or expired. Request a new one.');
    router.replace('/driver');
  }

  return (
    <>
      <Header />
      <main className="wrap stack">
        <h1>Driver sign in</h1>
        <div className="card">
          <div className="field">
            <label htmlFor="phone">Mobile number</label>
            <div className="row">
              <span className="muted">+91</span>
              <input id="phone" className="grow" inputMode="numeric" autoComplete="tel-national" maxLength={10}
                value={phone} disabled={sent} onChange={(e) => setPhone(digits(e.target.value))} />
            </div>
          </div>
          {sent && (
            <div className="field">
              <label htmlFor="otp">Code sent by SMS</label>
              <input id="otp" inputMode="numeric" autoComplete="one-time-code" maxLength={6}
                value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))} />
            </div>
          )}
          {err && <p className="notice error" style={{ marginTop: '.85rem' }}>{err}</p>}
          <div style={{ marginTop: '1rem' }}>
            {sent ? (
              <button className="btn block" disabled={busy || code.length < 6} onClick={verify}>Verify and continue</button>
            ) : (
              <button className="btn block" disabled={busy} onClick={sendOtp}>Send code</button>
            )}
          </div>
        </div>
      </main>
    </>
  );
}
