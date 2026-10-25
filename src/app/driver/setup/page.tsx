'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Header from '@/components/Header';
import SeatPicker from '@/components/SeatPicker';
import { supabase } from '@/lib/supabase';
import { useDriver } from '@/lib/useDriver';
import { LAYOUTS, getLayout, seatNumbers } from '@/lib/layouts';
import { CAR_MODELS, OTHER_CAR, defaultLayoutFor } from '@/lib/cars';
import type { Car } from '@/lib/types';

export default function Setup() {
  const router = useRouter();
  const { loading, userId, phone, driver } = useDriver();
  const [name, setName] = useState('');
  const [model, setModel] = useState(CAR_MODELS[0].name);
  const [customName, setCustomName] = useState('');
  const [layout, setLayout] = useState(defaultLayoutFor(CAR_MODELS[0].name));
  const [plate, setPlate] = useState('');
  const [cars, setCars] = useState<Car[]>([]);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');

  useEffect(() => {
    if (!userId) return;
    supabase.from('cars').select('*').eq('driver_id', userId).then(({ data }) => setCars((data ?? []) as Car[]));
  }, [userId]);

  function pickModel(m: string) {
    setModel(m);
    if (m !== OTHER_CAR) setLayout(defaultLayoutFor(m));
  }

  const carName = model === OTHER_CAR ? customName.trim() : model;
  const preview = seatNumbers(getLayout(layout)).map((n) => ({ seat_no: n, price: 0, state: 'free' as const }));

  async function save() {
    if (!userId || !phone) return;
    if (!driver && name.trim().length < 2) return setErr('Enter your name.');
    if (carName.length < 2) return setErr('Enter the car name.');
    setBusy(true);
    setErr('');
    if (!driver) {
      const { error } = await supabase.from('drivers').insert({ id: userId, name: name.trim(), phone });
      if (error) { setBusy(false); return setErr('Could not save your profile. Try again.'); }
    }
    const { error } = await supabase.from('cars').insert({
      driver_id: userId, name: carName, plate: plate.trim().toUpperCase() || null, layout,
    });
    setBusy(false);
    if (error) return setErr('Could not save the car. Try again.');
    router.replace('/driver');
  }

  if (loading) return <Header />;

  return (
    <>
      <Header signOut />
      <main className="wrap stack">
        <h1>{driver ? 'Add a car' : 'Set up your profile'}</h1>

        {cars.length > 0 && (
          <div className="card">
            <h2>Your cars</h2>
            {cars.map((c) => (
              <p key={c.id} style={{ margin: '0 0 .25rem' }}>
                {c.name}{c.plate ? ` · ${c.plate}` : ''} <span className="muted small">· {getLayout(c.layout).passengers} passenger seats</span>
              </p>
            ))}
          </div>
        )}

        <div className="card">
          {!driver && (
            <div className="field">
              <label htmlFor="name">Your name</label>
              <input id="name" value={name} onChange={(e) => setName(e.target.value)} autoComplete="name" />
            </div>
          )}
          <div className="field">
            <label htmlFor="model">Car model</label>
            <select id="model" value={model} onChange={(e) => pickModel(e.target.value)}>
              {CAR_MODELS.map((m) => <option key={m.name} value={m.name}>{m.name}</option>)}
              <option value={OTHER_CAR}>{OTHER_CAR}</option>
            </select>
          </div>
          {model === OTHER_CAR && (
            <div className="field">
              <label htmlFor="custom">Car name</label>
              <input id="custom" value={customName} onChange={(e) => setCustomName(e.target.value)} placeholder="Make and model" />
            </div>
          )}
          <div className="field">
            <label htmlFor="layout">Passenger seats you sell</label>
            <select id="layout" value={layout} onChange={(e) => setLayout(e.target.value)}>
              {LAYOUTS.map((l) => <option key={l.key} value={l.key}>{l.name}</option>)}
            </select>
            <p className="muted small" style={{ margin: '.3rem 0 0' }}>Set from the car model. Change it if your car is seated differently.</p>
          </div>
          <div className="field">
            <label htmlFor="plate">Number plate</label>
            <input id="plate" value={plate} onChange={(e) => setPlate(e.target.value)} placeholder="MH 12 AB 1234" />
          </div>
        </div>

        <div>
          <p className="muted small" style={{ textAlign: 'center' }}>Seat map passengers will see</p>
          <SeatPicker layout={layout} seats={preview} hidePrice />
        </div>

        {err && <p className="notice error">{err}</p>}
        <button className="btn block" disabled={busy} onClick={save}>Save car</button>
      </main>
    </>
  );
}
