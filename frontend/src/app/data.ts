import { Signal } from './types';
import { subHours, subDays } from 'date-fns';

const now = new Date();

export const initialSignals: Signal[] = [
  {
    id: 'SIG-1042',
    title: 'WiFi dead zone on 3rd floor Library (East Wing)',
    description: 'The connection drops completely near the quiet study pods. Multiple students affected during finals prep. We need a signal repeater installed in that sector immediately.',
    voteCount: 142,
    status: 'IN_PROGRESS',
    createdAt: subHours(now, 2).toISOString(),
    trending: true,
    hot: true,
    reporterHash: '#X92B1'
  },
  {
    id: 'SIG-1043',
    title: 'Blue Loop Shuttle consistently >15m late',
    description: 'The 8:15 AM shuttle has arrived at 8:35 AM for the last 3 days straight. This causes students to be late for 9 AM classes across campus. Schedule needs audit.',
    voteCount: 89,
    status: 'REPORTED',
    createdAt: subHours(now, 5).toISOString(),
    trending: true,
    hot: false,
    reporterHash: '#L44A9'
  },
  {
    id: 'SIG-1038',
    title: 'Vending machine in Engineering Hall ate card',
    description: 'The snack machine near room 204 took $5.00 but dispensed nothing. This is the second time this week. Refund process is unclear.',
    voteCount: 12,
    status: 'RESOLVED',
    createdAt: subDays(now, 2).toISOString(),
    trending: false,
    hot: false,
    reporterHash: '#M22C5'
  },
  {
    id: 'SIG-1040',
    title: 'Extend Gym Hours for Finals Week',
    description: 'Closing at 10 PM is too early during finals when stress is high. Propose extending to 12 AM or 24h for this week only.',
    voteCount: 205,
    status: 'IN_PROGRESS',
    createdAt: subDays(now, 1).toISOString(),
    trending: true,
    hot: true,
    reporterHash: '#K99P2'
  },
  {
    id: 'SIG-1044',
    title: 'Broken streetlamp behind Arts Center',
    description: 'It is completely dark on the path leading to the dorms. Safety concern for anyone walking back after evening rehearsals.',
    voteCount: 56,
    status: 'REPORTED',
    createdAt: subHours(now, 1).toISOString(),
    trending: true,
    hot: true,
    reporterHash: '#T77R4'
  },
  {
    id: 'SIG-1035',
    title: 'Petition to ban leaf blowers before 8 AM',
    description: 'Noise pollution is affecting sleep quality in South Dorms. Landscaping crew starts at 7 AM sharp.',
    voteCount: -5,
    status: 'REJECTED',
    createdAt: subDays(now, 4).toISOString(),
    trending: false,
    hot: false,
    reporterHash: '#B11Q8'
  },
  {
    id: 'SIG-1045',
    title: 'Water fountain on 2nd floor Math building is warm',
    description: 'The water is lukewarm and tastes metallic. Filter replacement needed.',
    voteCount: 8,
    status: 'REPORTED',
    createdAt: subHours(now, 12).toISOString(),
    trending: false,
    hot: false,
    reporterHash: '#D33S1'
  },
  {
    id: 'SIG-1041',
    title: 'Add more bike racks near Science Complex',
    description: 'Current racks are full by 9 AM. Students are locking bikes to trees and railings, which is against policy.',
    voteCount: 78,
    status: 'REPORTED',
    createdAt: subDays(now, 1).toISOString(),
    trending: false,
    hot: false,
    reporterHash: '#F55G6'
  }
];
