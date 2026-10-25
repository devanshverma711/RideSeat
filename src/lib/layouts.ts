import { DRIVER_SIDE } from '@/lib/config';

// Seat maps drawn from above, front of the car at the top.
export type PlacedCell =
  | { kind: 'driver'; row: number; col: number }
  | { kind: 'seat'; no: number; label: string; row: number; col: number };

export type Layout = { key: string; name: string; passengers: number; cols: number; rows: number; cells: PlacedCell[] };

const seat = (no: number, label: string, row: number, col: number): PlacedCell => ({ kind: 'seat', no, label, row, col });
const driver = (row: number, col: number): PlacedCell => ({ kind: 'driver', row, col });

const BASE: Layout[] = [
  {
    key: 'sedan4', name: '4 passenger seats (5-seater car)', passengers: 4, cols: 3, rows: 2,
    cells: [
      seat(1, 'Front', 1, 1), driver(1, 3),
      seat(2, 'Back left', 2, 1), seat(3, 'Back middle', 2, 2), seat(4, 'Back right', 2, 3),
    ],
  },
  {
    key: 'mpv5', name: '5 passenger seats (6-seater with middle captain seats)', passengers: 5, cols: 3, rows: 3,
    cells: [
      seat(1, 'Front', 1, 1), driver(1, 3),
      seat(2, 'Middle left', 2, 1), seat(3, 'Middle right', 2, 3),
      seat(4, 'Back left', 3, 1), seat(5, 'Back right', 3, 3),
    ],
  },
  {
    key: 'mpv6', name: '6 passenger seats (7-seater)', passengers: 6, cols: 3, rows: 3,
    cells: [
      seat(1, 'Front', 1, 1), driver(1, 3),
      seat(2, 'Middle left', 2, 1), seat(3, 'Middle centre', 2, 2), seat(4, 'Middle right', 2, 3),
      seat(5, 'Back left', 3, 1), seat(6, 'Back right', 3, 3),
    ],
  },
  {
    key: 'mpv7', name: '7 passenger seats (8-seater)', passengers: 7, cols: 3, rows: 3,
    cells: [
      seat(1, 'Front', 1, 1), driver(1, 3),
      seat(2, 'Middle left', 2, 1), seat(3, 'Middle centre', 2, 2), seat(4, 'Middle right', 2, 3),
      seat(5, 'Back left', 3, 1), seat(6, 'Back middle', 3, 2), seat(7, 'Back right', 3, 3),
    ],
  },
];

const mirror = (l: Layout): Layout => ({ ...l, cells: l.cells.map((c) => ({ ...c, col: l.cols + 1 - c.col })) });

export const LAYOUTS: Layout[] = DRIVER_SIDE === 'left' ? BASE.map(mirror) : BASE;

export const getLayout = (key: string): Layout => LAYOUTS.find((l) => l.key === key) ?? LAYOUTS[0];

export const seatNumbers = (l: Layout): number[] =>
  l.cells.flatMap((c) => (c.kind === 'seat' ? [c.no] : []));
