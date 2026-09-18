/**
 * Narración por voz (Web Speech API) para Didzago.
 * Sin dependencias de módulos ES — compatible con script clásico.
 */
(function (global) {
  const STORAGE_KEY = "didzago-audio";

  const state = {
    enabled: localStorage.getItem(STORAGE_KEY) !== "0",
    voice: null,
    voicesReady: false,
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
    window.speechSynthesis.cancel();
  }

  function isEnabled() {
    return state.enabled;
  }

  function setEnabled(on) {
    state.enabled = !!on;
    localStorage.setItem(STORAGE_KEY, state.enabled ? "1" : "0");
    if (!state.enabled) stop();
    document.dispatchEvent(new CustomEvent("didzago-audio-change", {
      detail: { enabled: state.enabled },
    }));
    syncUi();
  }

  function toggle() {
    setEnabled(!state.enabled);
    return state.enabled;
  }

  function speak(text, opts) {
    opts = opts || {};
    const cleaned = clean(text);
    if (!cleaned || !supported()) return Promise.resolve();
    if (!state.enabled && !opts.force) return Promise.resolve();

    stop();
    if (!state.voicesReady) pickVoice();

    return new Promise(function (resolve) {
      const u = new SpeechSynthesisUtterance(cleaned);
      u.lang = (state.voice && state.voice.lang) || "es-MX";
      if (state.voice) u.voice = state.voice;
      u.rate = opts.rate != null ? opts.rate : 0.85;
      u.pitch = 1;
      u.volume = 1;
      u.onend = function () { resolve(); };
      u.onerror = function () { resolve(); };
      setTimeout(function () {
        window.speechSynthesis.speak(u);
      }, 40);
    });
  }

  function speakParts(parts, opts) {
    opts = opts || {};
    const list = (parts || []).map(clean).filter(Boolean);
    return list.reduce(function (chain, part) {
      return chain.then(function () {
        if (!state.enabled && !opts.force) return;
        return speak(part, opts).then(function () {
          return new Promise(function (r) { setTimeout(r, 200); });
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
    return speakParts(parts, opts);
  }

  function syncUi() {
    document.querySelectorAll("[data-audio-toggle]").forEach(function (btn) {
      btn.setAttribute("aria-pressed", state.enabled ? "true" : "false");
      btn.classList.toggle("sound-btn--off", !state.enabled);
      const label = btn.querySelector("[data-audio-label]");
      if (label) {
        label.textContent = state.enabled ? "Sonido" : "Silencio";
      }
      const icon = btn.querySelector(".sound-btn__icon, [aria-hidden='true']");
      if (icon && !icon.classList.contains("sr-only")) {
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
        toggle();
      });
    });
    document.querySelectorAll("#toggle-audio, #toggle-audio-profile, [data-audio-toggle-input]").forEach(function (el) {
      if (el.dataset.audioBound) return;
      el.dataset.audioBound = "1";
      el.checked = state.enabled;
      el.addEventListener("change", function () {
        setEnabled(el.checked);
      });
    });
    document.querySelectorAll("[data-audio-speak]").forEach(function (btn) {
      if (btn.dataset.audioBound) return;
      btn.dataset.audioBound = "1";
      btn.addEventListener("click", function (e) {
        e.preventDefault();
        e.stopPropagation();
        const getText = global.DidzagoAudio && global.DidzagoAudio._speakGetter;
        const text = typeof getText === "function" ? getText() : "";
        speak(text || btn.dataset.audioSpeak || "Didzago", { force: true });
      });
    });
    syncUi();
  }

  function init() {
    if (!supported()) {
      document.querySelectorAll("[data-audio-toggle], [data-audio-speak], #toggle-audio")
        .forEach(function (el) {
          if (el.closest) {
            const wrap = el.closest(".sound-chip, .toggle, .sound-fab");
            if (wrap) wrap.hidden = true;
            else el.hidden = true;
          }
        });
      return false;
    }
    pickVoice();
    window.speechSynthesis.onvoiceschanged = pickVoice;
    bindUi();
    return true;
  }

  global.DidzagoAudio = {
    init: init,
    supported: supported,
    isEnabled: isEnabled,
    setEnabled: setEnabled,
    toggle: toggle,
    speak: speak,
    speakParts: speakParts,
    speakRound: speakRound,
    stop: stop,
    syncUi: syncUi,
    bindUi: bindUi,
    _speakGetter: null,
  };
})(window);
