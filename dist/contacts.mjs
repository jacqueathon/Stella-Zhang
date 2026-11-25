export function filterContacts(contacts, leads, query, savedOnly) {
  const term = query.toLowerCase();
  const saved = contacts.filter(person => Boolean(leads[person.id]));
  const candidates = savedOnly ? saved : contacts;
  return {
    savedCount: saved.length,
    visible: candidates.filter(person => {
      const fields = `${person.name} ${person.company} ${person.city}`;
      return fields.toLowerCase().includes(term);
    })
  };
}
