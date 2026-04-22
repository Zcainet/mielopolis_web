
if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker
      .register("./service-worker.js")
      .catch((error) => console.error("Error al registrar Service Worker:", error));
  });
}

document.addEventListener('DOMContentLoaded', () => {
  const current = window.location.pathname.split('/').pop() || 'index.html';
  const modal = document.querySelector('#modal');
  const modalTitle = document.querySelector('#modalTitle');
  const modalText = document.querySelector('#modalText');
  const closeModalBtn = document.querySelector('#closeModal');
  const topbar = document.querySelector('.topbar');
  const pageShell = document.querySelector('.page-shell');
  const menuLinks = document.querySelectorAll('.menu a');
  const isStandalone = window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true;

  document.body.setAttribute('data-page', current.replace('.html', '') || 'index');

  if (isStandalone) {
    document.documentElement.classList.add('is-standalone');
    document.body.classList.add('is-standalone');
  }

  function syncHeaderHeight() {
    if (!topbar || !pageShell) return;
    const extraSpace = document.body.classList.contains('is-standalone') ? 24 : 18;
    const height = Math.ceil(topbar.getBoundingClientRect().height + extraSpace);
    document.documentElement.style.setProperty('--header-h', `${height}px`);
  }

  if (topbar) {
    let lastScrollY = window.scrollY;
    let idleTimer = null;
    let ticking = false;
    const revealHeader = () => topbar.classList.remove('is-hidden');
    const hideHeader = () => topbar.classList.add('is-hidden');

    const updateHeaderState = () => {
      const currentScrollY = Math.max(window.scrollY, 0);
      const delta = currentScrollY - lastScrollY;
      const scrollingDown = delta > 8;
      const scrollingUp = delta < -6;
      const desktopMode = window.innerWidth > 980;
      const shouldPinHeader = desktopMode || currentScrollY <= 24;

      topbar.classList.toggle('is-scrolled', currentScrollY > 18);
      topbar.classList.remove('is-idle');

      if (shouldPinHeader) {
        revealHeader();
      } else if (!desktopMode && scrollingDown) {
        hideHeader();
      } else if (scrollingUp || desktopMode) {
        revealHeader();
      }

      window.clearTimeout(idleTimer);
      idleTimer = window.setTimeout(() => {
        topbar.classList.add('is-idle');
        revealHeader();
      }, 180);

      lastScrollY = currentScrollY;
      ticking = false;
    };

    const onScroll = () => {
      if (!ticking) {
        window.requestAnimationFrame(updateHeaderState);
        ticking = true;
      }
    };

    syncHeaderHeight();
    updateHeaderState();
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', () => {
      syncHeaderHeight();
      updateHeaderState();
    });
    window.addEventListener('load', syncHeaderHeight);
    document.addEventListener('visibilitychange', () => {
      if (!document.hidden) {
        revealHeader();
        syncHeaderHeight();
      }
    });
  }

  menuLinks.forEach(link => {
    const href = link.getAttribute('href');
    if (href === current) {
      link.classList.add('active');
    }
  });

  function openModal(title, text) {
    if (!modal || !modalTitle || !modalText) return;
    modalTitle.textContent = title;
    modalText.textContent = text;
    modal.classList.add('show');
    modal.setAttribute('aria-hidden', 'false');
    document.documentElement.classList.add('no-scroll');
    document.body.classList.add('no-scroll');
  }

  function closeModal() {
    if (!modal) return;
    modal.classList.remove('show');
    modal.setAttribute('aria-hidden', 'true');
    document.documentElement.classList.remove('no-scroll');
    document.body.classList.remove('no-scroll');
  }

  if (closeModalBtn) closeModalBtn.addEventListener('click', closeModal);
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && modal && modal.classList.contains('show')) closeModal();
    if (e.key === 'Escape' && characterModal && characterModal.getAttribute('aria-hidden') === 'false') closeCharacterModal();
  });
  if (modal) {
    modal.addEventListener('click', (e) => {
      if (e.target === modal) closeModal();
    });
  }

  document.querySelectorAll('[data-action]').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      const action = btn.dataset.action;
      const content = {
        demo: {
          title: 'Demo aún en desarrollo',
          text: 'Aquí puedes conectar más adelante la descarga de la demo, una página de Itch.io o el enlace a Steam. La base ya está lista para que Mielópolis tenga un punto real de acceso.'
        },
        trailer: {
          title: 'Tráiler del proyecto',
          text: 'Aquí puedes incrustar el video oficial del juego. Puede abrir con el pasado amoroso del reino, mostrar la enfermedad de la Reina y terminar con la sonrisa oscura de Sr. Sonrisas.'
        },
        newsletter: {
          title: 'Registro de comunidad',
          text: 'Puedes cambiar este cuadro por un formulario real para captar correos y compartir avances del proyecto con tu comunidad.'
        },
        ministerio: {
          title: 'Mensaje del estudio',
          text: 'CROW STUDIOS trabaja bajo el principio “Tu visión, nuestra tecnología”, integrando creatividad, organización y herramientas digitales para desarrollar propuestas con identidad visual, estructura clara y enfoque profesional.'
        }
      };
      if (content[action]) openModal(content[action].title, content[action].text);
    });
  });



  const characterEntries = {
    blue: { title: 'BLUE', badge: 'JUGABLE', role: 'Ruta ofensiva', image: 'img/personajes/blue.png', imageAlt: 'Blue, personaje jugable de Mielópolis', lead: 'Blue representa una forma directa de entrar al conflicto del reino. Su presencia convierte la exploración en avance, choque y respuesta frente al caos.', profile: 'Es una de las figuras elegibles por la persona jugadora. Su recorrido sirve para descubrir cómo se sostiene Mielópolis cuando la apariencia tierna empieza a romperse desde dentro.', presence: 'Dentro del mundo funciona como una ruta clara de combate y empuje. Su lectura del reino es más frontal, más decidida y más enfocada en atravesar la amenaza.', tone: 'Su energía transmite impulso, confrontación y avance. En pantalla debe sentirse como alguien que entra a un lugar roto y decide seguir adelante a pesar de lo que ve.' },
    rose: { title: 'ROSE', badge: 'JUGABLE', role: 'Ruta adaptable', image: 'img/personajes/rose.png', imageAlt: 'Rose, personaje jugable de Mielópolis', lead: 'Rose ofrece otra sensibilidad para recorrer el mismo universo. Su presencia ayuda a que el mundo se sienta menos uniforme y más interpretado desde distintas perspectivas.', profile: 'Es otra de las opciones principales del juego. Su ruta sugiere una manera distinta de vivir el reino alterado, con una mezcla de lectura emocional, adaptación y recorrido cuidadoso.', presence: 'En el universo del proyecto aporta contraste frente a otras rutas jugables. Hace que la experiencia no sea solo combatir, sino también percibir el tono del mundo y cómo responde a cada mirada.', tone: 'Su ficha debe comunicar elegancia, contraste y percepción. Con ella, Mielópolis se siente como un lugar que todavía guarda belleza incluso cuando ya está contaminado por el peligro.' },
    buble: { title: 'BUBLE', badge: 'JUGABLE', role: 'Ruta de descubrimiento', image: 'img/personajes/buble.png', imageAlt: 'Buble, personaje jugable de Mielópolis', lead: 'Buble aporta una lectura ligada al descubrimiento y al lore. Su ruta ayuda a que el reino no solo se recorra, sino que también se entienda.', profile: 'Es el tercer personaje jugable y una pieza valiosa para mostrar que cada elección cambia la sensación del viaje. Su presencia refuerza la idea de que el mundo puede explorarse desde matices distintos.', presence: 'Dentro de la estructura del proyecto ayuda a abrir preguntas sobre el origen del conflicto, la caída del reino y aquello que todavía queda por descubrir entre su apariencia adorable y su fondo oscuro.', tone: 'Con Buble el tono debe sentirse curioso, sensible y atento a los detalles. Su energía no niega el peligro, pero lo atraviesa con una mirada más observadora.' },
    sonrisas: { title: 'SR. SONRISAS', badge: 'ANTAGONISTA', role: 'Origen de la fractura', image: 'img/personajes/sonrisas.png', imageAlt: 'Sr. Sonrisas, antagonista de Mielópolis', lead: 'Sr. Sonrisas es la figura que convierte la idea de protección en una deformación del reino. Su presencia une lo tierno con lo siniestro de la manera más peligrosa.', profile: 'Apareció como ayuda para la Reina cuando ella buscaba una forma de mantener a salvo a su pueblo. Tras su muerte, reveló sus verdaderas intenciones y empujó el proyecto hacia el desastre.', presence: 'Es el eje oscuro del universo. Su influencia se siente en el tono del juego, en los enemigos, en la propaganda del reino y en la sensación de que la felicidad dejó de ser natural para volverse obligatoria.', tone: 'Narrativamente debe sentirse encantador e inquietante al mismo tiempo. No destruye el mundo desde afuera: lo tuerce desde dentro hasta que la belleza se convierte en máscara.' }
  };
  const characterModal = document.querySelector('#characterModal');
  const characterImage = document.querySelector('#characterModalImage');
  const characterBadge = document.querySelector('#characterModalBadge');
  const characterRole = document.querySelector('#characterModalRole');
  const characterTitle = document.querySelector('#characterModalTitle');
  const characterLead = document.querySelector('#characterModalLead');
  const characterProfile = document.querySelector('#characterModalProfile');
  const characterPresence = document.querySelector('#characterModalPresence');
  const characterTone = document.querySelector('#characterModalTone');
  const openCharacterModal = (key) => {
    const entry = characterEntries[key];
    if (!entry || !characterModal) return;
    if (characterImage) { characterImage.src = entry.image; characterImage.alt = entry.imageAlt; }
    if (characterBadge) characterBadge.textContent = entry.badge;
    if (characterRole) characterRole.textContent = entry.role;
    if (characterTitle) characterTitle.textContent = entry.title;
    if (characterLead) characterLead.textContent = entry.lead;
    if (characterProfile) characterProfile.textContent = entry.profile;
    if (characterPresence) characterPresence.textContent = entry.presence;
    if (characterTone) characterTone.textContent = entry.tone;
    characterModal.setAttribute('aria-hidden', 'false');
    document.body.classList.add('modal-open');
    document.documentElement.classList.add('modal-open');
  };
  const closeCharacterModal = () => {
    if (!characterModal) return;
    characterModal.setAttribute('aria-hidden', 'true');
    document.body.classList.remove('modal-open');
    document.documentElement.classList.remove('modal-open');
  };
  document.querySelectorAll('[data-character-open]').forEach((button) => {
    button.addEventListener('click', () => openCharacterModal(button.dataset.characterOpen));
  });
  document.querySelectorAll('[data-character-close]').forEach((button) => {
    button.addEventListener('click', closeCharacterModal);
  });

  const rotating = document.querySelector('[data-rotate-slogan]');
  if (rotating) {
    const messages = [
      'LA FELICIDAD ES OBLIGATORIA',
      'AQUÍ TODO COMENZÓ CON AMOR',
      'LA REINA QUISO PROTEGERLOS',
      'EL REINO SIGUE SONRIENDO'
    ];
    let index = 0;
    setInterval(() => {
      index = (index + 1) % messages.length;
      rotating.textContent = messages[index];
      rotating.dataset.text = messages[index];
    }, 2600);
  }

  const timelineButtons = document.querySelectorAll('[data-timeline]');
  const timelinePanel = document.querySelector('#timelinePanel');
  if (timelineButtons.length && timelinePanel) {
    const entries = {
      origen: {
        title: 'EL REINO ANTES DE TODO',
        items: [
          'Mielópolis era un lugar realmente hermoso, tierno y lleno de amor por todas partes.',
          'Dulces, abrazos, colores suaves y sonrisas formaban parte de la vida cotidiana del reino.',
          'La felicidad no era una obligación ni una mentira: era la forma natural del mundo.'
        ]
      },
      caida: {
        title: 'LA ENFERMEDAD DE LA REINA',
        items: [
          'La Reina cayó enferma y supo que iba a morir sin dejar sucesor.',
          'Al no tener a nadie que pudiera cuidar de su pueblo, decidió crear un proyecto de protección.',
          'Para lograrlo aceptó la ayuda del misterioso Sr. Sonrisas.'
        ]
      },
      crisis: {
        title: 'LA MUERTE Y EL VACÍO',
        items: [
          'La Reina falleció antes de terminar el proyecto que debía mantener seguro al reino.',
          'El sistema quedó incompleto, abierto y sin la guía de quien lo había creado.',
          'Ese instante le permitió a Sr. Sonrisas mostrar sus verdaderas intenciones.'
        ]
      },
      futuro: {
        title: 'EL CAOS ACTUAL',
        items: [
          'Sr. Sonrisas modificó el proyecto y convirtió sus funciones en monstruos y abominaciones.',
          'El reino siguió pareciendo adorable, pero ahora estaba lleno de peligro, grietas y dolor.',
          'El protagonista recibe armas para enfrentarlo todo, como si incluso la resistencia formara parte del juego del antagonista.'
        ]
      }
    };

    const renderTimeline = (key) => {
      const entry = entries[key];
      if (!entry) return;
      timelineButtons.forEach(btn => btn.classList.toggle('active', btn.dataset.timeline === key));
      timelinePanel.innerHTML = `
        <h3>${entry.title}</h3>
        <ul>${entry.items.map(item => `<li>${item}</li>`).join('')}</ul>
      `;
    };

    timelineButtons.forEach(btn => btn.addEventListener('click', () => renderTimeline(btn.dataset.timeline)));
    renderTimeline('origen');
  }

  const wikiInput = document.querySelector('#wikiSearch') || document.querySelector('#wikiSearchInput');
  const wikiButton = document.querySelector('#wikiSearchButton') || document.querySelector('#wikiSearchBtn');
  const wikiItems = document.querySelectorAll('.wiki-item');
  const wikiNotice = document.querySelector('#wikiNotice');
  const wikiPills = document.querySelectorAll('.wiki-pill');

  const filterWiki = (query) => {
    const q = query.trim().toLowerCase();
    let visible = 0;
    wikiItems.forEach(item => {
      const content = item.textContent.toLowerCase();
      const match = !q || content.includes(q);
      item.classList.toggle('hidden', !match);
      if (match) visible += 1;
    });

    if (wikiNotice) {
      wikiNotice.classList.add('show');
      wikiNotice.textContent = q
        ? visible
          ? `Se encontraron ${visible} entrada(s) relacionadas con "${query}".`
          : `No hay coincidencias con "${query}". Intenta con términos como Reina, Sonrisas, Blue, Rose, Buble, monstruos o comunidad.`
        : 'La wiki muestra todas las entradas disponibles.';
    }
  };

  if (wikiButton && wikiInput) {
    wikiButton.addEventListener('click', (e) => {
      e.preventDefault();
      filterWiki(wikiInput.value);
    });

    wikiInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        filterWiki(wikiInput.value);
      }
    });
  }

  wikiPills.forEach(pill => {
    pill.addEventListener('click', (e) => {
      e.preventDefault();
      const value = pill.dataset.filter || '';
      if (wikiInput) wikiInput.value = value;
      filterWiki(value);
    });
  });

  const terminalLog = document.querySelector('#terminalLog');
  const terminalButtons = document.querySelectorAll('[data-terminal]');
  if (terminalLog && terminalButtons.length) {
    const logs = {
      status: [
        '[REGISTRO] Estado original del reino: AMOROSO / ESTABLE',
        '[CAMBIO] Fallecimiento de la Reina detectado. Proyecto incompleto.',
        '[ANOMALÍA] Sonrisa no identificada operando dentro del sistema.'
      ],
      creatures: [
        '[ARCHIVO] Las entidades actuales provienen de la corrupción del proyecto de la Reina.',
        '[RIESGO] Las abominaciones conservan rastros de su propósito original.',
        '[NOTA] Algunas intentan acercarse como si todavía quisieran cuidar a alguien.'
      ],
      leaks: [
        '[FILTRACIÓN] Sr. Sonrisas no aparece con origen verificable en los registros.',
        '[FILTRACIÓN] El antagonista entregó las armas al protagonista.',
        '[ECO] "No quiero destruir su amor. Solo quiero verlo arder bonito."'
      ]
    };

    const renderLog = (key) => {
      const lines = logs[key] || [];
      terminalLog.innerHTML = lines.map(line => `<p>${line}</p>`).join('');
    };

    terminalButtons.forEach(btn => btn.addEventListener('click', () => renderLog(btn.dataset.terminal)));
    renderLog('status');
  }
});
