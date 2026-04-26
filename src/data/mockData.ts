import { Establishment, QueueMap } from '@/src/types';

export const ESTABS: Establishment[] = [
  {
    id: 0,
    name: 'Dr. Karim — Cabinet médical',
    type: 'Médecin',
    city: 'Hay Ismailia · Beni Mellal',
    tel: '+212 5 23 42 XX XX',
    addr: 'Hay Ismailia, Beni Mellal',
    hours: 'Lun–Sam 08:00–18:00',
    avg: 4,
    open: true,
    image: require('../../assets/placeholders/estab-1.jpg'),
  },
  {
    id: 1,
    name: 'Banque Populaire',
    type: 'Banque',
    city: 'Beni Mellal Centre',
    tel: '+212 5 23 48 XX XX',
    addr: 'Avenue Mohammed V, Beni Mellal',
    hours: 'Lun–Ven 08:30–16:30',
    avg: 3,
    open: true,
    image: require('../../assets/placeholders/estab-2.jpg'),
  },
  {
    id: 2,
    name: 'Laboratoire Pasteur',
    type: 'Laboratoire',
    city: 'Avenue Hassan II',
    tel: '+212 5 23 44 XX XX',
    addr: 'Avenue Hassan II, Beni Mellal',
    hours: 'Lun–Sam 07:30–19:00',
    avg: 5,
    open: true,
    image: require('../../assets/placeholders/estab-3.jpg'),
  },
  {
    id: 3,
    name: 'Salle Premium Snooker',
    type: 'Loisirs',
    city: 'Quartier Industriel',
    tel: '+212 6 61 XX XX XX',
    addr: 'Quartier Industriel, Beni Mellal',
    hours: 'Tous les jours 10:00–00:00',
    avg: 6,
    open: false,
    image: require('../../assets/placeholders/estab-4.jpg'),
  },
];

export const BASE_QUEUES: QueueMap = {
  A: [
    { n: 'A21', s: 'done', t: '08:30' },
    { n: 'A22', s: 'done', t: '08:45' },
    { n: 'A23', s: 'current', t: '09:02' },
    { n: 'A24', s: 'waiting', t: '09:15' },
    { n: 'A25', s: 'waiting', t: '09:22' },
    { n: 'A26', s: 'waiting', t: '09:30' },
    { n: 'A27', s: 'waiting', t: '09:38' },
  ],
  B: [
    { n: 'B01', s: 'done', t: '09:00' },
    { n: 'B02', s: 'current', t: '09:30' },
    { n: 'B03', s: 'waiting', t: '10:00' },
    { n: 'B04', s: 'waiting', t: '10:30' },
  ],
  C: [
    { n: 'C01', s: 'waiting', t: '10:00' },
    { n: 'C02', s: 'waiting', t: '10:20' },
  ],
};
