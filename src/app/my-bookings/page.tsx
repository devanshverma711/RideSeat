'use client';
import { useEffect, useState } from 'react';
import Header from '@/components/Header';
import { supabase } from '@/lib/supabase';
import { digits, isPhone, rupee, waLink, when } from '@/lib/format';

type Row = {
  id: string; seat_no: number; status: string; code: string; from_place: string; to_place: string;
  depart_at: string; trip_status: string; price: number; driver_name: string; driver_phone: string;
};

export default function MyBookings() {
  const [phone, setPhone] = useState('');
  const [rows, setRows] = useState<Row[] | null>(null);
  const [err, setErr] = useState('');

  async function find(p = phone) {
    setErr('');
    if (!isPhone(p)) return setErr('Enter a valid 10-digit mobile number.');
    const { data, error } = await supabase.rpc('my_bookings', { p_phone: p });
    if (error) return setErr('Could not load bookings. Try again.');
    try { localStorage.setItem('rideseat_phone', p); } catch { /* storage unavailable */ }
    setRows((data ?? []) as Row[]);
  }

  useEffect(() => {
    try {
      const saved = localStorage.getItem('rideseat_phone');
      if (saved && isPhone(saved)) { setPhone(saved); find(saved); }
    } catch { /* storage unavailable */ }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function cancel(id: string) {
    if (!confirm('Cancel this seat?')) return;
    await supabase.rpc('cancel_booking', { p_id: id, p_phone: phone });
    find();
  }

  const upcoming = (rows ?? []).filter((r) => new Date(r.depart_at).getTime() > Date.now());
  const past = (rows ?? []).filter((r) => !upcoming.includes(r));

  const card = (r: Row, canCancel: boolean) => (
    <div className="card" key={r.id}>
      <div className="row between">
        <strong>{r.from_place} to {r.to_place}</strong>
        <span className={`chip ${r.status}`}>{r.status}</span>
      </div>
      <p className="muted small" style={{ margin: '.25rem 0 .6rem' }}>
        {when(r.depart_at)} · Seat {r.seat_no} · {rupee(r.price)} · {r.driver_name}
      </p>
      <div className="row">
        <a className="btn secondary small" href={`tel:+91${r.driver_phone}`}>Call driver</a>
        <a className="btn secondary small" target="_blank" rel="noreferrer"
          href={waLink(r.driver_phone, `Hi ${r.driver_name}, about my seat ${r.seat_no} on ${r.from_place} to ${r.to_place}, ${when(r.depart_at)}.`)}>WhatsApp</a>
        {canCancel && (r.status === 'pending' || r.status === 'confirmed') && (
          <button className="btn danger small" onClick={() => cancel(r.id)}>Cancel seat</button>
        )}
      </div>
    </div>
  );

  return (
    <>
      <Header />
      <main className="wrap stack">
        <h1>Find my bookings</h1>
        <div className="card">
          <div className="field">
            <label htmlFor="mp">Mobile number you booked with</label>
            <input id="mp" inputMode="numeric" maxLength={10} value={phone} onChange={(e) => setPhone(digits(e.target.value))} />
          </div>
          {err && <p className="notice error" style={{ marginTop: '.85rem' }}>{err}</p>}
          <div style={{ marginTop: '1rem' }}>
            <button className="btn block" onClick={() => find()}>Show bookings</button>
          </div>
        </div>

        {rows && rows.length === 0 && <p className="muted">No bookings found for this number.</p>}
        {upcoming.length > 0 && <><h2>Upcoming</h2>{upcoming.map((r) => card(r, true))}</>}
        {past.length > 0 && <><h2>Past</h2>{past.slice(0, 20).map((r) => card(r, false))}</>}
      </main>
    </>
  );
}
