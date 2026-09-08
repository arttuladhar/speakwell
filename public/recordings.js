// Keep each day's recorder DOM alive across practice-step renders.
window.recordings = (() => {
  const takes = new Map();
  const MAX_BYTES = 50 * 1024 * 1024;
  const types = [
    "video/webm",
    "audio/webm",
    "video/mp4",
    "audio/mp4",
    "audio/ogg",
    "audio/wav",
  ];
  const supported = () =>
    !!(
      window.isSecureContext &&
      navigator.mediaDevices?.getUserMedia &&
      window.MediaRecorder
    );
  const uid = () =>
    Array.from(crypto.getRandomValues(new Uint8Array(16)), (n) =>
      n.toString(16).padStart(2, "0"),
    ).join("");
  const time = (seconds) =>
    `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`;
  const player = (mime, url, label) => {
    const tag = mime.startsWith("video/") ? "video" : "audio";
    return `<${tag} class="recording-player" controls playsinline preload="metadata" src="${escapeHtml(url)}" aria-label="${escapeHtml(label)}"></${tag}>`;
  };
  async function request(url, options) {
    const response = await fetch(url, options);
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || "Please try again.");
    return data;
  }
  function library(day) {
    const root = document.createElement("section");
    root.className = "recording-library";
    root.setAttribute(
      "aria-label",
      day ? `Saved recordings for Day ${day}` : "Saved recordings",
    );
    root.innerHTML =
      '<h3>Saved recordings</h3><div class="saved-takes" aria-live="polite">Loading recordings…</div>';
    const list = root.querySelector(".saved-takes");
    let version = 0;
    root.refresh = async () => {
      const current = ++version;
      try {
        const rows = await request(
          `/api/recordings${day ? `?day=${day}` : ""}`,
        );
        if (current !== version) return;
        list.innerHTML = rows.length
          ? rows
              .map(
                (row) =>
                  `<article class="saved-take"><div class="recording-meta"><strong>Day ${row.day} · ${row.mime_type.startsWith("video/") ? "Video" : "Audio"}</strong><span>${new Date(row.created_at.replace(" ", "T") + "Z").toLocaleString()}</span></div>${player(row.mime_type, `/api/recordings/${row.id}/media`, `Saved recording for Day ${row.day}`)}<div class="recording-meta"><span>${row.duration_seconds ? time(row.duration_seconds) + " · " : ""}${(row.size_bytes / 1024 / 1024).toFixed(1)} MB</span><a href="/api/recordings/${row.id}/media?download=1" download>Download</a><button class="text-button" data-delete="${row.id}" aria-label="Delete recording from Day ${row.day}">Delete</button></div><p class="form-error" role="alert"></p></article>`,
              )
              .join("")
          : '<p class="recording-hint">No saved recordings yet. Record or upload a take from a day’s practice screen.</p>';
      } catch (error) {
        if (current === version)
          list.innerHTML = `<p class="form-error" role="alert">${escapeHtml(error.message)}</p><button class="button secondary" data-reload>Retry loading recordings</button>`;
      }
    };
    root.addEventListener("click", async (event) => {
      if (event.target.closest("[data-reload]")) return root.refresh();
      const button = event.target.closest("[data-delete]");
      if (
        !button ||
        button.disabled ||
        !confirm("Delete this saved recording? This cannot be undone.")
      )
        return;
      button.disabled = true;
      try {
        await request(`/api/recordings/${button.dataset.delete}`, {
          method: "DELETE",
        });
        await root.refresh();
      } catch (error) {
        button.closest(".saved-take").querySelector(".form-error").textContent =
          error.message;
        button.disabled = false;
      }
    });
    root.addEventListener(
      "error",
      (event) => {
        if (event.target.matches("video,audio")) {
          const article = event.target.closest(".saved-take");
          article.querySelector(".form-error").textContent =
            "This recording could not play in your browser. Try downloading it, or refresh the list.";
        }
      },
      true,
    );
    root.refresh();
    return root;
  }
  function release(state) {
    clearInterval(state.clock);
    state.stream?.getTracks().forEach((track) => track.stop());
    state.stream = null;
  }
  function stop(state) {
    if (!state) return;
    state.pending = false;
    if (state.recorder?.state === "recording") {
      state.stopping = true;
      state.recorder.stop();
      release(state);
      draw(state);
    } else if (!state.stopping) {
      release(state);
      draw(state);
    }
  }
  function draft(state, blob, duration) {
    if (state.url) URL.revokeObjectURL(state.url);
    state.blob = blob;
    state.url = URL.createObjectURL(blob);
    state.id = uid();
    state.duration = duration;
  }
  function draw(state) {
    const { panel } = state;
    const capturing = state.recorder?.state === "recording";
    const busy = state.pending || state.stopping || state.saving;
    const canStart = supported() && state.allowCapture;
    panel.innerHTML = `<h3>Record your practice</h3><p class="recording-hint">Capture a take, review it, then save it to this day. Saved recordings stay in this app.</p>${!supported() ? `<p class="recording-hint">${!window.isSecureContext ? "Camera and microphone recording requires HTTPS or localhost." : "Live recording isn’t supported in this browser."} You can upload an existing recording below.</p>` : ""}${capturing ? `<video class="recording-player live-preview" autoplay muted playsinline aria-label="Live recording preview" ${state.mode === "audio" ? "hidden" : ""}></video><p class="recording-live" role="status">● Recording <span data-recording-time>${time(Math.floor((Date.now() - state.started) / 1000))}</span></p><p class="recording-hint">Recording continues independently of the exercise timer. Stop when you’re ready.</p><button class="button record-stop" data-stop>Stop recording</button>` : state.blob ? `<div class="draft-take"><span class="eyebrow">UNSAVED TAKE</span>${player(state.blob.type, state.url, "Recording preview")}<p class="recording-hint">${(state.blob.size / 1024 / 1024).toFixed(1)} MB · Save this take before closing or reloading the app.</p><div class="recording-actions"><button class="button" data-save ${busy ? "disabled" : ""}>${state.saving ? "Saving recording…" : "Save recording"}</button><a class="button secondary" href="${state.url}" download="speakwell-day-${state.day}.${state.blob.type.split("/")[1]}">Download take</a><button class="text-button" data-discard ${busy ? "disabled" : ""}>Discard take</button></div></div>` : `<div class="recording-actions">${state.allowCapture ? `<label class="recording-mode">Recording mode<select data-mode aria-label="Recording mode" ${busy ? "disabled" : ""}><option value="video" ${state.mode === "video" ? "selected" : ""}>Camera + microphone</option><option value="audio" ${state.mode === "audio" ? "selected" : ""}>Audio only</option></select></label><button class="button" data-start ${!canStart || busy ? "disabled" : ""}>${state.pending ? "Waiting for permission…" : state.stopping ? "Preparing preview…" : "Start recording"}</button>` : '<p class="recording-hint">Return to the Practice step to record another take, or upload one below.</p>'}${state.pending ? '<button class="button secondary" data-cancel>Cancel</button>' : ""}<label class="upload-recording">Upload a recording<input data-upload type="file" accept="video/webm,audio/webm,video/mp4,audio/mp4,audio/ogg,audio/wav,.webm,.mp4,.m4a,.ogg,.wav" ${busy ? "disabled" : ""}></label></div><p class="recording-hint">Up to 15 minutes per live take · 50 MB per saved file · WebM, MP4, Ogg audio, or WAV</p>`}<p class="recording-message ${state.error ? "form-error" : ""}" role="status">${escapeHtml(state.error || state.message || "")}</p>`;
    if (capturing) {
      const video = panel.querySelector("video");
      video.srcObject = state.stream;
      video.play().catch(() => {});
    }
  }
  async function start(state) {
    if (
      state.pending ||
      state.stopping ||
      state.saving ||
      state.blob ||
      state.recorder?.state === "recording"
    )
      return;
    state.error = "";
    state.message = "";
    state.pending = true;
    const attempt = ++state.attempt;
    draw(state);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: true,
        video:
          state.mode === "video"
            ? {
                width: { ideal: 640 },
                height: { ideal: 360 },
                frameRate: { ideal: 24 },
              }
            : false,
      });
      if (!state.pending || attempt !== state.attempt) {
        stream.getTracks().forEach((track) => track.stop());
        return;
      }
      state.stream = stream;
      const candidates =
        state.mode === "video"
          ? ["video/webm;codecs=vp8,opus", "video/webm", "video/mp4"]
          : [
              "audio/webm;codecs=opus",
              "audio/webm",
              "audio/mp4",
              "audio/ogg;codecs=opus",
            ];
      const mimeType = candidates.find((type) =>
        MediaRecorder.isTypeSupported(type),
      );
      if (!mimeType)
        throw new Error(
          "No supported recording format. Try uploading a recording instead.",
        );
      const recorder = new MediaRecorder(stream, {
        mimeType,
        videoBitsPerSecond: 350000,
        audioBitsPerSecond: 64000,
      });
      state.recorder = recorder;
      const chunks = [];
      let size = 0;
      recorder.ondataavailable = (event) => {
        if (event.data.size) {
          chunks.push(event.data);
          size += event.data.size;
        }
        if (size >= 48 * 1024 * 1024 && recorder.state === "recording") {
          state.message = "Recording stopped near the file-size limit.";
          stop(state);
        }
      };
      recorder.onerror = () => {
        state.error =
          "Recording was interrupted. Review any captured audio or video below.";
        stop(state);
      };
      recorder.onstop = () => {
        const duration = Math.max(
          1,
          Math.round((Date.now() - state.started) / 1000),
        );
        release(state);
        state.stopping = false;
        state.pending = false;
        if (size)
          draft(
            state,
            new Blob(chunks, { type: recorder.mimeType.split(";")[0] }),
            duration,
          );
        else state.error = "No recording was captured. Please try again.";
        draw(state);
      };
      state.started = Date.now();
      state.pending = false;
      recorder.start(1000);
      stream
        .getTracks()
        .forEach((track) => track.addEventListener("ended", () => stop(state)));
      state.clock = setInterval(() => {
        const seconds = Math.floor((Date.now() - state.started) / 1000);
        const label = state.panel.querySelector("[data-recording-time]");
        if (label) label.textContent = time(seconds);
        if (seconds >= 900) {
          state.message = "Your 15-minute take is ready to review.";
          stop(state);
        }
      }, 500);
      draw(state);
    } catch (error) {
      if (attempt !== state.attempt) return;
      state.pending = false;
      release(state);
      state.error =
        {
          NotAllowedError:
            "Camera or microphone access was denied. Allow access in your browser, then try again, or upload a recording.",
          NotFoundError:
            "No matching camera or microphone was found. Try audio-only mode or upload a recording.",
          NotReadableError:
            "Your camera or microphone is busy. Close other apps using it and try again.",
        }[error.name] || error.message;
      draw(state);
    }
  }
  async function save(state) {
    if (!state.blob || state.saving) return;
    if (state.blob.size > MAX_BYTES) {
      state.error =
        "This take exceeds 50 MB. Download it to keep a copy, then upload a smaller clip.";
      draw(state);
      return;
    }
    state.saving = true;
    state.error = "";
    draw(state);
    try {
      await request(
        `/api/recordings/${state.id}?day=${state.day}${state.duration ? `&duration=${state.duration}` : ""}`,
        {
          method: "PUT",
          headers: { "Content-Type": state.blob.type },
          body: state.blob,
        },
      );
      URL.revokeObjectURL(state.url);
      state.url = null;
      state.blob = null;
      state.message =
        "Recording saved. You can replay it below or in your journal.";
      await state.library.refresh();
    } catch (error) {
      state.error = `${error.message} Your unsaved take is still here; retry Save recording or download a copy.`;
    } finally {
      state.saving = false;
      draw(state);
    }
  }
  function mount(day, allowCapture) {
    let state = takes.get(day);
    if (!state) {
      const root = document.createElement("section");
      root.className = "day-recordings";
      const panel = document.createElement("div");
      panel.className = "recorder-panel";
      const saved = library(day);
      root.append(panel, saved);
      state = { day, root, panel, library: saved, mode: "video", attempt: 0 };
      takes.set(day, state);
      panel.addEventListener("click", (event) => {
        if (event.target.closest("[data-start]")) start(state);
        if (event.target.closest("[data-stop]")) stop(state);
        if (event.target.closest("[data-cancel]")) {
          state.attempt++;
          stop(state);
        }
        if (event.target.closest("[data-save]")) save(state);
        if (
          event.target.closest("[data-discard]") &&
          !state.saving &&
          confirm(
            "Discard this unsaved take? Download it first if you want to keep a copy.",
          )
        ) {
          URL.revokeObjectURL(state.url);
          state.blob = null;
          state.url = null;
          state.error = "";
          state.message = "";
          draw(state);
        }
      });
      panel.addEventListener("change", (event) => {
        if (event.target.matches("[data-mode]"))
          state.mode = event.target.value;
        if (event.target.matches("[data-upload]")) {
          const file = event.target.files[0];
          if (!file) return;
          const mime = file.type.split(";")[0];
          const fallback = {
            webm: "video/webm",
            mp4: "video/mp4",
            m4a: "audio/mp4",
            ogg: "audio/ogg",
            wav: "audio/wav",
          }[file.name.split(".").pop().toLowerCase()];
          const type = types.includes(mime) ? mime : fallback;
          state.error = "";
          state.message = "";
          if (!type || !file.size || file.size > MAX_BYTES)
            state.error =
              "Choose a nonempty WebM, MP4, Ogg audio, or WAV file up to 50 MB.";
          else draft(state, new Blob([file], { type }), null);
          draw(state);
        }
      });
      panel.addEventListener(
        "error",
        (event) => {
          if (event.target.matches("video,audio") && !state.stream) {
            const message = panel.querySelector(".recording-message");
            message.textContent =
              "Preview is unavailable in this browser. You can still download this take.";
          }
        },
        true,
      );
    } else state.library.refresh();
    state.allowCapture = allowCapture;
    document.querySelector("#recording-slot").append(state.root);
    draw(state);
  }
  window.addEventListener("beforeunload", (event) => {
    if (
      [...takes.values()].some(
        (s) =>
          s.blob ||
          s.pending ||
          s.stopping ||
          s.recorder?.state === "recording",
      )
    ) {
      event.preventDefault();
      event.returnValue = "";
    }
  });
  return {
    mount,
    stop: () =>
      takes.forEach((state) => {
        if (state.pending || state.recorder?.state === "recording") {
          state.attempt++;
          stop(state);
        }
      }),
    mountJournal: () =>
      document.querySelector("#journal-recordings").append(library()),
  };
})();
