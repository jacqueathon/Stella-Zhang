export const taskPriorities = ['High', 'Medium', 'Low'];

// Calendar dates are local, so a task does not become overdue at UTC midnight.
export function localDay(now = new Date()) {
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
}

export function validDueDate(value) {
  if (!value) return true;
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T12:00:00`);
  return Number.isFinite(date.getTime()) && localDay(date) === value;
}

// Old workspaces have no tasks. Ignore malformed entries without touching leads.
export function normalizeTasks(value) {
  if (!Array.isArray(value)) return [];
  const seen = new Set();
  return value.filter(task => {
    if (!task || typeof task.id !== 'string' || !task.id || seen.has(task.id) ||
        typeof task.title !== 'string' || !task.title.trim()) return false;
    seen.add(task.id);
    return true;
  }).map(task => ({
    id: task.id,
    title: task.title.trim().slice(0, 160),
    due: typeof task.due === 'string' && validDueDate(task.due) ? task.due : '',
    priority: taskPriorities.includes(task.priority) ? task.priority : 'Medium',
    completed: task.completed === true,
    createdAt: typeof task.createdAt === 'string' ? task.createdAt : '',
  }));
}

export function saveTask(tasks, values, id, now = new Date().toISOString()) {
  const title = String(values.title ?? '').trim();
  const due = values.due || '';
  if (!title || title.length > 160) throw new Error('Enter a task between 1 and 160 characters.');
  if (!validDueDate(due)) throw new Error('Choose a valid due date or leave it empty.');
  if (!taskPriorities.includes(values.priority)) throw new Error('Choose High, Medium or Low priority.');
  const old = tasks.find(task => task.id === id);
  const task = {id, title, due, priority: values.priority, completed: old?.completed ?? false, createdAt: old?.createdAt ?? now};
  return old ? tasks.map(item => item.id === id ? task : item) : [...tasks, task];
}

export const toggleTask = (tasks, id) => tasks.map(task => task.id === id ? {...task, completed: !task.completed} : task);
export const deleteTask = (tasks, id) => tasks.filter(task => task.id !== id);
export const taskCounts = (tasks, today = localDay()) => ({
  open: tasks.filter(task => !task.completed).length,
  today: tasks.filter(task => !task.completed && task.due === today).length,
  overdue: tasks.filter(task => !task.completed && task.due && task.due < today).length,
  completed: tasks.filter(task => task.completed).length,
});

export function selectTasks(tasks, filter = 'open', query = '', today = localDay()) {
  const search = query.trim().toLowerCase();
  return tasks.filter(task => {
    const matches = filter === 'all' || (filter === 'completed' ? task.completed :
      filter === 'today' ? !task.completed && task.due === today : !task.completed);
    return matches && task.title.toLowerCase().includes(search);
  }).sort((a, b) => Number(a.completed) - Number(b.completed) ||
    (a.due || '9999-12-31').localeCompare(b.due || '9999-12-31') ||
    taskPriorities.indexOf(a.priority) - taskPriorities.indexOf(b.priority) ||
    a.createdAt.localeCompare(b.createdAt));
}
