window.views = (() => {
  function renderResources(day, icon, escapeHtml) {
    if (!day.resources?.length) return '';
    return `<details class="learning-resources"><summary>${icon('book')} Supporting resources <span>${day.resources.length} optional learning tools</span></summary><div class="resource-list"><p>Explore before you start, or come back after practice. Articles open in a new tab.</p>${day.resources.map((resource) => `<article class="resource-card"><div class="resource-meta">${escapeHtml(resource.type)} · ${escapeHtml(resource.source)}</div>${resource.url ? `<h4><a href="${escapeHtml(resource.url)}" target="_blank" rel="noopener noreferrer">${escapeHtml(resource.title)} ${icon('arrow')}<span class="sr-only"> (opens in a new tab)</span></a></h4><p>${escapeHtml(resource.description)}</p>` : `<h4>${escapeHtml(resource.title)}</h4><ol>${resource.steps.map((step) => `<li>${escapeHtml(step)}</li>`).join('')}</ol>`}</article>`).join('')}</div></details>`;
  }

  function renderStats(course, logs, icon) {
    const completed = course.days.filter(
      (day) => day.progress.status === 'completed',
    ).length;
    const rated = logs.filter((log) => log.confidence_level !== null);
    const confidence = rated.length
      ? (rated.reduce((total, log) => total + log.confidence_level, 0) / rated.length).toFixed(1)
      : '—';
    return `<section class="stats" aria-label="Your practice statistics"><div class="stat"><span class="stat-icon">${icon('check')}</span><div><strong>${completed}<span> / ${course.days.length}</span></strong><p>Days completed</p></div></div><div class="stat"><span class="stat-icon">${icon('clock')}</span><div><strong>${logs.reduce((total, log) => total + log.duration_minutes, 0)}<span> min</span></strong><p>Time invested in you</p></div></div><div class="stat"><span class="stat-icon">${icon('chart')}</span><div><strong>${confidence}<span> / 10</span></strong><p>Average self-rated confidence</p></div></div></section>`;
  }

  function getStatus(day, recommendedDay) {
    return day.progress.status === 'completed'
      ? 'Completed'
      : day.progress.status === 'in_progress'
        ? 'In progress'
        : day.day === recommendedDay
          ? 'Up next'
          : 'Not started';
  }

  return { getStatus, renderResources, renderStats };
})();
