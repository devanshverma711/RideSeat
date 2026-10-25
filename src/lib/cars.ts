// Car models and the seat layout each one gets by default.
// The driver can still change the layout when adding a car, because trims and seating vary.
export type CarModel = { name: string; layout: string };

export const OTHER_CAR = 'Other car (type the name)';

export const CAR_MODELS: CarModel[] = [
  { name: 'Maruti Swift Dzire', layout: 'sedan4' },
  { name: 'Maruti Ciaz', layout: 'sedan4' },
  { name: 'Maruti Swift', layout: 'sedan4' },
  { name: 'Maruti WagonR', layout: 'sedan4' },
  { name: 'Maruti Eeco (5-seater)', layout: 'sedan4' },
  { name: 'Toyota Etios', layout: 'sedan4' },
  { name: 'Hyundai Aura', layout: 'sedan4' },
  { name: 'Hyundai Xcent', layout: 'sedan4' },
  { name: 'Hyundai Verna', layout: 'sedan4' },
  { name: 'Honda Amaze', layout: 'sedan4' },
  { name: 'Honda City', layout: 'sedan4' },
  { name: 'Tata Tigor', layout: 'sedan4' },
  { name: 'Tata Tiago', layout: 'sedan4' },
  { name: 'Maruti XL6 (6-seater)', layout: 'mpv5' },
  { name: 'Kia Carens (6-seater)', layout: 'mpv5' },
  { name: 'Maruti Ertiga (7-seater)', layout: 'mpv6' },
  { name: 'Kia Carens (7-seater)', layout: 'mpv6' },
  { name: 'Toyota Innova (8-seater)', layout: 'mpv7' },
  { name: 'Toyota Innova Crysta (8-seater)', layout: 'mpv7' },
];

export const defaultLayoutFor = (modelName: string): string =>
  CAR_MODELS.find((m) => m.name === modelName)?.layout ?? 'sedan4';
