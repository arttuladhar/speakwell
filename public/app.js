const { categories, durations, escapeHtml, icon, titles } = window.ui;
let course,
  logs = [],
  session = null,
  timer = null,
  toastTimeout,
  authUser = null;
const main = document.querySelector("main");
const sessions = new Map();
let currentHash = location.hash;
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
function renderAuth(mode = "login", message = "") {
  const registering = mode === "register";
  document.body.classList.add("auth-mode");
  main.innerHTML = `<section class="auth-screen" aria-labelledby="auth-title"><div class="auth-card"><div class="auth-mark">s<span>•</span></div><div class="eyebrow">YOUR PERSONAL SPEAKING COACH</div><h1 id="auth-title">${registering ? "Make room for your voice." : "Welcome back."}</h1><p class="auth-intro">${registering ? "Create your space and build a stronger speaking habit, one day at a time." : "Sign in to pick up your practice where you left off."}</p><div class="auth-tabs" role="tablist" aria-label="Account access"><button class="auth-tab ${!registering ? "active" : ""}" data-auth-mode="login" role="tab" aria-selected="${!registering}">Sign in</button><button class="auth-tab ${registering ? "active" : ""}" data-auth-mode="register" role="tab" aria-selected="${registering}">Create account</button></div><form id="auth-form"><div class="auth-fields">${registering ? '<label for="auth-name">Your name</label><input id="auth-name" name="name" autocomplete="name" required minlength="2" />' : ""}<label for="auth-email">Email address</label><input id="auth-email" name="email" type="email" autocomplete="email" required /><label for="auth-password">Password</label><input id="auth-password" name="password" type="password" autocomplete="${registering ? "new-password" : "current-password"}" minlength="8" required /></div><p class="form-error" id="auth-error" role="alert">${escapeHtml(message)}</p><button class="button auth-submit" type="submit">${registering ? "Create my account" : "Sign in"} ${icon("arrow")}</button></form></div></section>`;
  main.querySelector("#auth-form").addEventListener("submit", submitAuth);
  main.querySelectorAll("[data-auth-mode]").forEach((button) =>
    button.addEventListener("click", () => renderAuth(button.dataset.authMode)),
  );
  main.querySelector("input")?.focus();
}
async function submitAuth(event) {
  event.preventDefault();
  const form = event.currentTarget;
  const button = form.querySelector("button[type=submit]");
  const error = form.querySelector("#auth-error");
  const registering = form.querySelector("#auth-name");
  button.disabled = true;
  error.textContent = "";
  try {
    authUser = await api(
      registering ? "/api/auth/register" : "/api/auth/login",
      Object.fromEntries(new FormData(form)),
    );
    document.body.classList.remove("auth-mode");
    await loadCourse();
  } catch (authError) {
    error.textContent = authError.message;
    button.disabled = false;
  }
}
async function loadCourse() {
  [course, logs] = await Promise.all([api("/api/course"), api("/api/logs")]);
  render();
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
const status = (day) => views.getStatus(day, recommended().day);
const stats = () => views.renderStats(course, logs, icon);
function render() {
  document.querySelector("#topbar-username").textContent =
    authUser?.name || "";
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
  const highlights = [
    {
      icon: "book",
      title: "10 focused days",
      body: "Each day builds one specific speaking skill — no overwhelm, just steady progress.",
    },
    {
      icon: "video",
      title: "Record yourself",
      body: "Capture video or audio right in your practice screen, or upload a take you already have.",
    },
    {
      icon: "eye",
      title: "Watch, then listen",
      body: "Review your recording muted, then again with sound, to notice different things each time.",
    },
    {
      icon: "chart",
      title: "Track your progress",
      body: "See every milestone and self-rating whenever you like on My progress.",
      href: "#progress",
    },
    {
      icon: "headphones",
      title: "Reflect in your journal",
      body: "Save a few notes after each session and revisit them in your Practice journal.",
      href: "#journal",
    },
  ];
  main.innerHTML = `<section class="intro"><div><div class="eyebrow">WELCOME TO SPEAKWELL</div><h1>Your voice. A little stronger.</h1><p>A calm, guided space to practice speaking — one small step at a time.</p></div><span class="pill">${icon("spark")} Your journey starts with you</span></section>
  <div class="hero-grid"><section class="hero"><div class="hero-content"><div class="eyebrow"><span class="online-dot"></span>${completed === course.days.length ? "KEEP YOUR MOMENTUM" : day.progress.status === "in_progress" ? "PICK UP WHERE YOU LEFT OFF" : "YOUR NEXT SMALL STEP"} · DAY ${day.day}</div><h2>${escapeHtml(titles[day.day - 1])}</h2><p>${escapeHtml(day.focus)}</p><div class="hero-meta"><span>${icon("clock")} ${escapeHtml(day.exerciseDuration)}</span><span>•</span><span>${categories[day.day - 1]}</span></div><button class="button" data-day="${day.day}">${icon("play")} ${completed === course.days.length ? "Practice again" : day.progress.status === "in_progress" ? "Continue practice" : "Start today’s practice"} ${icon("arrow")}</button></div><div class="hero-art" aria-hidden="true"><div class="orbit"></div><div class="orbit two"></div><div class="orbit three"></div><div class="wave">${[23, 42, 72, 107, 139, 99, 66, 40, 21].map((h) => `<i style="--height:${h}px"></i>`).join("")}</div><span class="art-star">✧</span><span class="art-dot"></span></div></section><aside class="tip"><div class="tip-label">${icon("spark")} A MOMENT OF ENCOURAGEMENT</div><blockquote>“You don’t have to be perfect to be worth listening to.”</blockquote><p>Focus on showing up. The confidence will follow.</p><div class="tip-footer">PROGRESS OVER PERFECTION</div></aside></div>
  <section><div class="section-head"><div><h2>How Speakwell works</h2><p>A simple loop to build a stronger voice, one day at a time.</p></div></div><div class="highlight-grid">${highlights.map((h) => `<${h.href ? `a href="${h.href}"` : "div"} class="highlight-card"><span class="highlight-icon">${icon(h.icon)}</span><h3>${h.title}</h3><p>${h.body}</p></${h.href ? "a" : "div"}>`).join("")}</div></section>`;
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
function renderSession() {
  const { day, step } = session;
  main.innerHTML = `<div class="day-navigation"><a href="#workshop" class="back-link" aria-label="Back to workshop">← Back to workshop</a><div class="day-pagination">${day.day > 1 ? `<a href="#day/${day.day - 1}" aria-label="Previous day">← Day ${day.day - 1}</a>` : ""}<span>Day ${day.day} of ${course.days.length}</span>${day.day < course.days.length ? `<a href="#day/${day.day + 1}" aria-label="Next day">Day ${day.day + 1} →</a>` : ""}</div></div><section class="day-heading"><div class="eyebrow">DAY ${String(day.day).padStart(2, "0")} · ${categories[day.day - 1]}</div><h1 id="practice-title" tabindex="-1">${escapeHtml(titles[day.day - 1])}</h1><p>${escapeHtml(day.focus)}</p><span class="pill">${icon("clock")} ${escapeHtml(day.exerciseDuration)}</span></section><div class="day-layout"><section class="practice-panel" aria-label="Guided practice">${step < 3 ? `<div class="stepper" aria-label="Practice steps">${["Prepare", "Practice", "Reflect"].map((s, i) => `<span class="${i === step ? "active" : ""}" ${i === step ? 'aria-current="step"' : ""}>${i + 1}. ${s}</span>`).join("")}</div>` : ""}<div class="practice-body" id="session-body"></div><div id="recording-slot"></div></section><aside class="day-support" aria-label="Learning support">${views.renderResources(day, icon, escapeHtml)}<div class="coach-note"><h3>One step at a time</h3>Prepare your ideas, make room to practice, then reflect on one thing you want to improve. You can revisit any day whenever you like.</div></aside></div>`;
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
document.querySelector("#logout-button").addEventListener("click", async () => {
  try {
    const response = await fetch("/api/auth/logout", { method: "POST" });
    if (!response.ok && response.status !== 401)
      throw new Error("Could not log out");
    recordings.stop();
    stopTimer();
    sessions.clear();
    session = null;
    course = undefined;
    logs = [];
    authUser = null;
    history.replaceState(null, "", "#workshop");
    renderAuth();
  } catch {
    notify("Could not log out. Please retry.");
  }
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
    authUser = await api("/api/auth/me");
    await loadCourse();
  } catch (error) {
      if (error.message === "Please sign in to continue.") {
        renderAuth();
        return;
      }
    main.innerHTML = `<section class="empty"><h1>Let’s try that again.</h1><p>We couldn’t load your workshop. Your saved progress is still here.</p><p>${escapeHtml(error.message)}</p><button class="button" id="retry-load">Retry</button></section>`;
  }
}
load();
