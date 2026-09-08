const paths = {
  grid: '<rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/>',
  chart: '<path d="M4 3v17h17M9 15v-4m5 4V7m5 8V4"/>',
  book: '<path d="M12 5v16M12 5C8 2 4 3 2 4v15c4-2 7-1 10 2 3-3 6-4 10-2V4c-2-1-6-2-10 1Z"/>',
  clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
  check: '<path d="m5 12 4 4L19 6"/>',
  spark:
    '<path d="m12 3 2.5 6.5L21 12l-6.5 2.5L12 21l-2.5-6.5L3 12l6.5-2.5Z"/>',
  arrow: '<path d="M4 12h16m-6-6 6 6-6 6"/>',
  play: '<path d="m9 5 11 7-11 7Z"/>',
  video:
    '<rect x="3" y="5" width="12" height="14" rx="2"/><path d="m15 10 6-4v12l-6-4"/>',
  eye: '<path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12Z"/><circle cx="12" cy="12" r="3"/>',
  headphones:
    '<path d="M4 14v-3a8 8 0 0 1 16 0v3"/><rect x="3" y="12" width="4" height="8" rx="2"/><rect x="17" y="12" width="4" height="8" rx="2"/>',
  close: '<path d="m6 6 12 12M6 18 18 6"/>',
};
const icon = (name) =>
  `<svg viewBox="0 0 24 24" aria-hidden="true">${paths[name] || paths.spark}</svg>`;
const escapeHtml = (value) =>
  String(value ?? "").replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        c
      ],
  );
let course,
  logs = [],
  session = null,
  timer = null,
  toastTimeout;
const main = document.querySelector("main");
const sessions = new Map();
let currentHash = location.hash;
const durations = [120, 180, 180, 120, 90, 720, 180, 300, 300, 420];
const categories = [
  "Fluency & confidence",
  "Vocal variety",
  "Pace & clarity",
  "Presence & expression",
  "Storytelling",
  "Bring it all together",
  "Clear communication",
  "Thinking on your feet",
  "Meaningful updates",
  "Persuasive speaking",
];
const titles = [
  "Removing the Filter",
  "The Volume Dial",
  "Conquering Filler Words",
  "Speak with a Smile",
  "Past, Present, Future",
  "Integration & Recap",
  "Get to the Point",
  "Word Association Lightning",
  "What? So What? Now What?",
  "The PREP Framework",
];
async function api(url, body, method = "POST") {
  const response = await fetch(
    url,
    body === undefined
      ? undefined
      : {
          method,
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        },
  );
  const data = await response.json();
  if (!response.ok)
    throw new Error(data.error || "Something went wrong. Please try again.");
  return data;
}
function notify(message) {
  const toast = document.querySelector("#toast");
  toast.textContent = message;
  toast.style.display = "block";
  clearTimeout(toastTimeout);
  toastTimeout = setTimeout(() => (toast.style.display = "none"), 4500);
}
function recommended() {
  return (
    course.days.find((d) => d.progress.status === "in_progress") ||
    course.days.find((d) => d.progress.status !== "completed") ||
    course.days[0]
  );
}
function status(day) {
  return day.progress.status === "completed"
    ? "Completed"
    : day.progress.status === "in_progress"
      ? "In progress"
      : day.day === recommended().day
        ? "Up next"
        : "Not started";
}
function stats() {
  const completed = course.days.filter(
    (d) => d.progress.status === "completed",
  ).length;
  const rated = logs.filter((l) => l.confidence_level !== null);
  const confidence = rated.length
    ? (
        rated.reduce((a, l) => a + l.confidence_level, 0) / rated.length
      ).toFixed(1)
    : "—";
  return `<section class="stats" aria-label="Your practice statistics"><div class="stat"><span class="stat-icon">${icon("check")}</span><div><strong>${completed}<span> / ${course.days.length}</span></strong><p>Days completed</p></div></div><div class="stat"><span class="stat-icon">${icon("clock")}</span><div><strong>${logs.reduce((a, l) => a + l.duration_minutes, 0)}<span> min</span></strong><p>Time invested in you</p></div></div><div class="stat"><span class="stat-icon">${icon("chart")}</span><div><strong>${confidence}<span> / 10</span></strong><p>Average self-rated confidence</p></div></div></section>`;
}
function render() {
  const dayMatch = /^#day\/(\d+)$/.exec(location.hash);
  const selectedDay =
    dayMatch && course.days.find((day) => day.day === Number(dayMatch[1]));
  const view = ["progress", "journal"].includes(location.hash.slice(1))
    ? location.hash.slice(1)
    : "workshop";
  document.querySelectorAll("[data-nav]").forEach((a) => {
    a.classList.toggle("active", a.dataset.nav === view);
    if (a.dataset.nav === view) a.setAttribute("aria-current", "page");
    else a.removeAttribute("aria-current");
  });
  document.querySelector("#page-label").textContent = {
    workshop: "My workshop",
    progress: "My progress",
    journal: "Practice journal",
  }[view];
  if (selectedDay) {
    document.querySelector("#page-label").textContent =
      `My workshop / Day ${selectedDay.day}`;
    document.title = `Day ${selectedDay.day}: ${titles[selectedDay.day - 1]} — Speakwell`;
    openPractice(selectedDay.day);
    return;
  }
  session = null;
  document.title = "Speakwell — Your speaking journey";
  if (location.hash.startsWith("#day/")) {
    main.innerHTML = `<section class="empty"><h1>That day isn’t in your workshop.</h1><p>Choose one of the 10 days to keep practicing.</p><a class="button" href="#workshop">Back to workshop</a></section>`;
    return;
  }
  if (view === "workshop") renderWorkshop();
  if (view === "progress") renderProgress();
  if (view === "journal") renderJournal();
}
function renderWorkshop() {
  const day = recommended(),
    completed = course.days.filter(
      (d) => d.progress.status === "completed",
    ).length;
  main.innerHTML = `<section class="intro"><div><div class="eyebrow">A LITTLE PRACTICE. A LOT OF POSSIBILITY.</div><h1>Your voice. A little stronger.</h1><p>Build the confidence to speak up, one small step at a time.</p></div><span class="pill">${icon("spark")} Your journey starts with you</span></section>${stats()}
  <div class="hero-grid"><section class="hero"><div class="hero-content"><div class="eyebrow"><span class="online-dot"></span>${completed === course.days.length ? "KEEP YOUR MOMENTUM" : day.progress.status === "in_progress" ? "PICK UP WHERE YOU LEFT OFF" : "YOUR NEXT SMALL STEP"} · DAY ${day.day}</div><h2>${escapeHtml(titles[day.day - 1])}</h2><p>${escapeHtml(day.focus)}</p><div class="hero-meta"><span>${icon("clock")} ${escapeHtml(day.exerciseDuration)}</span><span>•</span><span>${categories[day.day - 1]}</span></div><button class="button" data-day="${day.day}">${icon("play")} ${completed === course.days.length ? "Practice again" : day.progress.status === "in_progress" ? "Continue practice" : "Start today’s practice"} ${icon("arrow")}</button></div><div class="hero-art" aria-hidden="true"><div class="orbit"></div><div class="orbit two"></div><div class="orbit three"></div><div class="wave">${[23, 42, 72, 107, 139, 99, 66, 40, 21].map((h) => `<i style="--height:${h}px"></i>`).join("")}</div><span class="art-star">✧</span><span class="art-dot"></span></div></section><aside class="tip"><div class="tip-label">${icon("spark")} A MOMENT OF ENCOURAGEMENT</div><blockquote>“You don’t have to be perfect to be worth listening to.”</blockquote><p>Focus on showing up. The confidence will follow.</p><div class="tip-footer">PROGRESS OVER PERFECTION</div></aside></div>
  <section><div class="section-head"><div><h2>Your 10-day journey</h2><p>One focus each day. Skills that stay with you.</p></div><span>${completed} of ${course.days.length} completed</span></div><div class="journey-progress" role="progressbar" aria-label="Course completion" aria-valuenow="${completed}" aria-valuemin="0" aria-valuemax="${course.days.length}"><span style="width:${(completed / course.days.length) * 100}%"></span></div><div class="course-grid">${course.days.map((d) => `<button class="day-card ${d.day === day.day ? "current" : ""}" data-day="${d.day}"><div class="card-top"><span class="day-number">DAY ${String(d.day).padStart(2, "0")}</span><span class="status ${d.progress.status} ${d.day === day.day ? "ready" : ""}">${status(d)}</span></div><h3>${escapeHtml(titles[d.day - 1])}</h3><p>${escapeHtml(d.focus)}</p><div class="card-bottom"><span>${icon("clock")} ${escapeHtml(d.exerciseDuration)}</span><span class="arrow">${icon(d.progress.status === "completed" ? "check" : "arrow")}</span></div></button>`).join("")}</div></section><section class="method"><div><h3>A simple loop. Real progress.</h3><p>Record in your practice screen, then discover what’s working.</p></div><div class="method-steps"><span>${icon("video")} Record yourself</span>→<span>${icon("eye")} Watch muted</span>→<span>${icon("headphones")} Listen back</span></div></section>`;
}
function renderProgress() {
  main.innerHTML = `<section class="intro"><div><div class="eyebrow">EVERY SESSION COUNTS</div><h1>Look how far you’re going.</h1><p>Your practice adds up. Make space to notice it.</p></div></section>${stats()}<div class="section-head"><div><h2>Your milestones</h2><p>Revisit any exercise whenever you need a little extra practice.</p></div></div>${course.days.map((d) => `<div class="progress-row"><div><strong>Day ${d.day} · ${escapeHtml(titles[d.day - 1])}</strong><small>${status(d)}${d.progress.selfRating ? ` · Self-rating: ${d.progress.selfRating}/10` : ""}</small></div><button class="button secondary" data-day="${d.day}">${d.progress.status === "completed" ? "Revisit" : "Practice"} ${icon("arrow")}</button></div>`).join("")}`;
}
function renderJournal() {
  main.innerHTML = `<section class="intro"><div><div class="eyebrow">YOUR WORDS. YOUR GROWTH.</div><h1>A record of showing up.</h1><p>Revisit your reflections and see what’s getting easier.</p></div><button class="button" data-day="${recommended().day}">New practice ${icon("arrow")}</button></section>${logs.length ? `<div class="journal-list">${logs.map((l) => `<article class="journal-entry"><div class="eyebrow">DAY ${l.day} · ${new Date(l.created_at.replace(" ", "T") + "Z").toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })}</div><h3>${escapeHtml(titles[l.day - 1])}</h3><div class="journal-meta"><span>${l.duration_minutes} min practiced</span><span>Confidence ${l.confidence_level ?? "—"}/10</span><span>Energy ${l.energy_level ?? "—"}/10</span></div><p>${escapeHtml(l.notes || "You made time to practice. That counts.")}</p></article>`).join("")}</div>` : `<section class="empty">${icon("book")}<h2>Your first entry is waiting.</h2><p>Complete a practice and save a reflection.<br>You’ll find your sessions and personal insights here.</p><button class="button" data-day="${recommended().day}">Start your first practice ${icon("arrow")}</button></section>`}`;
  main.insertAdjacentHTML("beforeend", '<div id="journal-recordings"></div>');
  recordings.mountJournal();
}
function openPractice(dayNumber) {
  const day = course.days.find((d) => d.day === dayNumber);
  session = sessions.get(dayNumber) || {
    day,
    step: 0,
    remaining: durations[dayNumber - 1],
    elapsed: 0,
    running: false,
    reflection: null,
    logSaved: false,
  };
  sessions.set(dayNumber, session);
  renderSession();
}
function stopTimer() {
  if (session?.running) {
    const delta = Math.max(0, (Date.now() - session.startedAt) / 1000);
    session.elapsed += delta;
    session.remaining = Math.max(0, session.remaining - delta);
    session.running = false;
  }
  clearInterval(timer);
}
function timerText() {
  const seconds = Math.ceil(session.remaining);
  return `${String(Math.floor(seconds / 60)).padStart(2, "0")}:${String(seconds % 60).padStart(2, "0")}`;
}
function startTimer() {
  session.running = true;
  session.startedAt = Date.now();
  const initialRemaining = session.remaining;
  document.querySelector("#toggle-timer").textContent = "Pause";
  timer = setInterval(() => {
    const left = Math.max(
      0,
      initialRemaining - (Date.now() - session.startedAt) / 1000,
    );
    document.querySelector("#timer-time").textContent =
      `${String(Math.floor(Math.ceil(left) / 60)).padStart(2, "0")}:${String(Math.ceil(left) % 60).padStart(2, "0")}`;
    if (left === 0) {
      stopTimer();
      renderSession();
      notify("Practice time complete. Ready to reflect?");
    }
  }, 200);
}
function renderResources(day) {
  if (!day.resources?.length) return "";
  return `<details class="learning-resources"><summary>${icon("book")} Supporting resources <span>${day.resources.length} optional learning tools</span></summary><div class="resource-list"><p>Explore before you start, or come back after practice. Articles open in a new tab.</p>${day.resources.map((resource) => `<article class="resource-card"><div class="resource-meta">${escapeHtml(resource.type)} · ${escapeHtml(resource.source)}</div>${resource.url ? `<h4><a href="${escapeHtml(resource.url)}" target="_blank" rel="noopener noreferrer">${escapeHtml(resource.title)} ${icon("arrow")}<span class="sr-only"> (opens in a new tab)</span></a></h4><p>${escapeHtml(resource.description)}</p>` : `<h4>${escapeHtml(resource.title)}</h4><ol>${resource.steps.map((step) => `<li>${escapeHtml(step)}</li>`).join("")}</ol>`}</article>`).join("")}</div></details>`;
}

function renderSession() {
  const { day, step } = session;
  main.innerHTML = `<div class="day-navigation"><a href="#workshop" class="back-link" aria-label="Back to workshop">← Back to workshop</a><div class="day-pagination">${day.day > 1 ? `<a href="#day/${day.day - 1}" aria-label="Previous day">← Day ${day.day - 1}</a>` : ""}<span>Day ${day.day} of ${course.days.length}</span>${day.day < course.days.length ? `<a href="#day/${day.day + 1}" aria-label="Next day">Day ${day.day + 1} →</a>` : ""}</div></div><section class="day-heading"><div class="eyebrow">DAY ${String(day.day).padStart(2, "0")} · ${categories[day.day - 1]}</div><h1 id="practice-title" tabindex="-1">${escapeHtml(titles[day.day - 1])}</h1><p>${escapeHtml(day.focus)}</p><span class="pill">${icon("clock")} ${escapeHtml(day.exerciseDuration)}</span></section><div class="day-layout"><section class="practice-panel" aria-label="Guided practice">${step < 3 ? `<div class="stepper" aria-label="Practice steps">${["Prepare", "Practice", "Reflect"].map((s, i) => `<span class="${i === step ? "active" : ""}" ${i === step ? 'aria-current="step"' : ""}>${i + 1}. ${s}</span>`).join("")}</div>` : ""}<div class="practice-body" id="session-body"></div><div id="recording-slot"></div></section><aside class="day-support" aria-label="Learning support">${renderResources(day)}<div class="coach-note"><h3>One step at a time</h3>Prepare your ideas, make room to practice, then reflect on one thing you want to improve. You can revisit any day whenever you like.</div></aside></div>`;
  const body = main.querySelector("#session-body");
  const resources = main.querySelector(".learning-resources");
  if (resources) resources.open = true;
  if (step === 0)
    body.innerHTML = `<p>${escapeHtml(day.presentation)}</p><h3>Here’s your exercise</h3><ol class="instructions">${day.exercise.map((e) => `<li>${escapeHtml(e)}</li>`).join("")}</ol><div class="coach-note">${icon("video")} Use the recording panel below to capture video or audio, or upload a take you already have. Review it before saving it to this day.</div><div class="practice-actions"><button class="button secondary" id="close-lesson">Back to workshop</button><button class="button" id="begin-practice">Let’s practice ${icon("arrow")}</button></div><p class="form-error" role="alert"></p>`;
  if (step === 1)
    body.innerHTML = `<div class="timer"><div class="eyebrow">${session.remaining === 0 ? "NICE WORK. TAKE A BREATH." : "GIVE YOURSELF ROOM TO SPEAK"}</div><div class="timer-time" id="timer-time" role="timer" aria-label="Time remaining">${timerText()}</div><div class="timer-controls"><button class="button" id="toggle-timer" ${session.remaining === 0 ? "disabled" : ""}>${session.running ? "Pause" : session.elapsed ? "Resume timer" : "Start timer"}</button><button class="button secondary" id="reset-timer">Reset</button></div><p>${escapeHtml(day.exercise[0])}</p></div><details open><summary>Your exercise reminders</summary><ul>${day.exercise
      .slice(1)
      .map((e) => `<li>${escapeHtml(e)}</li>`)
      .join(
        "",
      )}</ul></details><div class="practice-actions"><button class="button secondary" id="back-prepare">Review instructions</button><button class="button" id="finish-practice">Finish & reflect ${icon("arrow")}</button></div>`;
  if (step === 2) {
    const draft = session.reflection || {
      minutes: Math.max(1, Math.min(180, Math.ceil(session.elapsed / 60))),
      confidence: "",
      energy: "",
      rating: day.progress.selfRating || "",
      notes: "",
    };
    body.innerHTML = `<h3>What did you notice?</h3><p>If you recorded, watch once on mute for body language, then listen for pacing and filler words. Use these prompts to guide your self-review.</p><ul class="reflect-prompts">${day.reflection.map((r) => `<li>${escapeHtml(r)}</li>`).join("")}</ul><form id="reflection-form"><div class="form-grid"><div><label for="minutes">Minutes practiced</label><input id="minutes" name="minutes" type="number" min="1" max="180" required value="${draft.minutes}"></div><div><label for="confidence">Confidence (1–10)</label><input id="confidence" name="confidence" type="number" min="1" max="10" placeholder="Optional" value="${draft.confidence}"></div><div><label for="energy">Energy (1–10)</label><input id="energy" name="energy" type="number" min="1" max="10" placeholder="Optional" value="${draft.energy}"></div></div><label for="rating">Overall self-rating (1–10, optional)</label><input id="rating" name="rating" type="number" min="1" max="10" value="${draft.rating}" placeholder="How did this exercise feel?"><label for="notes">Your reflection <span style="font-weight:400">(optional)</span></label><textarea id="notes" name="notes" placeholder="One thing that went well. One thing to try next time…">${escapeHtml(draft.notes)}</textarea>${day.progress.notes ? `<details><summary>Your previous day notes</summary><p>${escapeHtml(day.progress.notes)}</p></details>` : ""}<p class="form-error" role="alert"></p><div class="practice-actions"><button type="button" class="button secondary" id="back-practice">Keep practicing</button><button class="button" type="submit">Save & complete day ${icon("check")}</button></div></form>`;
    body.querySelector("form").addEventListener("submit", saveSession);
    if (session.logSaved)
      body
        .querySelectorAll("input,textarea")
        .forEach((el) => (el.disabled = true));
  }
  if (step === 3) {
    const next =
      course.days.find(
        (d) => d.day > day.day && d.progress.status !== "completed",
      ) || course.days.find((d) => d.progress.status !== "completed");
    body.innerHTML = `<div class="success"><div class="success-mark">${icon("check")}</div><div class="eyebrow">DAY ${day.day} COMPLETE</div><h2>You showed up for your voice.</h2><p>Your session and reflection are saved.<br>${next ? `Up next: ${escapeHtml(titles[next.day - 1])}. Come back whenever you’re ready.` : "You’ve completed your 10-day journey. Revisit any exercise to keep growing."}</p><div class="practice-actions"><button class="button secondary" id="view-journal">View your journal</button><button class="button secondary" id="practice-again">Practice again</button><button class="button" id="close-lesson">Back to workshop ${icon("arrow")}</button></div></div>`;
  }
  recordings.mount(day.day, step < 2);
  main.querySelector("#practice-title").focus({ preventScroll: true });
}
async function saveSession(event) {
  event.preventDefault();
  const form = event.target;
  if (!session.logSaved)
    session.reflection = Object.fromEntries(new FormData(form));
  const draft = session.reflection,
    day = session.day;
  const button = form.querySelector('[type="submit"]');
  button.disabled = true;
  button.textContent = "Saving…";
  form.querySelector("#back-practice").disabled = true;
  session.saving = true;
  try {
    if (!session.logSaved) {
      const log = await api("/api/logs", {
        day: day.day,
        durationMinutes: Number(draft.minutes),
        energyLevel: draft.energy ? Number(draft.energy) : null,
        confidenceLevel: draft.confidence ? Number(draft.confidence) : null,
        notes: draft.notes,
      });
      logs.unshift(log);
      session.logSaved = true;
      form
        .querySelectorAll("input,textarea")
        .forEach((el) => (el.disabled = true));
    }
    await api(
      `/api/progress/${day.day}`,
      {
        status: "completed",
        notes: draft.notes || day.progress.notes,
        selfRating: draft.rating ? Number(draft.rating) : null,
      },
      "PUT",
    );
    day.progress = {
      ...day.progress,
      status: "completed",
      notes: draft.notes || day.progress.notes,
      selfRating: draft.rating ? Number(draft.rating) : null,
    };
    session.step = 3;
    renderSession();
  } catch (error) {
    form.querySelector(".form-error").textContent =
      (session.logSaved
        ? "Your session is saved. Retry to mark the day complete. "
        : "") + error.message;
    button.disabled = false;
    button.textContent = "Retry save";
    form.querySelector("#back-practice").disabled = session.logSaved;
  } finally {
    session.saving = false;
  }
}
function rememberPractice() {
  recordings.stop();
  const form = main.querySelector("#reflection-form");
  if (form && session && !session.logSaved) {
    session.reflection = Object.fromEntries(new FormData(form));
  }
  stopTimer();
}
main.addEventListener("click", async (event) => {
  const button = event.target.closest("button");
  if (!button || button.disabled) return;
  switch (button.id) {
    case "close-lesson":
      location.hash = "workshop";
      break;
    case "begin-practice":
      button.disabled = true;
      session.saving = true;
      try {
        if (session.day.progress.status === "not_started") {
          await api(
            `/api/progress/${session.day.day}`,
            { ...session.day.progress, status: "in_progress" },
            "PUT",
          );
          session.day.progress.status = "in_progress";
        }
        session.step = 1;
        renderSession();
      } catch (error) {
        main.querySelector(".form-error").textContent = error.message;
        button.disabled = false;
      } finally {
        session.saving = false;
      }
      break;
    case "toggle-timer":
      if (session.running) {
        stopTimer();
        renderSession();
      } else startTimer();
      break;
    case "reset-timer":
      stopTimer();
      session.remaining = durations[session.day.day - 1];
      renderSession();
      break;
    case "back-prepare":
      recordings.stop();
      stopTimer();
      session.step = 0;
      renderSession();
      break;
    case "finish-practice":
      recordings.stop();
      stopTimer();
      session.step = 2;
      renderSession();
      break;
    case "back-practice":
      session.reflection = Object.fromEntries(
        new FormData(main.querySelector("form")),
      );
      session.step = 1;
      renderSession();
      break;
    case "practice-again":
      sessions.delete(session.day.day);
      openPractice(session.day.day);
      break;
    case "view-journal":
      location.hash = "journal";
      break;
  }
});
main.addEventListener("click", (event) => {
  const button = event.target.closest("[data-day]");
  if (button) location.hash = `day/${button.dataset.day}`;
  if (event.target.closest("#retry-load")) load();
});
window.addEventListener("hashchange", () => {
  if (session?.saving) {
    history.replaceState(null, "", currentHash || "#workshop");
    notify("Your progress is saving. Please wait a moment.");
    return;
  }
  rememberPractice();
  currentHash = location.hash;
  if (course) {
    render();
    main.focus({ preventScroll: true });
    window.scrollTo(0, 0);
  }
});
document.querySelector(".skip-link").addEventListener("click", (event) => {
  event.preventDefault();
  main.focus();
});
window.addEventListener("beforeunload", (event) => {
  if ([...sessions.values()].some((s) => s.step > 0 && s.step < 3)) {
    event.preventDefault();
    event.returnValue = "";
  }
});
document
  .querySelectorAll("[data-icon]")
  .forEach((el) => (el.innerHTML = icon(el.dataset.icon)));
async function load() {
  try {
    [course, logs] = await Promise.all([api("/api/course"), api("/api/logs")]);
    render();
  } catch (error) {
    main.innerHTML = `<section class="empty"><h1>Let’s try that again.</h1><p>We couldn’t load your workshop. Your saved progress is still here.</p><p>${escapeHtml(error.message)}</p><button class="button" id="retry-load">Retry</button></section>`;
  }
}
load();
