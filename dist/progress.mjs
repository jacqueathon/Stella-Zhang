export const progressStages = ['Saved', 'In progress', 'Waiting', 'Completed'];

export function groupProgress(leads, resolveRecord, query) {
  const term = query.trim().toLowerCase();
  const groups = new Map(progressStages.map(stage => [stage, []]));

  for (const [id, lead] of Object.entries(leads)) {
    const group = groups.get(lead?.stage);
    const item = group && resolveRecord(id);
    if (!item) continue;
    const fields = [item.title, item.name, item.company, item.type, lead.notes];
    if (!term || fields.some(value => typeof value === 'string' && value.toLowerCase().includes(term))) {
      group.push({ id, item, lead });
    }
  }
  return groups;
}
