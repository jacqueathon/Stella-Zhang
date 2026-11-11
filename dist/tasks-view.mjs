import {escapeHtml as esc} from './core.mjs';
import {localDay, taskCounts, selectTasks, taskPriorities} from './tasks.mjs';

const formatDate = value => new Date(`${value}T12:00:00`).toLocaleDateString(undefined, {month:'short', day:'numeric', year:'numeric'});

export function taskRows(tasks, {compact = false, today = localDay()} = {}) {
  return `<ul class="task-list">${tasks.map(task => {
    const overdue = !task.completed && task.due && task.due < today;
    const due = task.due === today ? 'Today' : task.due ? formatDate(task.due) : 'No due date';
    return `<li class="task-row ${task.completed ? 'is-complete' : ''}">
      <label class="task-check"><input type="checkbox" data-task-toggle="${esc(task.id)}" ${task.completed ? 'checked' : ''} aria-label="${esc(`Mark ${task.title} ${task.completed ? 'incomplete' : 'complete'}`)}"></label>
      <div class="task-copy"><span class="task-title">${esc(task.title)}</span><div class="task-meta"><span class="task-priority priority-${task.priority.toLowerCase()}">${esc(task.priority)} priority</span><span class="${overdue ? 'task-overdue' : ''}">${overdue ? 'Overdue · ' : ''}${esc(due)}</span></div></div>
      ${compact ? '' : `<div class="task-actions"><button class="btn quiet small" data-action="edit-task" data-id="${esc(task.id)}" aria-label="${esc(`Edit ${task.title}`)}">Edit</button><button class="btn outline small" data-action="delete-task" data-id="${esc(task.id)}" aria-label="${esc(`Delete ${task.title}`)}">Delete</button></div>`}
    </li>`;
  }).join('')}</ul>`;
}

export function taskWidget(tasks) {
  const counts = taskCounts(tasks), next = selectTasks(tasks).slice(0, 3);
  return `<section class="panel task-widget" aria-labelledby="taskWidgetHeading"><div class="section-heading"><div><p class="eyebrow">YOUR NEXT SMALL WIN</p><h2 id="taskWidgetHeading">Next on your list</h2><p class="subtitle">${counts.open ? `${counts.open} open · ${counts.today} due today${counts.overdue ? ` · ${counts.overdue} overdue` : ''}` : 'Make room for one useful next step.'}</p></div><button class="text-button" data-action="nav" data-view="tasks">Open to-do list →</button></div>${next.length ? taskRows(next, {compact:true}) : `<p class="subtitle">${tasks.length ? 'All caught up. Your completed tasks are saved in your list.' : 'Add a task for coursework, an application or anything you want to move forward.'}</p>`}</section>`;
}

export function taskPage(tasks, filter, query, persistent = true) {
  const counts = taskCounts(tasks), visible = selectTasks(tasks, filter, query);
  const percent = tasks.length ? Math.round(counts.completed / tasks.length * 100) : 0;
  const empty = query ? 'No tasks match your search.' : filter === 'completed' ? 'Your completed tasks will appear here.' : filter === 'today' ? 'Nothing due today. You can still work ahead.' : tasks.length ? 'All caught up. Add your next step when you are ready.' : 'A clear list starts with one small step. Add your first task above.';
  return `<div class="task-summary"><div class="panel"><strong>${counts.open}</strong><span>Open tasks</span></div><div class="panel"><strong>${counts.today}</strong><span>Due today${counts.overdue ? ` · ${counts.overdue} overdue` : ''}</span></div><div class="panel"><strong>${counts.completed}</strong><span>Completed</span><progress max="100" value="${percent}" aria-label="${percent}% of tasks completed"></progress></div></div>
    <section class="panel task-board" aria-labelledby="taskListHeading">
      <form id="taskForm" class="task-form"><label class="task-title-input">What is your next step?<input name="title" required maxlength="160" placeholder="e.g. Finish my project proposal" autocomplete="off"></label><label>Due date <span class="subtitle">(optional)</span><input name="due" type="date"></label><label>Priority<select name="priority">${taskPriorities.map(p => `<option ${p === 'Medium' ? 'selected' : ''}>${p}</option>`).join('')}</select></label><button class="btn" type="submit">Add task</button></form>
      <div class="task-toolbar"><h2 id="taskListHeading" class="visually-hidden">Your tasks</h2><div class="task-filters" role="group" aria-label="Filter tasks">${[['open','Open',counts.open],['today','Today',counts.today],['all','All',tasks.length],['completed','Completed',counts.completed]].map(([key,label,count]) => `<button class="${key === filter ? 'active' : ''}" data-action="task-filter" data-filter="${key}" aria-pressed="${key === filter}">${label} <span>${count}</span></button>`).join('')}</div><label class="task-search"><span class="visually-hidden">Search tasks</span><input type="search" data-search="tasks" placeholder="Search tasks" value="${esc(query)}"></label></div>
      <p class="task-result-count subtitle" role="status">${visible.length} ${visible.length === 1 ? 'task' : 'tasks'} shown · Due dates first, then priority</p>
      ${visible.length ? taskRows(visible) : `<div class="task-empty"><h3>${query ? 'Try another search' : 'A little breathing room'}</h3><p>${empty}</p></div>`}
    </section><p class="task-storage-note subtitle">${persistent ? 'Saved automatically for this demo profile in this browser.' : 'Session only: browser storage is unavailable.'} Export progress to keep a copy of your tasks.</p>`;
}

export function taskEditForm(task) {
  return `<form id="editTaskForm" data-id="${esc(task.id)}"><div class="form-grid"><label class="full">Task<input name="title" required maxlength="160" value="${esc(task.title)}"></label><label>Due date (optional)<input name="due" type="date" value="${esc(task.due)}"></label><label>Priority<select name="priority">${taskPriorities.map(p => `<option ${p === task.priority ? 'selected' : ''}>${p}</option>`).join('')}</select></label></div><div class="form-actions"><button type="button" class="btn quiet" data-action="close">Cancel</button><button type="submit" class="btn">Save task</button></div></form>`;
}
