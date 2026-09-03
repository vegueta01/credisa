(function () {
  "use strict";

  const CONFIG = {
    whatsapp: "573016040565",
    brand: "Créditos S.M.",
  };

  const grid = document.getElementById("grid");
  const emptyState = document.getElementById("emptyState");
  const tabs = document.querySelectorAll(".tab-btn");
  const searchInput = document.getElementById("searchInput");
  const resultCount = document.getElementById("resultCount");
  const yearEl = document.getElementById("year");

  const lightbox = document.getElementById("lightbox");
  const lightboxMedia = document.getElementById("lightboxMedia");
  const lightboxBrand = document.getElementById("lightboxBrand");
  const lightboxName = document.getElementById("lightboxName");
  const lightboxNote = document.getElementById("lightboxNote");
  const lightboxWa = document.getElementById("lightboxWa");
  const lightboxClose = document.getElementById("lightboxClose");

  let state = { category: "todos", query: "" };

  function waLink(product) {
    const msg = `Hola ${CONFIG.brand}, me interesa el perfume "${product.name}" (${product.brand}). ¿Me das más información?`;
    return `https://wa.me/${CONFIG.whatsapp}?text=${encodeURIComponent(msg)}`;
  }

  function waIcon() {
    return `<svg viewBox="0 0 24 24" fill="currentColor"><path d="M17.47 14.38c-.28-.14-1.67-.82-1.93-.92-.26-.09-.45-.14-.64.14-.19.28-.73.92-.9 1.11-.16.19-.33.21-.61.07-.28-.14-1.18-.43-2.24-1.38-.83-.74-1.39-1.65-1.55-1.93-.16-.28-.02-.43.12-.57.13-.13.28-.33.42-.5.14-.16.19-.28.28-.47.09-.19.05-.35-.02-.5-.07-.14-.64-1.54-.88-2.11-.23-.55-.47-.48-.64-.49h-.55c-.19 0-.5.07-.76.35-.26.28-1 .98-1 2.39s1.02 2.77 1.16 2.96c.14.19 2 3.05 4.84 4.28.68.29 1.21.47 1.62.6.68.22 1.3.19 1.79.11.55-.08 1.67-.68 1.9-1.34.24-.66.24-1.22.16-1.34-.07-.12-.26-.19-.54-.33z"/><path d="M12.04 2C6.58 2 2.15 6.41 2.15 11.85c0 1.87.52 3.62 1.42 5.12L2 22l5.19-1.53a9.9 9.9 0 0 0 4.85 1.25h.01c5.46 0 9.89-4.41 9.89-9.85C21.94 6.42 17.5 2 12.04 2zm5.86 15.7a8.2 8.2 0 0 1-5.85 2.44h-.01a8.2 8.2 0 0 1-4.19-1.15l-.3-.18-3.08.9.91-3-.2-.31a8.15 8.15 0 0 1-1.26-4.35c0-4.53 3.7-8.22 8.24-8.22 2.2 0 4.27.86 5.83 2.41a8.16 8.16 0 0 1 2.41 5.81c0 4.53-3.7 8.22-8.24 8.22"/></svg>`;
  }

  function cardTemplate(p) {
    return `
      <article class="card" data-slug="${p.slug}" data-category="${p.category}">
        <div class="card-media">
          <span class="card-cat">${p.category === "hombre" ? "Hombre" : "Mujer"}</span>
          <img src="${p.img}" alt="${p.name} — ${p.brand}" loading="lazy" width="900" height="1125">
        </div>
        <div class="card-body">
          <span class="card-brand">${p.brand}</span>
          <h3 class="card-name">${p.name}</h3>
          <span class="card-note">${p.note}</span>
          <a class="card-cta" href="${waLink(p)}" target="_blank" rel="noopener" aria-label="Consultar ${p.name} por WhatsApp">
            ${waIcon()} Consultar
          </a>
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

  function openLightbox(slug) {
    const p = PRODUCTS.find((x) => x.slug === slug);
    if (!p) return;
    lightboxMedia.innerHTML = `<img src="${p.img}" alt="${p.name}">`;
    lightboxBrand.textContent = p.brand;
    lightboxName.textContent = p.name;
    lightboxNote.textContent = p.note;
    lightboxWa.href = waLink(p);
    lightbox.classList.add("open");
    document.body.style.overflow = "hidden";
  }

  function closeLightbox() {
    lightbox.classList.remove("open");
    document.body.style.overflow = "";
  }

  lightboxClose.addEventListener("click", closeLightbox);
  lightbox.addEventListener("click", (e) => {
    if (e.target === lightbox) closeLightbox();
  });
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") closeLightbox();
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

  applyFilters();
})();
