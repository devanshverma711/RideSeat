'use client';
import { getLayout } from '@/lib/layouts';
import { rupee } from '@/lib/format';

export type SeatState = 'free' | 'taken' | 'pending' | 'confirmed';
export type SeatView = { seat_no: number; price: number; state: SeatState };

type Props = {
  layout: string;
  seats: SeatView[];
  selected?: number[];
  onToggle?: (seatNo: number) => void;
  hidePrice?: boolean;
};

const STATE_TEXT: Record<SeatState, string> = { free: '', taken: 'Taken', pending: 'Pending', confirmed: 'Booked' };

export default function SeatPicker({ layout, seats, selected = [], onToggle, hidePrice = false }: Props) {
  const l = getLayout(layout);
  const bySeat = new Map(seats.map((s) => [s.seat_no, s]));

  return (
    <div className="car" role="group" aria-label="Seat map" style={{ gridTemplateColumns: `repeat(${l.cols}, 1fr)` }}>
      <div className="windshield" aria-hidden="true" />
      {l.cells.map((c) => {
        const pos = { gridRow: c.row + 1, gridColumn: c.col };
        if (c.kind === 'driver') {
          return <div key="driver" className="seat driver" style={pos}>Driver</div>;
        }
        const s = bySeat.get(c.no);
        if (!s) return <div key={c.no} className="seat off" style={pos}>{c.label}</div>;
        const isPicked = selected.includes(c.no);
        const clickable = s.state === 'free' && !!onToggle;
        const cls = ['seat', s.state, isPicked ? 'picked' : ''].join(' ');
        return (
          <button
            key={c.no}
            type="button"
            className={cls}
            style={pos}
            disabled={!clickable}
            aria-pressed={isPicked}
            onClick={() => onToggle?.(c.no)}
          >
            <span className="seat-label">{c.label}</span>
            <span className="seat-price">{s.state === 'free' ? (hidePrice ? `Seat ${c.no}` : rupee(s.price)) : STATE_TEXT[s.state]}</span>
          </button>
        );
      })}
    </div>
  );
}
