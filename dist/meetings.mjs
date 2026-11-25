export function filterMeetings(meetings, filter) {
  const completed = meetings.filter(meeting => meeting.status === 'Completed');
  const active = meetings.filter(meeting => meeting.status !== 'Completed');
  const lists = {all: meetings, active, completed};
  return {
    counts: {all: meetings.length, active: active.length, completed: completed.length},
    visible: lists[filter]
  };
}
