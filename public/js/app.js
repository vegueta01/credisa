(function () {
  "use strict";

  const CONFIG = {
    whatsapp: "573016040565",
    brand: "Variedades Adrian",
  };

  const grid = document.getElementById("grid");
  const emptyState = document.getElementById("emptyState");
  const tabs = document.querySelectorAll(".tab-btn");
  const searchInput = document.getElementById("searchInput");
  const resultCount = document.getElementById("resultCount");
  const yearEl = document.getElementById("year");

  const lightbox = document.getElementById("lightbox");
  const lightboxInner = lightbox.querySelector(".lightbox-inner");
  const lightboxMedia = document.getElementById("lightboxMedia");
  const lightboxBrand = document.getElementById("lightboxBrand");
  const lightboxName = document.getElementById("lightboxName");
  const lightboxNote = document.getElementById("lightboxNote");
  const lightboxWa = document.getElementById("lightboxWa");
  const lightboxClose = document.getElementById("lightboxClose");

  let state = { category: "todos", query: "" };
  let PRODUCTS = []; // se llena desde /api/products al cargar
  let visibleProducts = []; // lo que está filtrado/visible ahora mismo, para navegar el lightbox
  let currentIndex = -1;
  const storyMQ = window.matchMedia("(max-width: 640px)");

  // ---------------------------------------------------------------------
  // Pista de gestos: le muestra al usuario (solo en mobile) que puede
  // tocar los lados o arrastrar para pasar de perfume. Se guarda en
  // localStorage cuántas veces se mostró y si el usuario ya hizo el gesto
  // por su cuenta; a los 15 días sin actividad se reactiva el ciclo.
  // ---------------------------------------------------------------------
  const HINT_KEY = "va_lightbox_hint_v1";
  const HINT_MAX_SHOWS = 4;
  const HINT_REACTIVATE_DAYS = 15;
  const HINT_DELAY_MS = 2600;
  let hintTimer = null;
  let hintStepTimer = null;

  function readHintState() {
    const fresh = { shownCount: 0, gestureDone: false, lastActivityAt: 0 };
    try {
      const raw = localStorage.getItem(HINT_KEY);
      if (!raw) return fresh;
      const state = JSON.parse(raw);
      const daysSince = (Date.now() - (state.lastActivityAt || 0)) / (1000 * 60 * 60 * 24);
      return daysSince > HINT_REACTIVATE_DAYS ? fresh : state;
    } catch {
      return fresh;
    }
  }

  function writeHintState(patch) {
    try {
      const state = { ...readHintState(), ...patch, lastActivityAt: Date.now() };
      localStorage.setItem(HINT_KEY, JSON.stringify(state));
    } catch {
      // localStorage no disponible (modo privado, cuota, etc.) — sin pista persistente, no es grave.
    }
  }

  function cancelHint() {
    if (hintTimer) {
      clearTimeout(hintTimer);
      hintTimer = null;
    }
    if (hintStepTimer) {
      clearTimeout(hintStepTimer);
      hintStepTimer = null;
    }
    lightbox.classList.remove("show-hint-chevrons");
    lightboxInner.style.transform = "";
  }

  function markGestureDone() {
    cancelHint();
    writeHintState({ gestureDone: true });
  }

  const HINT_ANIM_MS = 1600; // debe coincidir con la duración de styles.css (lightboxHintChevron)
  const HINT_NUDGE_STEPS = [-24, 0, 24, 0]; // px: izquierda, centro, derecha, centro

  function playHint() {
    lightbox.classList.add("show-hint-chevrons");
    const stepMs = HINT_ANIM_MS / HINT_NUDGE_STEPS.length;
    let i = 0;
    const runStep = () => {
      lightboxInner.style.transform = HINT_NUDGE_STEPS[i] ? `translateX(${HINT_NUDGE_STEPS[i]}px)` : "";
      i += 1;
      hintStepTimer = i < HINT_NUDGE_STEPS.length ? setTimeout(runStep, stepMs) : null;
    };
    runStep();
    hintTimer = setTimeout(() => {
      lightbox.classList.remove("show-hint-chevrons");
      hintTimer = null;
    }, HINT_ANIM_MS);
    writeHintState({ shownCount: readHintState().shownCount + 1 });
  }

  function scheduleHint() {
    cancelHint();
    if (!storyMQ.matches) return; // los gestos laterales solo existen en mobile
    const s = readHintState();
    if (s.gestureDone || s.shownCount >= HINT_MAX_SHOWS) return;
    hintTimer = setTimeout(playHint, HINT_DELAY_MS);
  }

  function waLink(product) {
    const msg = `Hola ${CONFIG.brand}, me interesa el perfume "${product.name}" (${product.brand}). ¿Me das más información?`;
    return `https://wa.me/${CONFIG.whatsapp}?text=${encodeURIComponent(msg)}`;
  }

  function waLinkAgotado(product) {
    const msg = `Hola ${CONFIG.brand}, vi que "${product.name}" (${product.brand}) está agotado. ¿Sabes cuándo vuelve a estar disponible?`;
    return `https://wa.me/${CONFIG.whatsapp}?text=${encodeURIComponent(msg)}`;
  }

  function waIcon() {
    return `<svg viewBox="0 0 24 24" fill="currentColor"><path d="M17.47 14.38c-.28-.14-1.67-.82-1.93-.92-.26-.09-.45-.14-.64.14-.19.28-.73.92-.9 1.11-.16.19-.33.21-.61.07-.28-.14-1.18-.43-2.24-1.38-.83-.74-1.39-1.65-1.55-1.93-.16-.28-.02-.43.12-.57.13-.13.28-.33.42-.5.14-.16.19-.28.28-.47.09-.19.05-.35-.02-.5-.07-.14-.64-1.54-.88-2.11-.23-.55-.47-.48-.64-.49h-.55c-.19 0-.5.07-.76.35-.26.28-1 .98-1 2.39s1.02 2.77 1.16 2.96c.14.19 2 3.05 4.84 4.28.68.29 1.21.47 1.62.6.68.22 1.3.19 1.79.11.55-.08 1.67-.68 1.9-1.34.24-.66.24-1.22.16-1.34-.07-.12-.26-.19-.54-.33z"/><path d="M12.04 2C6.58 2 2.15 6.41 2.15 11.85c0 1.87.52 3.62 1.42 5.12L2 22l5.19-1.53a9.9 9.9 0 0 0 4.85 1.25h.01c5.46 0 9.89-4.41 9.89-9.85C21.94 6.42 17.5 2 12.04 2zm5.86 15.7a8.2 8.2 0 0 1-5.85 2.44h-.01a8.2 8.2 0 0 1-4.19-1.15l-.3-.18-3.08.9.91-3-.2-.31a8.15 8.15 0 0 1-1.26-4.35c0-4.53 3.7-8.22 8.24-8.22 2.2 0 4.27.86 5.83 2.41a8.16 8.16 0 0 1 2.41 5.81c0 4.53-3.7 8.22-8.24 8.22"/></svg>`;
  }

  function cardTemplate(p) {
    const isOut = !!p.agotado;
    return `
      <article class="card ${isOut ? "is-agotado" : ""}" data-slug="${p.slug}" data-category="${p.category}">
        <div class="card-media">
          <span class="card-cat">${p.category === "hombre" ? "Hombre" : "Mujer"}</span>
          ${isOut ? '<span class="ribbon-agotado">Agotado</span>' : ""}
          <img src="${p.img}" alt="${p.name} — ${p.brand}" loading="lazy" width="900" height="1125">
        </div>
        <div class="card-body">
          <span class="card-brand">${p.brand}</span>
          <h3 class="card-name">${p.name}</h3>
          <span class="card-note">${p.note}</span>
          ${isOut
            ? `<a class="card-cta card-cta-muted" href="${waLinkAgotado(p)}" target="_blank" rel="noopener" aria-label="Preguntar disponibilidad de ${p.name}">${waIcon()} Agotado · Preguntar</a>`
            : `<a class="card-cta" href="${waLink(p)}" target="_blank" rel="noopener" aria-label="Consultar ${p.name} por WhatsApp">${waIcon()} Consultar</a>`
          }
        </div>
      </article>`;
  }

  function normalize(str) {
    return str
      .toLowerCase()
      .normalize("NFD")
      .replace(/[̀-ͯ]/g, "");
  }

  function applyFilters() {
    const q = normalize(state.query.trim());
    const filtered = PRODUCTS.filter((p) => {
      const matchCat = state.category === "todos" || p.category === state.category;
      const haystack = normalize(`${p.name} ${p.brand} ${p.note}`);
      const matchQuery = !q || haystack.includes(q);
      return matchCat && matchQuery;
    });

    visibleProducts = filtered;
    grid.innerHTML = filtered.map(cardTemplate).join("");
    emptyState.classList.toggle("show", filtered.length === 0);
    resultCount.textContent = filtered.length;

    requestAnimationFrame(() => {
      grid.querySelectorAll(".card").forEach((card, i) => {
        setTimeout(() => card.classList.add("in-view"), i * 35);
      });
    });

    grid.querySelectorAll(".card-media").forEach((media) => {
      media.addEventListener("click", () => {
        const slug = media.closest(".card").dataset.slug;
        openLightbox(slug);
      });
    });
  }

  function setActiveTab(cat) {
    tabs.forEach((btn) => btn.classList.toggle("active", btn.dataset.category === cat));
  }

  tabs.forEach((btn) => {
    btn.addEventListener("click", () => {
      state.category = btn.dataset.category;
      setActiveTab(state.category);
      applyFilters();
    });
  });

  let searchDebounce;
  searchInput.addEventListener("input", (e) => {
    clearTimeout(searchDebounce);
    const val = e.target.value;
    searchDebounce = setTimeout(() => {
      state.query = val;
      applyFilters();
    }, 120);
  });

  function renderLightbox(p) {
    lightboxMedia.innerHTML = `<img src="${p.img}" alt="${p.name}">`;
    lightboxBrand.textContent = p.brand;
    lightboxName.textContent = p.name;
    lightboxNote.textContent = p.note;
    lightboxWa.href = waLink(p);
  }

  function openLightbox(slug) {
    const idx = visibleProducts.findIndex((x) => x.slug === slug);
    if (idx === -1) return;
    currentIndex = idx;
    renderLightbox(visibleProducts[currentIndex]);
    resetDrag();
    lightbox.classList.add("open");
    document.body.style.overflow = "hidden";
    scheduleHint();
  }

  function closeLightbox() {
    lightbox.classList.remove("open");
    document.body.style.overflow = "";
    resetDrag();
    cancelHint();
  }

  const SLIDE_MS = 180;

  // direction: -1 = avanzar (la tarjeta sale por la izquierda, entra desde la derecha)
  //             1 = retroceder (sale por la derecha, entra desde la izquierda)
  function goToIndex(newIndex, direction) {
    if (newIndex < 0 || newIndex >= visibleProducts.length) {
      snapBack();
      return;
    }
    markGestureDone(); // el usuario ya sabe que puede pasar de perfume así, no hace falta seguir mostrándole la pista
    lightboxInner.classList.remove("dragging");
    lightboxInner.style.transition = `transform ${SLIDE_MS}ms ease, opacity ${SLIDE_MS}ms ease`;
    lightboxInner.style.transform = `translateX(${direction * 100}%)`;
    lightboxInner.style.opacity = "0";
    setTimeout(() => {
      currentIndex = newIndex;
      renderLightbox(visibleProducts[currentIndex]);
      lightboxInner.style.transition = "none";
      lightboxInner.style.transform = `translateX(${direction * -100}%)`;
      lightboxInner.offsetHeight; // forzar reflow para que la siguiente transición sí se anime
      lightboxInner.style.transition = `transform ${SLIDE_MS}ms ease, opacity ${SLIDE_MS}ms ease`;
      lightboxInner.style.transform = "translateX(0)";
      lightboxInner.style.opacity = "1";
    }, SLIDE_MS);
  }

  function showNext() { goToIndex(currentIndex + 1, -1); }
  function showPrev() { goToIndex(currentIndex - 1, 1); }

  function snapBack() {
    lightboxInner.classList.remove("dragging");
    lightboxInner.style.transition = `transform ${SLIDE_MS}ms ease, opacity ${SLIDE_MS}ms ease`;
    lightboxInner.style.transform = "";
    lightboxInner.style.opacity = "";
  }

  lightboxClose.addEventListener("click", closeLightbox);
  lightbox.addEventListener("click", (e) => {
    if (e.target === lightbox) closeLightbox();
  });
  document.addEventListener("keydown", (e) => {
    if (!lightbox.classList.contains("open")) return;
    if (e.key === "Escape") closeLightbox();
    if (e.key === "ArrowRight") showNext();
    if (e.key === "ArrowLeft") showPrev();
  });

  // Gestos táctiles: arrastrar hacia abajo cierra (todo tamaño de pantalla);
  // en mobile (pantalla completa, "modo historia") arrastrar a los lados o
  // tocar el lateral izquierdo/derecho de la foto avanza o retrocede.
  const CLOSE_THRESHOLD = 110;
  const SWIPE_THRESHOLD = 70;
  const TAP_SLOP = 10; // movimiento máximo para seguir considerándose un "toque"
  let startX = 0, startY = 0, dragDeltaX = 0, dragDeltaY = 0;
  let axis = null; // "x" | "y" | null (aún sin decidir)
  let touchActive = false;

  function resetDrag() {
    touchActive = false;
    axis = null;
    dragDeltaX = 0;
    dragDeltaY = 0;
    lightboxInner.classList.remove("dragging");
    lightboxInner.style.transition = "";
    lightboxInner.style.transform = "";
    lightboxInner.style.opacity = "";
  }

  lightboxInner.addEventListener("touchstart", (e) => {
    if (e.target.closest("a, button")) return; // no interferir con el botón de WhatsApp
    cancelHint(); // el usuario ya está interactuando, no hace falta seguir mostrando la pista
    touchActive = true;
    axis = null;
    startX = e.touches[0].clientX;
    startY = e.touches[0].clientY;
    dragDeltaX = 0;
    dragDeltaY = 0;
  }, { passive: true });

  lightboxInner.addEventListener("touchmove", (e) => {
    if (!touchActive) return;
    const x = e.touches[0].clientX;
    const y = e.touches[0].clientY;
    dragDeltaX = x - startX;
    dragDeltaY = y - startY;

    if (axis === null) {
      if (Math.abs(dragDeltaX) < TAP_SLOP && Math.abs(dragDeltaY) < TAP_SLOP) return;
      const horizontalAllowed = storyMQ.matches;
      axis = horizontalAllowed && Math.abs(dragDeltaX) > Math.abs(dragDeltaY) ? "x" : "y";
      lightboxInner.classList.add("dragging");
      lightboxInner.style.transition = "none";
    }

    if (axis === "y") {
      if (dragDeltaY <= 0) return; // solo se arrastra hacia abajo para cerrar
      e.preventDefault();
      lightboxInner.style.transform = `translateY(${dragDeltaY}px)`;
      lightboxInner.style.opacity = String(Math.max(1 - dragDeltaY / 400, 0.4));
    } else if (axis === "x") {
      e.preventDefault();
      lightboxInner.style.transform = `translateX(${dragDeltaX}px)`;
    }
  }, { passive: false });

  lightboxInner.addEventListener("touchend", () => {
    if (!touchActive) return;
    touchActive = false;
    lightboxInner.classList.remove("dragging");

    if (axis === "y") {
      if (dragDeltaY > CLOSE_THRESHOLD) {
        closeLightbox();
      } else {
        snapBack();
      }
    } else if (axis === "x") {
      if (dragDeltaX <= -SWIPE_THRESHOLD) {
        showNext();
      } else if (dragDeltaX >= SWIPE_THRESHOLD) {
        showPrev();
      } else {
        snapBack();
      }
    } else if (storyMQ.matches) {
      // Toque simple sin arrastre: tocar el lateral de la foto avanza/retrocede,
      // igual que en historias de Instagram/TikTok.
      const rect = lightboxMedia.getBoundingClientRect();
      if (startY >= rect.top && startY <= rect.bottom) {
        const relativeX = (startX - rect.left) / rect.width;
        if (relativeX < 0.5) showPrev();
        else showNext();
      }
    }
  });

  // Reveal-on-scroll for generic sections
  const io = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add("in-view");
          io.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.12 }
  );
  document.querySelectorAll(".reveal").forEach((el) => io.observe(el));

  // Smooth in-page nav for CTA buttons that jump to #catalogo
  document.querySelectorAll('a[href="#catalogo"]').forEach((a) => {
    a.addEventListener("click", (e) => {
      e.preventDefault();
      document.getElementById("catalogo").scrollIntoView({ behavior: "smooth", block: "start" });
    });
  });

  yearEl.textContent = new Date().getFullYear();

  async function init() {
    try {
      const res = await fetch("/api/products", { cache: "no-store" });
      PRODUCTS = res.ok ? await res.json() : [];
    } catch {
      PRODUCTS = [];
    }
    applyFilters();
  }

  init();
})();
