import { db } from "./firebase-config.js";
import {
  addDoc,
  collection,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

document.addEventListener("DOMContentLoaded", () => {
  const form = document.querySelector("#communityForm");
  const postsContainer = document.querySelector("#postsContainer");
  const searchInput = document.querySelector("#searchInput");
  const filterCategory = document.querySelector("#filterCategory");
  const toast = document.querySelector("#communityToast");
  const clearPostsBtn = document.querySelector("#clearPostsBtn");
  const threadViewer = document.querySelector("#threadViewer");
  const readerModal = document.querySelector("#communityReaderModal");
  const replyModal = document.querySelector("#communityReplyModal");
  const closeReaderBtn = document.querySelector("#closeReaderBtn");
  const closeReplyBtn = document.querySelector("#closeReplyBtn");
  const openReplyModalBtn = document.querySelector("#openReplyModalBtn");
  const readerHint = document.querySelector("#readerHint");
  const resultsCount = document.querySelector("#resultsCount");
  const openComposerBtn = document.querySelector("#openComposerBtn");
  const openComposerBtnCenter = document.querySelector("#openComposerBtnCenter");
  const composerModal = document.querySelector("#communityComposerModal");
  const closeComposerBtn = document.querySelector("#closeComposerBtn");
  const quickCategoryButtons = [...document.querySelectorAll("[data-quick-category]")];
  const featuredContainer = document.querySelector("#featuredContainer");
  const categoryCards = document.querySelector("#categoryCards");
  const activityList = document.querySelector("#activityList");
  const metricThreads = document.querySelector("#metricThreads");
  const metricAuthors = document.querySelector("#metricAuthors");
  const metricCategory = document.querySelector("#metricCategory");
  const metricReplies = document.querySelector("#metricReplies");
  const sortButtons = [...document.querySelectorAll("[data-sort]")];
  const replyForm = document.querySelector("#replyForm");
  const connectionLabel = document.querySelector("#communityConnectionLabel");

  if (!form || !postsContainer || !searchInput || !filterCategory || !toast || !threadViewer || !replyForm) {
    console.error("Faltan elementos del DOM necesarios para la comunidad.");
    return;
  }

  let allThreads = [];
  let allReplies = [];
  let filteredThreads = [];
  let selectedThreadId = null;
  let currentSort = "recent";
  let loadingThreads = true;
  let loadingReplies = true;

  const threadSubmitButton = form.querySelector('button[type="submit"]');
  const replySubmitButton = replyForm.querySelector('button[type="submit"]');

  const categories = ["Teoría", "Lore", "Opinión", "Hallazgo", "Sugerencia"];
  const categoryDescriptions = {
    "Teoría": "Ideas, pistas y conexiones ocultas sobre Mielópolis.",
    "Lore": "Historia, registros y contexto del mundo del juego.",
    "Opinión": "Conversaciones abiertas sobre personajes, mecánicas y decisiones.",
    "Hallazgo": "Detalles curiosos, descubrimientos y observaciones de la comunidad.",
    "Sugerencia": "Propuestas y mejoras para el proyecto y su universo."
  };

  const showToast = (message) => {
    toast.textContent = message;
    toast.classList.add("show");
    window.clearTimeout(showToast.timeoutId);
    showToast.timeoutId = window.setTimeout(() => toast.classList.remove("show"), 2400);
  };

  const setConnectionLabel = (text, status = "connecting") => {
    if (!connectionLabel) return;
    connectionLabel.textContent = text;
    connectionLabel.dataset.status = status;
  };

  setConnectionLabel("Conectando con Firebase...", "connecting");

  const escapeHTML = (text) => {
    const div = document.createElement("div");
    div.textContent = text ?? "";
    return div.innerHTML;
  };

  const formatDate = (item) => {
    if (item?.date && item.date !== "Sin fecha") return item.date;
    if (item?.createdAt?.seconds) {
      return new Date(item.createdAt.seconds * 1000).toLocaleDateString("es-MX", {
        day: "2-digit",
        month: "long",
        year: "numeric"
      });
    }
    return "Registro reciente";
  };

  const formatDateTime = (item) => {
    if (item?.createdAt?.seconds) {
      return new Date(item.createdAt.seconds * 1000).toLocaleString("es-MX", {
        day: "2-digit",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit"
      });
    }
    return formatDate(item);
  };

  const formatRelativeHours = (item) => {
    if (!item?.createdAt?.seconds) return "hace poco";
    const diffMs = Date.now() - item.createdAt.seconds * 1000;
    const hours = Math.max(1, Math.round(diffMs / 3600000));
    if (hours < 24) return `hace ${hours} h`;
    const days = Math.round(hours / 24);
    return `hace ${days} día${days === 1 ? "" : "s"}`;
  };

  const buildExcerpt = (text, max = 150) => {
    const value = (text || "").trim();
    if (value.length <= max) return value;
    return `${value.slice(0, max).trim()}…`;
  };

  const getRepliesForThread = (threadId) => allReplies
    .filter((reply) => reply.threadId === threadId)
    .sort((a, b) => (a.createdAt?.seconds || 0) - (b.createdAt?.seconds || 0));

  const getThreadById = (threadId) => allThreads.find((thread) => thread.id === threadId);

  const getLatestActivitySeconds = (thread) => Math.max(
    thread?.createdAt?.seconds || 0,
    ...getRepliesForThread(thread?.id).map((reply) => reply.createdAt?.seconds || 0)
  );

  const saveDraftIdentity = () => {
    const username = form.username?.value?.trim();
    const replyUsername = replyForm.replyUsername?.value?.trim();
    const role = replyForm.replyTag?.value || "Ciudadano";
    const preferredName = replyUsername || username;
    if (preferredName) localStorage.setItem("mielopolis_forum_name", preferredName);
    localStorage.setItem("mielopolis_forum_role", role);
  };

  const hydrateIdentity = () => {
    const savedName = localStorage.getItem("mielopolis_forum_name") || "";
    const savedRole = localStorage.getItem("mielopolis_forum_role") || "Ciudadano";
    if (savedName && !form.username.value) form.username.value = savedName;
    if (savedName && !replyForm.replyUsername.value) replyForm.replyUsername.value = savedName;
    if (savedRole && replyForm.replyTag) replyForm.replyTag.value = savedRole;
  };

  hydrateIdentity();

  const toggleModal = (modal, forceState) => {
    if (!modal) return;
    const shouldOpen = typeof forceState === "boolean"
      ? forceState
      : modal.getAttribute("aria-hidden") === "true";
    modal.setAttribute("aria-hidden", shouldOpen ? "false" : "true");
    document.body.classList.toggle(
      "modal-open",
      [composerModal, readerModal, replyModal].some((item) => item?.getAttribute("aria-hidden") === "false") || shouldOpen
    );
  };

  const toggleComposer = (forceState) => {
    const shouldOpen = typeof forceState === "boolean"
      ? forceState
      : composerModal?.getAttribute("aria-hidden") === "true";
    toggleModal(composerModal, shouldOpen);
    if (shouldOpen) {
      const firstField = form.querySelector("input, select, textarea");
      window.setTimeout(() => firstField?.focus(), 60);
    }
  };

  const toggleReader = (forceState) => {
    const shouldOpen = typeof forceState === "boolean"
      ? forceState
      : readerModal?.getAttribute("aria-hidden") === "true";
    toggleModal(readerModal, shouldOpen);
  };

  const toggleReply = (forceState) => {
    const shouldOpen = typeof forceState === "boolean"
      ? forceState
      : replyModal?.getAttribute("aria-hidden") === "true";
    toggleModal(replyModal, shouldOpen);
    if (shouldOpen) {
      window.setTimeout(() => replyForm.replyMessage?.focus(), 60);
    }
  };

  const syncQuickCategoryButtons = () => {
    quickCategoryButtons.forEach((button) => {
      button.classList.toggle("is-active", button.dataset.quickCategory === filterCategory.value);
    });
  };

  const updateHashForThread = (threadId) => {
    const url = new URL(window.location.href);
    url.hash = threadId ? `thread=${threadId}` : "";
    window.history.replaceState({}, "", url);
  };

  const buildRepliesMarkup = (threadId) => {
    const replies = threadId ? getRepliesForThread(threadId) : [];

    if (!threadId) {
      return `
        <div class="thread-viewer-empty compact inline-block">
          <strong>Sin publicación seleccionada</strong>
          <p>Selecciona una tarjeta reciente o destacada para abrir su contenido completo.</p>
        </div>
      `;
    }

    if (!replies.length) {
      return `
        <div class="thread-viewer-empty compact inline-block">
          <strong>Sin comentarios todavía</strong>
          <p>Esta publicación aún no tiene respuestas. Sé la primera persona en participar.</p>
        </div>
      `;
    }

    return `
      <div class="thread-replies-list thread-replies-list--inline">
        ${replies.map((reply) => `
          <article class="reply-card">
            <div class="reply-card-top">
              <div>
                <strong>${escapeHTML(reply.username)}</strong>
                <span class="forum-thread-date">${escapeHTML(reply.role || "Ciudadano")}</span>
              </div>
              <span class="forum-thread-date">${escapeHTML(formatDateTime(reply))}</span>
            </div>
            <p>${escapeHTML(reply.message).replace(/\n/g, "<br>")}</p>
          </article>
        `).join("")}
      </div>
    `;
  };

  const renderViewer = (thread) => {
    if (!thread) {
      threadViewer.classList.add("is-empty");
      threadViewer.innerHTML = `
        <div class="thread-viewer-empty">
          <strong>Selecciona una publicación</strong>
          <p>Aquí aparecerá el contenido completo con sus respuestas en una vista continua y ordenada.</p>
        </div>
      `;
      if (readerHint) readerHint.textContent = "Abre una publicación para leerla completa.";
      return;
    }

    const replies = getRepliesForThread(thread.id);
    const latestLabel = formatDateTime(replies.at(-1) || thread);

    threadViewer.classList.remove("is-empty");
    if (readerHint) readerHint.textContent = `Leyendo: ${thread.title}`;
    threadViewer.innerHTML = `
      <div class="thread-viewer-card thread-viewer-card--full">
        <div class="thread-viewer-top">
          <div>
            <span class="chip">${escapeHTML(thread.category)}</span>
            <h4>${escapeHTML(thread.title)}</h4>
          </div>
          <div class="thread-viewer-meta">
            <strong>${escapeHTML(thread.username)}</strong>
            <span>${escapeHTML(formatDateTime(thread))}</span>
          </div>
        </div>
        <p class="thread-viewer-body">${escapeHTML(thread.message).replace(/\n/g, "<br>")}</p>
        <div class="thread-viewer-footer">
          <span class="forum-mini-stat">${replies.length} ${replies.length === 1 ? "comentario" : "comentarios"}</span>
          <span class="forum-mini-stat">Última actividad: ${escapeHTML(latestLabel)}</span>
          <span class="forum-mini-stat">Visible para la comunidad</span>
        </div>
        <section class="thread-inline-section">
          <div class="forum-section-title-row forum-section-title-row--inner thread-inline-head">
            <div>
              <div class="badge">CONVERSACIÓN</div>
              <h3 class="community-subtitle">COMENTARIOS</h3>
            </div>
            <span class="forum-results-pill">${replies.length} ${replies.length === 1 ? "comentario" : "comentarios"}</span>
          </div>
          ${buildRepliesMarkup(thread.id)}
        </section>
      </div>
    `;
  };

  const openThread = (threadId) => {
    const thread = getThreadById(threadId);
    if (!thread) return;
    selectedThreadId = thread.id;
    updateHashForThread(thread.id);
    renderPosts();
    renderViewer(thread);
    toggleReader(true);
  };

  const createPostCard = (thread) => {
    const replies = getRepliesForThread(thread.id);
    const latestItem = replies.at(-1) || thread;
    const article = document.createElement("article");
    article.className = "community-post-clean";
    if (thread.id === selectedThreadId) article.classList.add("is-selected");

    article.innerHTML = `
      <button type="button" class="community-post-clean-button" aria-label="Abrir publicación ${escapeHTML(thread.title)}">
        <div class="community-post-clean-top">
          <span class="chip">${escapeHTML(thread.category)}</span>
          <span class="forum-thread-date">${escapeHTML(formatRelativeHours(latestItem))}</span>
        </div>
        <div class="community-post-clean-content">
          <div class="community-post-clean-thumb" aria-hidden="true"></div>
          <div class="community-post-clean-copy">
            <h4>${escapeHTML(thread.title)}</h4>
            <p>${escapeHTML(buildExcerpt(thread.message, 170))}</p>
            <div class="community-post-clean-meta">
              <span>por ${escapeHTML(thread.username)}</span>
              <span>${replies.length} ${replies.length === 1 ? "comentario" : "comentarios"}</span>
              <span>${escapeHTML(formatDate(thread))}</span>
            </div>
          </div>
        </div>
      </button>
    `;

    article.querySelector(".community-post-clean-button")?.addEventListener("click", () => openThread(thread.id));
    return article;
  };

  const renderFeatured = (threads) => {
    if (!featuredContainer) return;
    const ranked = [...threads]
      .map((thread) => ({ thread, replies: getRepliesForThread(thread.id).length, latestActivity: getLatestActivitySeconds(thread) }))
      .sort((a, b) => (b.replies - a.replies) || (b.latestActivity - a.latestActivity))
      .slice(0, 3);

    if (!ranked.length) {
      featuredContainer.innerHTML = `<div class="thread-viewer-empty compact"><strong>Sin publicaciones todavía</strong><p>Los destacados aparecerán cuando la comunidad tenga movimiento.</p></div>`;
      return;
    }

    featuredContainer.innerHTML = ranked.map(({ thread }, index) => `
      <article class="community-feature-card tone-${["lavender","yellow","mint"][index % 3] || "lavender"}">
        <div class="community-feature-card-inner">
          <span class="chip">${escapeHTML(thread.category)} destacada</span>
          <h3>${escapeHTML(thread.title)}</h3>
          <p>${escapeHTML(buildExcerpt(thread.message, 120))}</p>
          <div class="community-feature-card-meta">
            <span>por ${escapeHTML(thread.username)}</span>
            <button type="button" class="community-inline-link" data-open-thread="${escapeHTML(thread.id)}">Abrir</button>
          </div>
        </div>
      </article>
    `).join("");

    featuredContainer.querySelectorAll("[data-open-thread]").forEach((button) => {
      button.addEventListener("click", () => openThread(button.dataset.openThread));
    });
  };

  const renderCategoryCards = (threads) => {
    if (!categoryCards) return;
    const counts = Object.fromEntries(categories.map((name) => [name, 0]));
    threads.forEach((thread) => {
      if (counts[thread.category] !== undefined) counts[thread.category] += 1;
    });

    categoryCards.innerHTML = categories.map((name, index) => `
      <button type="button" class="community-category-card tone-${["lavender","cream","mint","rose","yellow"][index]}" data-category-card="${name}">
        <div>
          <strong>${name}</strong>
          <span>${counts[name]} publicaciones</span>
        </div>
        <p>${categoryDescriptions[name]}</p>
        <span class="community-inline-link">Explorar</span>
      </button>
    `).join("");

    categoryCards.querySelectorAll("[data-category-card]").forEach((button) => {
      button.addEventListener("click", () => {
        filterCategory.value = button.dataset.categoryCard || "Todas";
        renderPosts();
        postsContainer.scrollIntoView({ behavior: "smooth", block: "start" });
      });
    });
  };

  const renderActivity = (threads) => {
    if (!activityList) return;
    const items = [
      ...threads.map((thread) => ({
        type: "post",
        title: thread.title,
        category: thread.category,
        user: thread.username,
        createdAt: thread.createdAt
      })),
      ...allReplies.map((reply) => {
        const parent = getThreadById(reply.threadId);
        return {
          type: "reply",
          title: parent?.title || "publicación",
          category: parent?.category || "Comunidad",
          user: reply.username,
          createdAt: reply.createdAt
        };
      })
    ].sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0)).slice(0, 6);

    if (!items.length) {
      activityList.innerHTML = `<div class="thread-viewer-empty compact"><strong>Sin actividad todavía</strong><p>La actividad reciente aparecerá aquí en cuanto haya publicaciones o comentarios.</p></div>`;
      return;
    }

    activityList.innerHTML = items.map((item) => `
      <article class="community-activity-item">
        <div class="community-activity-dot" aria-hidden="true"></div>
        <div>
          <strong>${escapeHTML(item.user)}</strong>
          <p>${item.type === "post" ? "publicó" : "comentó en"} <span>${escapeHTML(item.title)}</span></p>
          <small>${escapeHTML(item.category)} · ${escapeHTML(formatRelativeHours(item))}</small>
        </div>
      </article>
    `).join("");
  };

  const updateMetrics = (threads) => {
    const authorCount = new Set(threads.map((thread) => thread.username).filter(Boolean)).size;
    const categoryCounts = threads.reduce((acc, thread) => {
      const key = thread.category || "-";
      acc[key] = (acc[key] || 0) + 1;
      return acc;
    }, {});

    const topCategory = Object.entries(categoryCounts).sort((a, b) => b[1] - a[1])[0]?.[0] || "-";
    metricThreads.textContent = threads.length;
    metricAuthors.textContent = authorCount;
    metricReplies.textContent = allReplies.length;
    metricCategory.textContent = topCategory;
  };

  const sortThreads = (threads) => {
    const clone = [...threads];
    if (currentSort === "title") {
      clone.sort((a, b) => a.title.localeCompare(b.title, "es", { sensitivity: "base" }));
    } else if (currentSort === "author") {
      clone.sort((a, b) => a.username.localeCompare(b.username, "es", { sensitivity: "base" }));
    } else {
      clone.sort((a, b) => getLatestActivitySeconds(b) - getLatestActivitySeconds(a));
    }
    return clone;
  };

  const renderPosts = () => {
    if (loadingThreads || loadingReplies) {
      postsContainer.innerHTML = `<div class="notice show forum-empty-state">Cargando comunidad...</div>`;
      resultsCount.textContent = "Cargando...";
      return;
    }

    const text = searchInput.value.trim().toLowerCase();
    const category = filterCategory.value;

    filteredThreads = allThreads.filter((thread) => {
      const username = (thread.username || "").toLowerCase();
      const title = (thread.title || "").toLowerCase();
      const message = (thread.message || "").toLowerCase();
      const repliesText = getRepliesForThread(thread.id)
        .map((reply) => `${reply.username} ${reply.message} ${reply.role}`.toLowerCase())
        .join(" ");

      const matchesText = username.includes(text) || title.includes(text) || message.includes(text) || repliesText.includes(text);
      const matchesCategory = category === "Todas" || thread.category === category;
      return matchesText && matchesCategory;
    });

    filteredThreads = sortThreads(filteredThreads);
    postsContainer.innerHTML = "";
    resultsCount.textContent = `${filteredThreads.length} ${filteredThreads.length === 1 ? "publicación" : "publicaciones"}`;
    syncQuickCategoryButtons();

    renderFeatured(allThreads);
    renderCategoryCards(allThreads);
    renderActivity(filteredThreads.length ? filteredThreads : allThreads);

    if (!filteredThreads.length) {
      postsContainer.innerHTML = `<div class="notice show forum-empty-state">No se encontraron publicaciones con esos filtros.</div>`;
      renderViewer(null);
      toggleReader(false);
      return;
    }

    if (!filteredThreads.some((thread) => thread.id === selectedThreadId)) {
      const requestedHash = window.location.hash.startsWith("#thread=")
        ? decodeURIComponent(window.location.hash.replace("#thread=", ""))
        : null;
      selectedThreadId = filteredThreads.find((thread) => thread.id === requestedHash)?.id || filteredThreads[0].id;
    }

    filteredThreads.forEach((thread) => postsContainer.appendChild(createPostCard(thread)));

    const selectedThread = filteredThreads.find((thread) => thread.id === selectedThreadId) || filteredThreads[0];
    selectedThreadId = selectedThread?.id || null;
    if (selectedThreadId) updateHashForThread(selectedThreadId);
    renderViewer(selectedThread);
  };

  const normalizeThread = (doc, source = "threads") => {
    const data = doc.data();
    return {
      id: source === "legacy" ? `legacy-${doc.id}` : doc.id,
      username: data.username || "Anónimo",
      category: data.category || "General",
      title: data.title || "Sin título",
      message: data.message || "",
      date: data.date || "Sin fecha",
      createdAt: data.createdAt,
      source
    };
  };

  const threadsQuery = query(collection(db, "threads"), orderBy("createdAt", "desc"));
  const legacyPostsQuery = query(collection(db, "publicaciones"), orderBy("createdAt", "desc"));
  const repliesQuery = query(collection(db, "replies"), orderBy("createdAt", "asc"));

  onSnapshot(threadsQuery, (snapshot) => {
    const liveThreads = snapshot.docs.map((doc) => normalizeThread(doc, "threads"));
    allThreads = [...liveThreads, ...allThreads.filter((item) => item.source === "legacy")];
    loadingThreads = false;
    setConnectionLabel("Firebase conectado", "connected");
    updateMetrics(allThreads);
    renderPosts();
  }, (error) => {
    console.error("Error al leer temas:", error);
    loadingThreads = false;
    setConnectionLabel("Error de conexión con Firebase", "error");
    showToast("No se pudieron cargar las publicaciones.");
    renderPosts();
  });

  onSnapshot(legacyPostsQuery, (snapshot) => {
    const legacyThreads = snapshot.docs.map((doc) => normalizeThread(doc, "legacy"));
    allThreads = [...allThreads.filter((item) => item.source !== "legacy"), ...legacyThreads];
    updateMetrics(allThreads);
    renderPosts();
  }, (error) => {
    console.error("Error al leer publicaciones heredadas:", error);
  });

  onSnapshot(repliesQuery, (snapshot) => {
    allReplies = snapshot.docs.map((doc) => {
      const data = doc.data();
      return {
        id: doc.id,
        threadId: data.threadId || "",
        username: data.username || "Anónimo",
        role: data.role || "Ciudadano",
        message: data.message || "",
        date: data.date || "Sin fecha",
        createdAt: data.createdAt
      };
    });

    loadingReplies = false;
    updateMetrics(allThreads);
    renderPosts();
  }, (error) => {
    console.error("Error al leer respuestas:", error);
    loadingReplies = false;
    setConnectionLabel("Error al leer comentarios", "error");
    showToast("No se pudieron cargar los comentarios.");
    renderPosts();
  });

  form.addEventListener("submit", async (event) => {
    event.preventDefault();

    const newThread = {
      username: form.username.value.trim(),
      category: form.category.value,
      title: form.title.value.trim(),
      message: form.message.value.trim(),
      date: new Date().toLocaleDateString("es-MX", {
        day: "2-digit",
        month: "long",
        year: "numeric"
      }),
      createdAt: serverTimestamp()
    };

    if (!newThread.username || !newThread.category || !newThread.title || !newThread.message) {
      showToast("Completa todos los campos de la publicación.");
      return;
    }

    try {
      saveDraftIdentity();
      if (threadSubmitButton) {
        threadSubmitButton.disabled = true;
        threadSubmitButton.textContent = "PUBLICANDO...";
      }
      await addDoc(collection(db, "threads"), newThread);
      form.reset();
      hydrateIdentity();
      toggleComposer(false);
      showToast("Tu publicación fue compartida con la comunidad.");
      postsContainer.scrollIntoView({ behavior: "smooth", block: "start" });
    } catch (error) {
      console.error("Error al guardar tema:", error);
      showToast("No se pudo guardar la publicación. Revisa Firestore y las reglas.");
    } finally {
      if (threadSubmitButton) {
        threadSubmitButton.disabled = false;
        threadSubmitButton.textContent = "PUBLICAR";
      }
    }
  });

  replyForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    const activeThread = getThreadById(selectedThreadId);
    if (!activeThread || activeThread.source === "legacy") {
      showToast("Selecciona una publicación nueva de la comunidad para comentar.");
      return;
    }

    const replyData = {
      threadId: activeThread.id,
      username: replyForm.replyUsername.value.trim(),
      role: replyForm.replyTag.value,
      message: replyForm.replyMessage.value.trim(),
      date: new Date().toLocaleDateString("es-MX", {
        day: "2-digit",
        month: "long",
        year: "numeric"
      }),
      createdAt: serverTimestamp()
    };

    if (!replyData.username || !replyData.message) {
      showToast("Completa tu nombre y tu comentario.");
      return;
    }

    try {
      saveDraftIdentity();
      if (replySubmitButton) {
        replySubmitButton.disabled = true;
        replySubmitButton.textContent = "ENVIANDO...";
      }
      await addDoc(collection(db, "replies"), replyData);
      replyForm.replyMessage.value = "";
      toggleReply(false);
      showToast("Tu comentario fue añadido a la publicación.");
    } catch (error) {
      console.error("Error al guardar respuesta:", error);
      showToast("No se pudo guardar el comentario. Revisa Firestore y las reglas.");
    } finally {
      if (replySubmitButton) {
        replySubmitButton.disabled = false;
        replySubmitButton.textContent = "RESPONDER";
      }
    }
  });

  searchInput.addEventListener("input", renderPosts);
  filterCategory.addEventListener("change", renderPosts);
  form.username?.addEventListener("input", saveDraftIdentity);
  replyForm.replyUsername?.addEventListener("input", saveDraftIdentity);
  replyForm.replyTag?.addEventListener("change", saveDraftIdentity);

  quickCategoryButtons.forEach((button) => {
    button.addEventListener("click", () => {
      filterCategory.value = button.dataset.quickCategory || "Todas";
      renderPosts();
    });
  });

  if (clearPostsBtn) {
    clearPostsBtn.addEventListener("click", () => {
      form.reset();
      hydrateIdentity();
      showToast("Formulario reiniciado.");
    });
  }

  [openComposerBtn, openComposerBtnCenter]
    .filter(Boolean)
    .forEach((trigger) => trigger.addEventListener("click", () => toggleComposer(true)));

  if (closeComposerBtn) {
    closeComposerBtn.addEventListener("click", () => toggleComposer(false));
  }

  if (composerModal) {
    composerModal.addEventListener("click", (event) => {
      const target = event.target;
      if (target instanceof HTMLElement && target.dataset.closeComposer === "true") {
        toggleComposer(false);
      }
    });
  }

  if (readerModal) {
    readerModal.addEventListener("click", (event) => {
      const target = event.target;
      if (target instanceof HTMLElement && target.dataset.closeReader === "true") {
        toggleReader(false);
      }
    });
  }

  if (replyModal) {
    replyModal.addEventListener("click", (event) => {
      const target = event.target;
      if (target instanceof HTMLElement && target.dataset.closeReply === "true") {
        toggleReply(false);
      }
    });
  }

  document.addEventListener("keydown", (event) => {
    if (event.key !== "Escape") return;
    if (replyModal?.getAttribute("aria-hidden") === "false") {
      toggleReply(false);
      return;
    }
    if (readerModal?.getAttribute("aria-hidden") === "false") {
      toggleReader(false);
      return;
    }
    if (composerModal?.getAttribute("aria-hidden") === "false") {
      toggleComposer(false);
    }
  });

  if (closeReaderBtn) {
    closeReaderBtn.addEventListener("click", () => toggleReader(false));
  }

  if (closeReplyBtn) {
    closeReplyBtn.addEventListener("click", () => toggleReply(false));
  }

  if (openReplyModalBtn) {
    openReplyModalBtn.addEventListener("click", () => {
      const activeThread = getThreadById(selectedThreadId);
      if (!activeThread || activeThread.source === "legacy") {
        showToast("Selecciona una publicación nueva de la comunidad para comentar.");
        return;
      }
      toggleReply(true);
    });
  }

  sortButtons.forEach((button) => {
    button.addEventListener("click", () => {
      sortButtons.forEach((item) => item.classList.remove("is-active"));
      button.classList.add("is-active");
      currentSort = button.dataset.sort || "recent";
      renderPosts();
    });
  });
});
