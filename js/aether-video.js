/**
 * MP4 no soporta alfa: chroma-key en canvas → fondo transparente.
 * Escala el canvas al tamaño CSS del contenedor (móvil / tablet / desktop).
 */
(function (global) {
  const instances = new Map();

  function sampleCornerAverage(data, w, h) {
    const points = [
      [2, 2],
      [w - 3, 2],
      [2, h - 3],
      [w - 3, h - 3],
      [Math.floor(w / 2), 2],
      [2, Math.floor(h / 2)],
    ];
    let r = 0;
    let g = 0;
    let b = 0;
    let n = 0;
    points.forEach(([x, y]) => {
      const i = (y * w + x) * 4;
      r += data[i];
      g += data[i + 1];
      b += data[i + 2];
      n += 1;
    });
    return { r: r / n, g: g / n, b: b / n };
  }

  function keyFrame(ctx, video, keyColor, threshold, softness) {
    const w = ctx.canvas.width;
    const h = ctx.canvas.height;
    ctx.clearRect(0, 0, w, h);
    ctx.drawImage(video, 0, 0, w, h);
    const frame = ctx.getImageData(0, 0, w, h);
    const data = frame.data;
    const key = keyColor || sampleCornerAverage(data, w, h);

    for (let i = 0; i < data.length; i += 4) {
      const dr = data[i] - key.r;
      const dg = data[i + 1] - key.g;
      const db = data[i + 2] - key.b;
      const dist = Math.sqrt(dr * dr + dg * dg + db * db);
      if (dist < threshold) {
        data[i + 3] = 0;
      } else if (dist < threshold + softness) {
        data[i + 3] = Math.round(((dist - threshold) / softness) * 255);
      }
    }
    ctx.putImageData(frame, 0, 0);
    return key;
  }

  function createInstance(video) {
    const frame = video.closest(".video-frame");
    if (!frame) return null;

    let canvas = frame.querySelector("canvas.video-frame__canvas");
    if (!canvas) {
      canvas = document.createElement("canvas");
      canvas.className = "video-frame__canvas video-frame__media";
      canvas.setAttribute("aria-hidden", "true");
      frame.appendChild(canvas);
    }

    video.classList.add("video-frame__source");
    video.setAttribute("aria-hidden", "true");

    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    const state = {
      video,
      canvas,
      ctx,
      frame,
      keyColor: null,
      raf: 0,
      running: false,
      threshold: 48,
      softness: 28,
    };

    function resize() {
      const rect = frame.getBoundingClientRect();
      const cssW = Math.max(1, Math.round(rect.width));
      const cssH = Math.max(1, Math.round(rect.height));
      // Resolución interna limitada para rendimiento en móviles
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const maxSide = window.matchMedia("(max-width: 480px)").matches
        ? 220
        : window.matchMedia("(max-width: 900px)").matches
          ? 320
          : 420;
      const scale = Math.min(1, maxSide / Math.max(cssW, cssH));
      const w = Math.max(1, Math.round(cssW * dpr * scale));
      const h = Math.max(1, Math.round(cssH * dpr * scale));
      if (canvas.width !== w || canvas.height !== h) {
        canvas.width = w;
        canvas.height = h;
        state.keyColor = null;
      }
    }

    function tick() {
      if (!state.running) return;
      if (video.readyState >= 2 && !video.paused) {
        resize();
        state.keyColor = keyFrame(
          ctx,
          video,
          state.keyColor,
          state.threshold,
          state.softness
        );
      }
      state.raf = requestAnimationFrame(tick);
    }

    function play() {
      resize();
      video.muted = true;
      const p = video.play();
      if (p && typeof p.catch === "function") p.catch(() => {});
      if (!state.running) {
        state.running = true;
        tick();
      }
    }

    function pause() {
      state.running = false;
      if (state.raf) cancelAnimationFrame(state.raf);
      state.raf = 0;
      video.pause();
      try {
        video.currentTime = 0;
      } catch (_) {
        /* ignore */
      }
      ctx.clearRect(0, 0, canvas.width, canvas.height);
    }

    video.addEventListener("loadeddata", () => {
      state.keyColor = null;
      resize();
    });

    window.addEventListener(
      "resize",
      () => {
        if (state.running) resize();
      },
      { passive: true }
    );

    return { play, pause, video, canvas };
  }

  function get(videoOrId) {
    const video =
      typeof videoOrId === "string"
        ? document.getElementById(videoOrId)
        : videoOrId;
    if (!video) return null;
    if (!instances.has(video)) {
      const inst = createInstance(video);
      if (inst) instances.set(video, inst);
    }
    return instances.get(video) || null;
  }

  function syncByScreen(activeScreen) {
    const map = {
      splash: "aether-video",
      mision: "aether-video-mission",
      juego: "aether-video-game",
    };
    Object.keys(map).forEach((screen) => {
      const inst = get(map[screen]);
      if (!inst) return;
      if (screen === activeScreen) inst.play();
      else inst.pause();
    });
  }

  function pauseAll() {
    instances.forEach((inst) => inst.pause());
  }

  global.DidzagoAetherVideo = { get, syncByScreen, pauseAll };
})(window);
