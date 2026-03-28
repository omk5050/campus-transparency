export type SignalStatus = 'REPORTED' | 'IN_PROGRESS' | 'RESOLVED' | 'REJECTED';

export interface Signal {
  id: string;
  title: string;
  description: string;
  voteCount: number;
  status: SignalStatus;
  createdAt: string; // ISO string
  trending: boolean;
  hot: boolean;
  reporterHash: string;
}

export type SortOption = 'TRENDING' | 'TOP' | 'NEW' | 'UNRESOLVED';
