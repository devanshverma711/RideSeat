export type Driver = { id: string; name: string; phone: string };
export type Car = { id: string; driver_id: string; name: string; plate: string | null; layout: string };
export type BookingStatus = 'pending' | 'confirmed' | 'rejected' | 'cancelled';

export type PublicSeat = { seat_no: number; price: number; taken: boolean };
export type PublicTrip = {
  id: string;
  code: string;
  from_place: string;
  to_place: string;
  depart_at: string;
  distance_km: number | null;
  status: string;
  auto_confirm: boolean;
  driver_name: string;
  driver_phone: string;
  car_name: string;
  car_plate: string | null;
  layout: string;
  seats: PublicSeat[];
};
