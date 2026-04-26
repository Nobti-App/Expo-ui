import { ImageSourcePropType } from 'react-native';

export type QueueStatus = 'waiting' | 'current' | 'done';

export type QueueTicket = {
  n: string;
  s: QueueStatus;
  t: string;
};

export type QueueMap = Record<string, QueueTicket[]>;

export type Establishment = {
  id: number;
  name: string;
  type: string;
  city: string;
  tel: string;
  addr: string;
  hours: string;
  avg: number;
  open: boolean;
  image: ImageSourcePropType;
};

export type PayOption = 'vip1' | 'vip2';
export type PayMethod = 'cmi' | 'cash' | 'orange';

export type EstablishmentCategory =
  | 'bank'
  | 'doctor'
  | 'clinic'
  | 'laboratory'
  | 'administration'
  | 'leisure';

export type MyTicket = {
  before: number;
  total: number;
  num: string;
  estab: string;
  avg: number;
  isVip: boolean;
};
