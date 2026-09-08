window.ui = (() => {
  const paths = {
    grid: '<rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/>',
    chart: '<path d="M4 3v17h17M9 15v-4m5 4V7m5 8V4"/>',
    book: '<path d="M12 5v16M12 5C8 2 4 3 2 4v15c4-2 7-1 10 2 3-3 6-4 10-2V4c-2-1-6-2-10 1Z"/>',
    clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
    check: '<path d="m5 12 4 4L19 6"/>',
    spark: '<path d="m12 3 2.5 6.5L21 12l-6.5 2.5L12 21l-2.5-6.5L3 12l6.5-2.5Z"/>',
    arrow: '<path d="M4 12h16m-6-6 6 6-6 6"/>',
    play: '<path d="m9 5 11 7-11 7Z"/>',
    video: '<rect x="3" y="5" width="12" height="14" rx="2"/><path d="m15 10 6-4v12l-6-4"/>',
    eye: '<path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12Z"/><circle cx="12" cy="12" r="3"/>',
    headphones: '<path d="M4 14v-3a8 8 0 0 1 16 0v3"/><rect x="3" y="12" width="4" height="8" rx="2"/><rect x="17" y="12" width="4" height="8" rx="2"/>',
    close: '<path d="m6 6 12 12M6 18 18 6"/>',
  };
  const icon = (name) =>
    `<svg viewBox="0 0 24 24" aria-hidden="true">${paths[name] || paths.spark}</svg>`;
  const escapeHtml = (value) =>
    String(value ?? '').replace(
      /[&<>"']/g,
      (character) =>
        ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[
          character
        ],
    );

  return {
    categories: [
      'Fluency & confidence',
      'Vocal variety',
      'Pace & clarity',
      'Presence & expression',
      'Storytelling',
      'Bring it all together',
      'Clear communication',
      'Thinking on your feet',
      'Meaningful updates',
      'Persuasive speaking',
    ],
    durations: [120, 180, 180, 120, 90, 720, 180, 300, 300, 420],
    escapeHtml,
    icon,
    titles: [
      'Removing the Filter',
      'The Volume Dial',
      'Conquering Filler Words',
      'Speak with a Smile',
      'Past, Present, Future',
      'Integration & Recap',
      'Get to the Point',
      'Word Association Lightning',
      'What? So What? Now What?',
      'The PREP Framework',
    ],
  };
})();
