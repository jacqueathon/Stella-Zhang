import {localDay} from './tasks.mjs';

export function eventStatus(eventDate, today = localDay()) {
  return eventDate < today ? 'past' : 'upcoming';
}

export function nextLocalMidnight(now) {
  return new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
}
