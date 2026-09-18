/**
 * Narración por voz (Web Speech API) para Didzago.
 * Audio activado por defecto; se desbloquea con el primer toque (requisito del navegador).
 */
(function (global) {
  const STORAGE_KEY = "didzago-audio";

  const state = {
    enabled: true,
    unlocked: false,
    voice: null,
    voicesReady: false,
    pending: null,
  };

  function supported() {
    return typeof window !== "undefined"
      && "speechSynthesis" in window
      && "SpeechSynthesisUtterance" in window;
  }

  function pickVoice() {
    if (!supported()) return null;
    const voices = window.speechSynthesis.getVoices() || [];
    state.voice =
      voices.find((v) => /es[-_]MX/i.test(v.lang))
      || voices.find((v) => /es[-_]ES/i.test(v.lang))
      || voices.find((v) => /^es\b/i.test(v.lang))
      || voices.find((v) => /spanish|español/i.test(v.name))
      || null;
    state.voicesReady = true;
    return state.voice;
  }

  function clean(text) {
    return String(text || "")
      .replace(/[*_#>`]/g, "")
      .replace(/[📚📘✨💡🎮⭐💎📄🌈🎉]/gu, "")
      .replace(/\s+/g, " ")
      .trim();
  }

  function stop() {
    if (!supported()) return;
    try {
      window.speechSynthesis.cancel();
    } catch (e) { /* ignore */ }
  }

  function isEnabled() {
    return state.enabled;
  }

  function isUnlocked() {
    return state.unlocked;
  }

  function setEnabled(on) {
    state.enabled = !!on;
    localStorage.setItem(STORAGE_KEY, state.enabled ? "1" : "0");
    if (!state.enabled) {
      state.pending = null;
      stop();
    }
    document.dispatchEvent(new CustomEvent("didzago-audio-change", {
      detail: { enabled: state.enabled },
    }));
    syncUi();
  }

  function toggle() {
    setEnabled(!state.enabled);
    if (state.enabled) unlock();
    return state.enabled;
  }

  function flushPending() {
    if (!state.pending || !state.enabled) return;
    const job = state.pending;
    state.pending = null;
    if (job.kind === "parts") {
      speakParts(job.parts, Object.assign({}, job.opts, { force: true, _unlocked: true }));
    } else if (job.kind === "text") {
      speak(job.text, Object.assign({}, job.opts, { force: true, _unlocked: true }));
    }
  }

  function unlock() {
    if (!supported()) return false;
    if (state.unlocked) {
      flushPending();
      return true;
    }
    state.unlocked = true;
    if (!state.enabled) setEnabled(true);
    pickVoice();
    // Calienta el motor de voz tras el gesto del usuario
    try {
      stop();
      const warm = new SpeechSynthesisUtterance(" ");
      warm.volume = 0.01;
      warm.rate = 2;
      warm.lang = "es-MX";
      window.speechSynthesis.speak(warm);
      setTimeout(function () {
        stop();
        flushPending();
      }, 80);
    } catch (e) {
      flushPending();
    }
    syncUi();
    return true;
  }

  function queueOrSpeak(kind, payload, opts) {
    opts = opts || {};
    if (!state.enabled && !opts.force) return Promise.resolve();
    if (!state.unlocked && !opts._unlocked) {
      state.pending = kind === "parts"
        ? { kind: "parts", parts: payload, opts: opts }
        : { kind: "text", text: payload, opts: opts };
      return Promise.resolve();
    }
    if (kind === "parts") return speakParts(payload, Object.assign({}, opts, { _unlocked: true }));
    return speak(payload, Object.assign({}, opts, { _unlocked: true }));
  }

  function speak(text, opts) {
    opts = opts || {};
    const cleaned = clean(text);
    if (!cleaned || !supported()) return Promise.resolve();
    if (!state.enabled && !opts.force) return Promise.resolve();

    if (!state.unlocked && !opts._unlocked) {
      state.pending = { kind: "text", text: cleaned, opts: opts };
      return Promise.resolve();
    }

    stop();
    if (!state.voicesReady) pickVoice();

    return new Promise(function (resolve) {
      const u = new SpeechSynthesisUtterance(cleaned);
      u.lang = (state.voice && state.voice.lang) || "es-MX";
      if (state.voice) u.voice = state.voice;
      u.rate = opts.rate != null ? opts.rate : 0.88;
      u.pitch = 1.05;
      u.volume = 1;
      u.onend = function () { resolve(); };
      u.onerror = function () { resolve(); };
      setTimeout(function () {
        try {
          window.speechSynthesis.speak(u);
        } catch (e) {
          resolve();
        }
      }, 40);
    });
  }

  function speakParts(parts, opts) {
    opts = opts || {};
    const list = (parts || []).map(clean).filter(Boolean);
    if (!list.length) return Promise.resolve();
    if (!state.enabled && !opts.force) return Promise.resolve();

    if (!state.unlocked && !opts._unlocked) {
      state.pending = { kind: "parts", parts: list, opts: opts };
      return Promise.resolve();
    }

    return list.reduce(function (chain, part) {
      return chain.then(function () {
        if (!state.enabled && !opts.force) return;
        return speak(part, Object.assign({}, opts, { _unlocked: true })).then(function () {
          return new Promise(function (r) { setTimeout(r, 180); });
        });
      });
    }, Promise.resolve());
  }

  function speakRound(round, opts) {
    opts = opts || {};
    if (!round) return Promise.resolve();
    const choices = (round.choices || []).map(function (c) {
      return c.label || c;
    });
    const parts = [
      round.type_label ? "Paso: " + round.type_label + "." : "",
      round.title || "",
      round.concept || "",
      round.prompt || "",
      choices.length ? "Opciones: " + choices.join(". ") + "." : "",
      round.needs_trace && round.label
        ? "Puedes trazar la letra " + round.label + " en la zona de escritura."
        : "",
    ];
    return queueOrSpeak("parts", parts, opts);
  }

  function syncUi() {
    document.querySelectorAll("[data-audio-toggle]").forEach(function (btn) {
      btn.setAttribute("aria-pressed", state.enabled ? "true" : "false");
      btn.classList.toggle("sound-btn--off", !state.enabled);
      const label = btn.querySelector("[data-audio-label]");
      if (label) {
        label.textContent = state.enabled ? "Sonido" : "Silencio";
      }
      const icon = btn.querySelector(".sound-btn__icon");
      if (icon) {
        icon.textContent = state.enabled ? "🔊" : "🔇";
      }
      btn.title = state.enabled ? "Sonido activado" : "Sonido desactivado";
      btn.setAttribute(
        "aria-label",
        state.enabled ? "Desactivar sonido" : "Activar sonido"
      );
    });
    document.querySelectorAll("#toggle-audio, #toggle-audio-profile, [data-audio-toggle-input]").forEach(function (el) {
      el.checked = state.enabled;
    });
  }

  function bindUi() {
    document.querySelectorAll("[data-audio-toggle]").forEach(function (btn) {
      if (btn.dataset.audioBound) return;
      btn.dataset.audioBound = "1";
      btn.addEventListener("click", function (e) {
        e.preventDefault();
        e.stopPropagation();
        unlock();
        toggle();
      });
    });
    document.querySelectorAll("#toggle-audio, #toggle-audio-profile, [data-audio-toggle-input]").forEach(function (el) {
      if (el.dataset.audioBound) return;
      el.dataset.audioBound = "1";
      el.checked = state.enabled;
      el.addEventListener("change", function () {
        if (el.checked) unlock();
        setEnabled(el.checked);
      });
    });
    document.querySelectorAll("[data-audio-speak]").forEach(function (btn) {
      if (btn.dataset.audioBound) return;
      btn.dataset.audioBound = "1";
      btn.addEventListener("click", function (e) {
        e.preventDefault();
        e.stopPropagation();
        unlock();
        const getText = global.DidzagoAudio && global.DidzagoAudio._speakGetter;
        const text = typeof getText === "function" ? getText() : "";
        speak(text || btn.dataset.audioSpeak || "Didzago", { force: true, _unlocked: true });
      });
    });
    syncUi();
  }

  function bindAutoUnlock() {
    if (state._unlockBound) return;
    state._unlockBound = true;
    const unlockOnce = function () {
      unlock();
    };
    ["pointerdown", "touchstart", "keydown", "click"].forEach(function (evt) {
      document.addEventListener(evt, unlockOnce, { capture: true, passive: true });
    });
  }

  function init() {
    if (!supported()) {
      document.querySelectorAll("[data-audio-toggle], [data-audio-speak], #toggle-audio, #toggle-audio-profile")
        .forEach(function (el) {
          if (el.closest) {
            const wrap = el.closest(".sound-chip, .toggle, .sound-fab, .sound-toggle");
            if (wrap) wrap.hidden = true;
            else el.hidden = true;
          }
        });
      return false;
    }
    // Siempre activo al cargar (auto)
    setEnabled(true);
    pickVoice();
    window.speechSynthesis.onvoiceschanged = pickVoice;
    bindUi();
    bindAutoUnlock();
    return true;
  }

  global.DidzagoAudio = {
    init: init,
    supported: supported,
    isEnabled: isEnabled,
    isUnlocked: isUnlocked,
    setEnabled: setEnabled,
    toggle: toggle,
    unlock: unlock,
    speak: speak,
    speakParts: speakParts,
    speakRound: speakRound,
    stop: stop,
    syncUi: syncUi,
    bindUi: bindUi,
    _speakGetter: null,
  };
})(window);
