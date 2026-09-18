(() => {
  const API = "api/activity.php";
  const app = document.getElementById("app");
  const screens = [...document.querySelectorAll(".screen")];

  const state = {
    age: localStorage.getItem("didzago-age") || "7-9",
    stars: Number(localStorage.getItem("didzago-stars") || 40),
    missionsDone: Number(localStorage.getItem("didzago-missions") || 0),
    aetherOn: localStorage.getItem("didzago-aether") !== "0",
    aetherAvailable: null,
    subject: "mixto",
    gameType: "memorama",
    missionDone: false,
    missionPack: null,
    missionRound: 0,
    sessionStart: Date.now(),
  };

  const copyByAge = {
    "4-6": {
      "onboarding-lead": "",
      "home-hello": "¡Hola!",
      "home-sub": "",
      "island-math": "Números",
      "island-read": "Cuentos",
      "island-sci": "Naturaleza",
      "island-play": "Jugar",
      "tab-home": "Casa",
      "tab-learn": "Aprende",
      "tab-play": "Juego",
      "tab-profile": "Yo",
      "learn-title": "Aprender",
      "learn-sub": "",
      "st1-title": "Sumas",
      "st1-meta": "Listo",
      "st2-title": "Palabras",
      "st2-meta": "Ahora",
      "st3-title": "Agua",
      "st3-meta": "Nuevo",
      "st4-title": "Estrella",
      "st4-meta": "Para ti",
      "mission-bar": "Juego",
      "mission-hint": "Toca",
      "play-title": "Jugar",
      "play-sub": "",
      "g1-title": "Parejas",
      "g1-meta": "",
      "g2-title": "Puzzle",
      "g2-meta": "",
      "g3-title": "Bosque",
      "g3-meta": "",
      "game-intro": "Busca iguales",
      "profile-title": "Tú",
    },
    "7-9": {
      "onboarding-lead": "Elige tu aventura. Didzago se adapta a ti.",
      "home-hello": "¡Hola, explorador!",
      "home-sub": "Tu mundo te espera.",
      "island-math": "Matemáticas",
      "island-read": "Lectura",
      "island-sci": "Ciencias",
      "island-play": "Jugar",
      "tab-home": "Inicio",
      "tab-learn": "Aprender",
      "tab-play": "Jugar",
      "tab-profile": "Perfil",
      "learn-title": "Aprender",
      "learn-sub": "Elige tu misión del día.",
      "st1-title": "Sumas mágicas",
      "st1-meta": "Completada · +20 estrellas",
      "st2-title": "Palabras del bosque",
      "st2-meta": "En curso · 3 min",
      "st3-title": "El ciclo del agua",
      "st3-meta": "Nueva · Ciencias",
      "st4-title": "Reto estrella",
      "st4-meta": "Generada para ti",
      "mission-bar": "Misión",
      "mission-hint": "Toca la respuesta correcta.",
      "play-title": "Jugar",
      "play-sub": "Aprende mientras te diviertes.",
      "g1-title": "Memorama silábico",
      "g1-meta": "Empareja sonidos",
      "g2-title": "Puzzle numérico",
      "g2-meta": "Ordena y suma",
      "g3-title": "Escape del bosque",
      "g3-meta": "Resuelve pistas",
      "game-intro": "Encuentra las parejas.",
      "profile-title": "Tu perfil",
    },
    "10-13": {
      "onboarding-lead": "Elige tu nivel. Más retos, más autonomía.",
      "home-hello": "Listo para el reto",
      "home-sub": "Sigue tu racha y sube de nivel.",
      "island-math": "Matemáticas",
      "island-read": "Lectura",
      "island-sci": "Ciencias",
      "island-play": "Desafíos",
      "tab-home": "Inicio",
      "tab-learn": "Misiones",
      "tab-play": "Retos",
      "tab-profile": "Perfil",
      "learn-title": "Misiones",
      "learn-sub": "Completa el camino semanal.",
      "st1-title": "Álgebra ligera",
      "st1-meta": "Completada · +20 XP",
      "st2-title": "Comprensión lectora",
      "st2-meta": "En curso · 8 min",
      "st3-title": "Método científico",
      "st3-meta": "Nueva · Ciencias",
      "st4-title": "Boss challenge",
      "st4-meta": "Generado para ti",
      "mission-bar": "Desafío",
      "mission-hint": "Elige la opción correcta.",
      "play-title": "Retos",
      "play-sub": "Modo libre o con objetivos.",
      "g1-title": "Memorama silábico",
      "g1-meta": "Velocidad y precisión",
      "g2-title": "Puzzle numérico",
      "g2-meta": "Secuencias y lógica",
      "g3-title": "Escape del bosque",
      "g3-meta": "Pistas y deducción",
      "game-intro": "Empareja todas las cartas.",
      "profile-title": "Tu progreso",
    },
  };

  const ageLabels = {
    "4-6": { name: "Peque explorador", range: "4–6" },
    "7-9": { name: "Aventurero", range: "7–9" },
    "10-13": { name: "Retador", range: "10–13" },
  };

  const fallbacks = {
    mission: {
      "4-6": {
        title: "Contar",
        prompt: "¿Cuántas manzanas hay? 🍎🍎🍎",
        hint: "Toca",
        choices: [
          { label: "2", correct: false },
          { label: "3", correct: true },
          { label: "5", correct: false },
        ],
        success: "¡Bien!",
        retry: "Otra vez",
      },
      "7-9": {
        title: "Sumas mágicas",
        prompt: "¿Cuánto es 3 + 2?",
        hint: "Toca la respuesta correcta.",
        choices: [
          { label: "4", correct: false },
          { label: "5", correct: true },
          { label: "6", correct: false },
        ],
        success: "¡Correcto! +10 estrellas",
        retry: "Casi… prueba otra opción",
      },
      "10-13": {
        title: "Ecuación",
        prompt: "Si 2x + 4 = 10, ¿cuánto vale x?",
        hint: "Despeja la ecuación.",
        choices: [
          { label: "2", correct: false },
          { label: "3", correct: true },
          { label: "4", correct: false },
        ],
        success: "¡Exacto! +10 estrellas",
        retry: "Revisa el despeje e intenta otra",
      },
    },
    memory: {
      "4-6": { title: "Parejas", intro: "Busca iguales", pairs: ["A", "2", "★"] },
      "7-9": { title: "Memorama", intro: "Encuentra las parejas.", pairs: ["MA", "SO", "LU"] },
      "10-13": { title: "Memorama", intro: "Empareja todas las cartas.", pairs: ["SOL", "MAR", "LUZ", "PAN"] },
    },
    puzzle: {
      "4-6": {
        title: "Puzzle",
        intro: "¿Qué falta?",
        sequence: [1, 2, 3, 4],
        missing_index: 2,
        choices: [
          { label: "3", correct: true },
          { label: "5", correct: false },
          { label: "1", correct: false },
        ],
      },
      "7-9": {
        title: "Puzzle numérico",
        intro: "¿Qué número falta?",
        sequence: [2, 4, 6, 8],
        missing_index: 2,
        choices: [
          { label: "5", correct: false },
          { label: "6", correct: true },
          { label: "7", correct: false },
        ],
      },
      "10-13": {
        title: "Secuencia",
        intro: "Completa la serie.",
        sequence: [3, 6, 12, 24],
        missing_index: 2,
        choices: [
          { label: "9", correct: false },
          { label: "12", correct: true },
          { label: "18", correct: false },
        ],
      },
    },
    escape: {
      "4-6": {
        title: "Bosque",
        story: "El zorro encontró una puerta.",
        clue: "¿De qué color es el cielo de día?",
        choices: [
          { label: "Azul", correct: true },
          { label: "Rojo", correct: false },
          { label: "Negro", correct: false },
        ],
        success: "¡Saliste!",
        retry: "Otra pista",
      },
      "7-9": {
        title: "Escape del bosque",
        story: "Una niebla cubre el camino.",
        clue: "¿Cuántas patas tiene un insecto?",
        choices: [
          { label: "4", correct: false },
          { label: "6", correct: true },
          { label: "8", correct: false },
        ],
        success: "¡Abriste el camino! +15 estrellas",
        retry: "Esa no es la clave.",
      },
      "10-13": {
        title: "Escape del bosque",
        story: "Un puente mágico pide la clave.",
        clue: "El agua hierve a…",
        choices: [
          { label: "50 °C", correct: false },
          { label: "100 °C", correct: true },
          { label: "0 °C", correct: false },
        ],
        success: "¡Puente abierto! +15 estrellas",
        retry: "Revisa el dato.",
      },
    },
  };

  async function checkAether() {
    try {
      const res = await fetch(API, { method: "GET" });
      const data = await res.json();
      state.aetherAvailable = !!(data.ok && data.available);
    } catch {
      state.aetherAvailable = false;
    }
    refreshParents();
  }

  async function fetchActivity(action, subject = state.subject) {
    if (!state.aetherOn) {
      return { ok: false, offline: true };
    }
    try {
      const res = await fetch(API, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, age: state.age, subject: subject || "mixto" }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok || !data.activity) {
        return { ok: false, error: data.error || "Error" };
      }
      state.aetherAvailable = true;
      return { ok: true, activity: data.activity, engine: "aether" };
    } catch {
      state.aetherAvailable = false;
      return { ok: false, error: "Sin conexión a Aether" };
    }
  }

  function fallback(action) {
    const pack = fallbacks[action];
    return pack[state.age] || pack["7-9"];
  }

  function syncAetherVideos(activeScreen) {
    if (window.DidzagoAetherVideo) {
      window.DidzagoAetherVideo.syncByScreen(activeScreen);
      return;
    }
  }

  function go(name) {
    screens.forEach((screen) => {
      screen.classList.toggle("screen--active", screen.dataset.screen === name);
    });
    syncAetherVideos(name);
    if (name === "mision") setupMission();
    if (name === "juego") setupGame();
    if (name === "aprender") loadPath();
    if (name === "perfil") refreshProfile();
    if (name === "padres") refreshParents();
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function applyAge(age) {
    state.age = age;
    localStorage.setItem("didzago-age", age);
    app.dataset.age = age;
    document.querySelectorAll("[data-set-age]").forEach((btn) => {
      btn.classList.toggle("age-card--active", btn.dataset.setAge === age);
    });
    const pack = copyByAge[age];
    document.querySelectorAll("[data-copy]").forEach((el) => {
      const key = el.dataset.copy;
      if (key in pack) el.textContent = pack[key];
    });
    refreshProfile();
  }

  function addStars(n) {
    state.stars += n;
    localStorage.setItem("didzago-stars", String(state.stars));
  }

  function completeMission() {
    state.missionsDone += 1;
    localStorage.setItem("didzago-missions", String(state.missionsDone));
  }

  function refreshProfile() {
    const info = ageLabels[state.age];
    const nameEl = document.getElementById("profile-name");
    const ageEl = document.getElementById("profile-age");
    const starsEl = document.getElementById("stat-stars");
    const missionsEl = document.getElementById("stat-missions");
    if (nameEl) nameEl.textContent = info.name;
    if (ageEl) ageEl.textContent = `${info.name} · ${info.range}`;
    if (starsEl) starsEl.textContent = String(state.stars);
    if (missionsEl) missionsEl.textContent = String(state.missionsDone);
  }

  function refreshParents() {
    const ageEl = document.getElementById("parent-age");
    const aetherEl = document.getElementById("parent-aether");
    const missionsEl = document.getElementById("parent-missions");
    const minutesEl = document.getElementById("parent-minutes");
    const toggle = document.getElementById("toggle-aether");
    if (ageEl) ageEl.textContent = ageLabels[state.age].range;
    if (missionsEl) missionsEl.textContent = String(state.missionsDone);
    if (minutesEl) {
      const mins = Math.max(1, Math.round((Date.now() - state.sessionStart) / 60000));
      minutesEl.textContent = `${mins} min`;
    }
    if (toggle) toggle.checked = state.aetherOn;
    if (aetherEl) {
      if (!state.aetherOn) aetherEl.textContent = "Desactivado";
      else if (state.aetherAvailable === true) aetherEl.textContent = "Misiones tipadas (sin chat)";
      else if (state.aetherAvailable === false) aetherEl.textContent = "No disponible";
      else aetherEl.textContent = "Comprobando…";
    }
  }

  async function loadPath() {
    const note = document.getElementById("path-note");
    const path = document.getElementById("learn-path");
    if (!path) return;
    const result = await fetchActivity("path", "mixto");
    if (!result.ok) {
      if (note) {
        note.hidden = false;
        note.textContent = state.aetherOn
          ? "Usando misiones locales (Aether no respondió)."
          : "Modo local: Aether desactivado.";
      }
      return;
    }
    if (note) {
      note.hidden = false;
      note.textContent = "Camino generado por Aether.";
    }
    const missions = result.activity.missions || [];
    const stations = path.querySelectorAll(".station");
    missions.forEach((m, i) => {
      const station = stations[i];
      if (!station) return;
      const strong = station.querySelector("strong");
      const small = station.querySelector("small");
      if (strong) strong.textContent = m.title;
      if (small) small.textContent = m.meta;
      station.dataset.subject = m.subject || "mixto";
    });
  }

  function hideConcept() {
    const card = document.getElementById("mission-concept");
    const biblio = document.getElementById("mission-biblio");
    const writePad = document.getElementById("mission-write-pad");
    const writeHint = document.getElementById("mission-write-hint");
    const img = document.getElementById("mission-image");
    const stage = document.getElementById("mission-stage");
    if (card) card.hidden = true;
    if (biblio) biblio.hidden = true;
    if (writePad) writePad.hidden = true;
    if (writeHint) writeHint.textContent = "";
    if (stage) stage.hidden = true;
    if (img) {
      img.removeAttribute("src");
      img.classList.remove("concept-hero__img--letra");
    }
  }

  function updateStepper(rounds, idx) {
    const stepper = document.getElementById("mission-stepper");
    if (!stepper) return;
    const items = [...stepper.querySelectorAll(".mission-stepper__item")];
    const currentType = (rounds[idx] && rounds[idx].type) || "practice";
    items.forEach((el) => {
      const step = el.dataset.step;
      el.classList.remove("is-active", "is-done");
      const stepIdx = items.findIndex((i) => i.dataset.step === step);
      const currentIdx = items.findIndex((i) => i.dataset.step === currentType);
      if (step === currentType) el.classList.add("is-active");
      else if (stepIdx >= 0 && currentIdx >= 0 && stepIdx < currentIdx) el.classList.add("is-done");
      else if (idx > 0 && rounds.slice(0, idx).some((r) => r.type === step)) el.classList.add("is-done");
    });
  }

  let traceCtx = null;
  let tracing = false;

  function setupTracePad(enabled, letter) {
    const pad = document.getElementById("mission-write-pad");
    const canvas = document.getElementById("mission-trace");
    const hint = document.getElementById("mission-write-hint");
    const clearBtn = document.getElementById("mission-trace-clear");
    if (!pad || !canvas) return;
    if (!enabled) {
      pad.hidden = true;
      return;
    }
    pad.hidden = false;
    if (hint) hint.textContent = letter ? `Traza la letra ${letter}` : "Traza la letra";
    const rect = canvas.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    canvas.width = Math.floor(rect.width * dpr) || 280;
    canvas.height = Math.floor(140 * dpr);
    canvas.style.height = "140px";
    traceCtx = canvas.getContext("2d");
    traceCtx.scale(dpr, dpr);
    traceCtx.lineWidth = 4;
    traceCtx.lineCap = "round";
    traceCtx.strokeStyle = "#1f8f7e";
    traceCtx.clearRect(0, 0, canvas.width, canvas.height);
    // Guide letter
    traceCtx.save();
    traceCtx.globalAlpha = 0.12;
    traceCtx.font = "bold 96px Fredoka, sans-serif";
    traceCtx.fillStyle = "#1f2a2e";
    traceCtx.textAlign = "center";
    traceCtx.textBaseline = "middle";
    traceCtx.fillText((letter || "?").toString().slice(0, 2), rect.width / 2 || 140, 70);
    traceCtx.restore();

    const pos = (e) => {
      const r = canvas.getBoundingClientRect();
      const t = e.touches ? e.touches[0] : e;
      return { x: t.clientX - r.left, y: t.clientY - r.top };
    };
    const start = (e) => {
      e.preventDefault();
      tracing = true;
      const p = pos(e);
      traceCtx.beginPath();
      traceCtx.moveTo(p.x, p.y);
    };
    const move = (e) => {
      if (!tracing) return;
      e.preventDefault();
      const p = pos(e);
      traceCtx.lineTo(p.x, p.y);
      traceCtx.stroke();
    };
    const end = () => {
      tracing = false;
    };
    canvas.onmousedown = start;
    canvas.onmousemove = move;
    canvas.onmouseup = end;
    canvas.onmouseleave = end;
    canvas.ontouchstart = start;
    canvas.ontouchmove = move;
    canvas.ontouchend = end;
    if (clearBtn) {
      clearBtn.onclick = () => setupTracePad(true, letter);
    }
  }

  function showConcept(round) {
    const card = document.getElementById("mission-concept");
    const title = document.getElementById("mission-concept-title");
    const text = document.getElementById("mission-concept-text");
    const img = document.getElementById("mission-image");
    const biblio = document.getElementById("mission-biblio");
    const biblioText = document.getElementById("mission-biblio-text");
    if (!card) return;

    const hasText = !!(round.concept || round.title || round.bibliography || round.image);
    if (!hasText) {
      card.hidden = true;
      return;
    }
    card.hidden = false;
    if (title) title.textContent = round.title || round.concept_title || "Concepto";
    if (text) text.textContent = round.concept || "";

    if (img) {
      if (round.image) {
        img.hidden = false;
        img.src = round.image;
        img.alt = round.label || (title ? title.textContent : "") || "Concepto";
        img.classList.toggle("concept-hero__img--letra", round.kind === "letra");
        img.onerror = () => {
          img.hidden = true;
        };
      } else {
        img.hidden = true;
        img.removeAttribute("src");
      }
    }

    if (biblio && biblioText) {
      if (round.bibliography) {
        biblio.hidden = false;
        biblioText.textContent = round.bibliography;
      } else {
        biblio.hidden = true;
      }
    }
  }

  function renderMissionRound() {
    const pack = state.missionPack;
    const titleEl = document.getElementById("mission-title");
    const prompt = document.getElementById("mission-prompt");
    const hint = document.getElementById("mission-hint");
    const choices = document.getElementById("mission-choices");
    const feedback = document.getElementById("mission-feedback");
    const next = document.getElementById("mission-next");
    const stars = document.getElementById("mission-stars");
    const progress = document.getElementById("mission-progress");
    const loading = document.getElementById("mission-loading");
    const stage = document.getElementById("mission-stage");
    const badge = document.getElementById("mission-badge");
    const burst = document.getElementById("mission-burst");

    if (!pack || !pack.rounds || !pack.rounds.length) return;
    const idx = state.missionRound;
    const round = pack.rounds[idx];
    state.missionDone = false;

    loading.hidden = true;
    if (stage) {
      stage.hidden = false;
      stage.classList.remove("is-enter");
      void stage.offsetWidth;
      stage.classList.add("is-enter");
    }
    prompt.hidden = false;
    hint.hidden = false;
    feedback.hidden = true;
    feedback.classList.remove("is-ok", "is-bad");
    next.hidden = true;
    if (burst) burst.hidden = true;
    choices.innerHTML = "";
    stars.textContent = `⭐ ${state.stars}`;

    if (titleEl) {
      titleEl.textContent = pack.fromAether
        ? `${pack.title || "Misión"}`
        : pack.title || "Misión";
    }
    if (badge) {
      badge.textContent = round.type_label || "Práctica";
      badge.dataset.type = round.type || "practice";
    }
    updateStepper(pack.rounds, idx);
    if (progress) {
      progress.hidden = false;
      progress.textContent = `Paso ${idx + 1} de ${pack.rounds.length}`;
    }

    showConcept(round);
    setupTracePad(!!round.needs_trace, round.label);
    prompt.textContent = round.prompt;
    hint.textContent = round.hint || copyByAge[state.age]["mission-hint"];

    if (window.DidzagoAudio) {
      window.DidzagoAudio._speakGetter = () => {
        const choices = (round.choices || []).map((c) => c.label).join(". ");
        return [round.type_label, round.title, round.concept, round.prompt, choices ? `Opciones: ${choices}` : ""]
          .filter(Boolean)
          .join(". ");
      };
      window.DidzagoAudio.stop();
      window.DidzagoAudio.speakRound(round);
    }

    round.choices.forEach((choice) => {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "choice";
      btn.textContent = choice.label;
      btn.addEventListener("click", () => {
        if (state.missionDone) return;
        if (choice.correct) {
          state.missionDone = true;
          btn.classList.add("choice--correct");
          addStars(10);
          stars.textContent = `⭐ ${state.stars}`;
          feedback.hidden = false;
          feedback.classList.add("is-ok");
          feedback.textContent = round.success || "¡Correcto!";
          if (burst) {
            burst.hidden = false;
            burst.textContent = "✨🎉✨";
          }
          if (window.DidzagoAudio) {
            window.DidzagoAudio.speakParts(["Muy bien.", round.success || "¡Correcto!"]);
          }
          next.hidden = false;
          const last = idx >= pack.rounds.length - 1;
          next.textContent = last ? "Otra misión" : "Siguiente";
          if (last) completeMission();
          refreshProfile();
        } else {
          btn.classList.add("choice--wrong");
          feedback.hidden = false;
          feedback.classList.remove("is-ok");
          feedback.classList.add("is-bad");
          feedback.textContent = round.retry || "Buen intento";
          if (window.DidzagoAudio) {
            window.DidzagoAudio.speakParts(["Casi.", round.retry || "Buen intento"]);
          }
          setTimeout(() => btn.classList.remove("choice--wrong"), 450);
        }
      });
      choices.appendChild(btn);
    });
  }

  async function setupMission() {
    const titleEl = document.getElementById("mission-title");
    const prompt = document.getElementById("mission-prompt");
    const hint = document.getElementById("mission-hint");
    const choices = document.getElementById("mission-choices");
    const feedback = document.getElementById("mission-feedback");
    const next = document.getElementById("mission-next");
    const stars = document.getElementById("mission-stars");
    const loading = document.getElementById("mission-loading");
    const progress = document.getElementById("mission-progress");
    const stage = document.getElementById("mission-stage");

    state.missionDone = false;
    state.missionRound = 0;
    state.missionPack = null;
    feedback.hidden = true;
    next.hidden = true;
    choices.innerHTML = "";
    stars.textContent = `⭐ ${state.stars}`;
    prompt.hidden = true;
    hint.hidden = true;
    if (progress) progress.hidden = true;
    if (stage) stage.hidden = true;
    hideConcept();
    loading.hidden = false;
    if (titleEl) titleEl.textContent = "Preparando…";

    const result = await fetchActivity("mission", state.subject);
    if (result.ok && result.activity) {
      const act = result.activity;
      const rounds =
        Array.isArray(act.rounds) && act.rounds.length
          ? act.rounds
          : [
              {
                type: "practice",
                type_label: "Práctica",
                mode: "identify",
                title: act.concept_title || act.title,
                concept: act.concept || "",
                prompt: act.prompt,
                hint: act.hint,
                image: act.image || null,
                bibliography: act.bibliography || "",
                choices: act.choices,
                success: act.success,
                retry: act.retry,
                kind: act.kind || "",
                label: act.label || "",
                needs_trace: false,
              },
            ];
      state.missionPack = {
        title: act.title,
        fromAether: true,
        rounds,
      };
    } else {
      const data = fallback("mission");
      state.missionPack = {
        title: data.title,
        fromAether: false,
        rounds: [
          {
            type: "practice",
            type_label: "Práctica",
            mode: "identify",
            title: data.title,
            concept: "",
            prompt: data.prompt,
            hint: data.hint,
            image: null,
            bibliography: "",
            choices: data.choices,
            success: data.success,
            retry: data.retry,
            kind: "",
            label: "",
            needs_trace: false,
          },
        ],
      };
    }
    renderMissionRound();
  }

  function hideGameBoards() {
    document.getElementById("memory-board").hidden = true;
    document.getElementById("puzzle-board").hidden = true;
    document.getElementById("escape-board").hidden = true;
    document.getElementById("game-choices").hidden = true;
    document.getElementById("game-again").hidden = true;
    document.getElementById("game-feedback").hidden = true;
  }

  async function setupGame() {
    const loading = document.getElementById("game-loading");
    const intro = document.getElementById("game-intro");
    const title = document.getElementById("game-title");
    const moves = document.getElementById("game-moves");

    hideGameBoards();
    intro.hidden = true;
    loading.hidden = false;
    moves.textContent = "…";

    const type = state.gameType;
    const action = type === "memorama" ? "memory" : type === "puzzle" ? "puzzle" : "escape";
    const result = await fetchActivity(action, "mixto");
    const data = result.ok ? result.activity : fallback(action);

    loading.hidden = true;
    intro.hidden = false;

    if (type === "memorama") {
      title.textContent = data.title || "Memorama";
      intro.textContent = data.intro || "Encuentra las parejas.";
      renderMemory(data);
    } else if (type === "puzzle") {
      title.textContent = data.title || "Puzzle";
      intro.textContent = data.intro || "¿Qué número falta?";
      renderPuzzle(data);
    } else {
      title.textContent = data.title || "Escape";
      intro.textContent = data.story || data.clue || "Resuelve la pista.";
      renderEscape(data);
    }
    document.getElementById("game-again").hidden = false;
  }

  function renderMemory(data) {
    const board = document.getElementById("memory-board");
    const movesEl = document.getElementById("game-moves");
    const feedback = document.getElementById("game-feedback");
    board.hidden = false;
    const base = data.pairs || ["A", "B", "C"];
    const cards = shuffle([...base, ...base]);
    let flipped = [];
    let lock = false;
    let matched = 0;
    feedback.hidden = true;
    movesEl.textContent = "0 pares";
    board.innerHTML = "";
    cards.forEach((value) => {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "card-mem";
      btn.dataset.value = value;
      btn.addEventListener("click", () => {
        if (lock || btn.classList.contains("card-mem--flipped") || btn.classList.contains("card-mem--matched")) return;
        btn.classList.add("card-mem--flipped");
        btn.textContent = value;
        flipped.push(btn);
        if (flipped.length < 2) return;
        lock = true;
        const [a, b] = flipped;
        if (a.dataset.value === b.dataset.value) {
          a.classList.add("card-mem--matched");
          b.classList.add("card-mem--matched");
          matched += 1;
          movesEl.textContent = `${matched} pares`;
          flipped = [];
          lock = false;
          if (matched === base.length) {
            addStars(15);
            feedback.hidden = false;
            feedback.textContent = state.age === "4-6" ? "¡Ganaste!" : "¡Tablero completo! +15 estrellas";
            refreshProfile();
          }
        } else {
          setTimeout(() => {
            a.classList.remove("card-mem--flipped");
            b.classList.remove("card-mem--flipped");
            a.textContent = "";
            b.textContent = "";
            flipped = [];
            lock = false;
          }, 650);
        }
      });
      board.appendChild(btn);
    });
  }

  function renderPuzzle(data) {
    const board = document.getElementById("puzzle-board");
    const choicesEl = document.getElementById("game-choices");
    const movesEl = document.getElementById("game-moves");
    const feedback = document.getElementById("game-feedback");
    board.hidden = false;
    choicesEl.hidden = false;
    movesEl.textContent = "Serie";
    feedback.hidden = true;
    board.innerHTML = "";
    choicesEl.innerHTML = "";
    const seq = data.sequence || [1, 2, 3, 4];
    const missing = Number.isInteger(data.missing_index) ? data.missing_index : 1;
    seq.forEach((n, i) => {
      const cell = document.createElement("div");
      cell.className = "puzzle-cell" + (i === missing ? " puzzle-cell--missing" : "");
      cell.textContent = i === missing ? "?" : String(n);
      board.appendChild(cell);
    });
    let done = false;
    (data.choices || []).forEach((choice) => {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "choice";
      btn.textContent = choice.label;
      btn.addEventListener("click", () => {
        if (done) return;
        if (choice.correct) {
          done = true;
          btn.classList.add("choice--correct");
          addStars(12);
          feedback.hidden = false;
          feedback.textContent = "¡Serie completa! +12 estrellas";
          refreshProfile();
        } else {
          btn.classList.add("choice--wrong");
          feedback.hidden = false;
          feedback.textContent = "Ese no es. Mira el patrón.";
          setTimeout(() => btn.classList.remove("choice--wrong"), 450);
        }
      });
      choicesEl.appendChild(btn);
    });
  }

  function renderEscape(data) {
    const board = document.getElementById("escape-board");
    const choicesEl = document.getElementById("game-choices");
    const movesEl = document.getElementById("game-moves");
    const feedback = document.getElementById("game-feedback");
    board.hidden = false;
    choicesEl.hidden = false;
    movesEl.textContent = "Pista";
    feedback.hidden = true;
    board.innerHTML = "";
    choicesEl.innerHTML = "";
    const clue = document.createElement("p");
    clue.className = "escape-clue";
    clue.textContent = data.clue || "Resuelve la pista.";
    board.appendChild(clue);
    let done = false;
    (data.choices || []).forEach((choice) => {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "choice";
      btn.textContent = choice.label;
      btn.addEventListener("click", () => {
        if (done) return;
        if (choice.correct) {
          done = true;
          btn.classList.add("choice--correct");
          addStars(15);
          feedback.hidden = false;
          feedback.textContent = data.success || "¡Escapaste!";
          refreshProfile();
        } else {
          btn.classList.add("choice--wrong");
          feedback.hidden = false;
          feedback.textContent = data.retry || "Buena idea, pero no.";
          setTimeout(() => btn.classList.remove("choice--wrong"), 450);
        }
      });
      choicesEl.appendChild(btn);
    });
  }

  function shuffle(list) {
    const arr = [...list];
    for (let i = arr.length - 1; i > 0; i -= 1) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  }

  document.querySelectorAll("[data-go]").forEach((el) => {
    el.addEventListener("click", () => {
      if (el.dataset.subject) state.subject = el.dataset.subject;
      if (el.dataset.game) state.gameType = el.dataset.game;
      if (el.dataset.mode === "libre") state.gameType = "memorama";
      go(el.dataset.go);
    });
  });

  document.querySelectorAll("[data-set-age]").forEach((btn) => {
    btn.addEventListener("click", () => applyAge(btn.dataset.setAge));
  });

  document.querySelectorAll("[data-pin]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const error = document.getElementById("gate-error");
      if (btn.dataset.pin === "12") {
        error.hidden = true;
        go("padres");
      } else {
        error.hidden = false;
      }
    });
  });

  const missionNext = document.getElementById("mission-next");
  if (missionNext) {
    missionNext.addEventListener("click", () => {
      const pack = state.missionPack;
      if (pack && state.missionRound < pack.rounds.length - 1) {
        state.missionRound += 1;
        renderMissionRound();
        return;
      }
      state.subject = "mixto";
      setupMission();
    });
  }

  const gameAgain = document.getElementById("game-again");
  if (gameAgain) gameAgain.addEventListener("click", () => setupGame());

  const toggleAether = document.getElementById("toggle-aether");
  if (toggleAether) {
    toggleAether.addEventListener("change", () => {
      state.aetherOn = toggleAether.checked;
      localStorage.setItem("didzago-aether", state.aetherOn ? "1" : "0");
      refreshParents();
    });
  }

  applyAge(state.age);
  checkAether();
  if (window.DidzagoAudio) window.DidzagoAudio.init();
  go("splash");

  document.addEventListener("visibilitychange", () => {
    if (document.hidden) {
      if (window.DidzagoAetherVideo) window.DidzagoAetherVideo.pauseAll();
    } else {
      const active = document.querySelector(".screen--active");
      if (active) syncAetherVideos(active.dataset.screen);
    }
  });
})();
