/* ================================================================
   SKY CATHEDRAL — INTERACTION LAYER
   Vanilla JS. Без библиотек. Каждая анимация — медленная,
   спокойная, кинематографичная. JS только переключает состояния —
   вся визуальная механика уже описана в SkyCharter.css.
   ================================================================ */

(() => {
  'use strict';

  /* ------------------------------------------------------------
     0. NO-JS → JS
     Как только скрипт начал выполняться, страница больше не
     находится в состоянии "без JavaScript". Снимаем класс первым
     действием — до этого момента .no-js держит весь reveal-контент
     видимым (аварийный откат), после — CSS переводит его в
     скрытое стартовое состояние, из которого мы дальше раскрываем
     по сценарию ниже.
     ------------------------------------------------------------ */
  document.documentElement.classList.remove('no-js');

  const prefersReducedMotion = window.matchMedia(
    '(prefers-reduced-motion: reduce)'
  ).matches;

  /* ------------------------------------------------------------
     Небольшой помощник: requestAnimationFrame с фолбэком,
     используется точечно там, где нужен именно следующий кадр
     (например, чтобы браузер успел применить начальный стиль
     перед стартом transition).
     ------------------------------------------------------------ */
  const nextFrame = (fn) => requestAnimationFrame(() => requestAnimationFrame(fn));

  /* ================================================================
     1. PRELOADER
     Trigger:   загрузка документа (DOMContentLoaded) + минимальная
                выдержка, чтобы горизонт и метка (см. CSS keyframes
                horizonExpand / markFade) успели доиграть.
     Delay:     900ms после DOMContentLoaded.
     Duration:  1.1s (задано в CSS transition preloader).
     Purpose:   первое впечатление — не "загрузка", а раскрытие
                горизонта, прежде чем откроется небо hero-секции.
     ================================================================ */
  const preloader = document.getElementById('preloader');

  function hidePreloader() {
    if (!preloader) return;
    preloader.classList.add('is-hidden');
    preloader.setAttribute('aria-hidden', 'true');
    // Убираем из потока после завершения transition, чтобы
    // элемент не перехватывал клики/скролл, даже будучи прозрачным.
    window.setTimeout(() => {
      preloader.style.display = 'none';
    }, 1200);
    startHeroReveal();
  }

  function initPreloader() {
    if (!preloader) {
      startHeroReveal();
      return;
    }
    const minimumHold = prefersReducedMotion ? 0 : 900;
    window.setTimeout(hidePreloader, minimumHold);
  }

  /* ================================================================
     2. NAVIGATION
     ================================================================ */

  /* --- 2.1 Scrolled state ---------------------------------------
     Trigger:  scroll (пассивный листенер, троттлинг через rAF-флаг)
     Duration: 0.9s (var(--dur-medium), задано в CSS)
     Purpose:  переход от прозрачной шапки над hero к стеклянной
                панели, как только под ней появляется контент.
  ------------------------------------------------------------------ */
  const nav = document.getElementById('nav');
  let navScrollTicking = false;

  function updateNavScrolled() {
    if (!nav) return;
    nav.classList.toggle('is-scrolled', window.scrollY > 24);
    navScrollTicking = false;
  }

  function onScrollForNav() {
    if (navScrollTicking) return;
    navScrollTicking = true;
    requestAnimationFrame(updateNavScrolled);
  }

  /* --- 2.2 Mobile burger menu -------------------------------------
     Trigger:  клик по бургеру / клавиша Escape / клик по пункту меню
     Duration: 0.9s (var(--dur-medium), CSS transition mobile-menu)
     Purpose:  полноэкранное меню поверх атмосферы, а не выпадающий
                список — сохраняет ощущение пространства даже на
                мобильном экране.
  ------------------------------------------------------------------ */
  const navBurger = document.getElementById('navBurger');
  const mobileMenu = document.getElementById('mobileMenu');

  function setMobileMenuOpen(isOpen) {
    if (!navBurger || !mobileMenu) return;
    navBurger.setAttribute('aria-expanded', String(isOpen));
    navBurger.classList.toggle('is-active', isOpen);
    mobileMenu.classList.toggle('is-open', isOpen);
    mobileMenu.setAttribute('aria-hidden', String(!isOpen));
    document.body.style.overflow = isOpen ? 'hidden' : '';
  }

  function initMobileMenu() {
    if (!navBurger || !mobileMenu) return;

    navBurger.addEventListener('click', () => {
      const isOpen = mobileMenu.classList.contains('is-open');
      setMobileMenuOpen(!isOpen);
    });

    mobileMenu.querySelectorAll('a').forEach((link) => {
      link.addEventListener('click', () => setMobileMenuOpen(false));
    });

    document.addEventListener('keydown', (event) => {
      if (event.key === 'Escape' && mobileMenu.classList.contains('is-open')) {
        setMobileMenuOpen(false);
        navBurger.focus();
      }
    });
  }

  /* ================================================================
     3. HERO — ATMOSPHERIC REVEAL
     Trigger:   вызывается из hidePreloader() — то есть ровно в
                момент, когда горизонт preloader'а гаснет.
     Delay:     построчный, с шагом 180ms между строками — так
                заголовок проступает слово за словом, а не разом.
     Duration:  1.4s на строку (var атмосферная кривая, CSS keyframes
                atmosphericReveal), 2.4s для силуэта самолёта
                (keyframes jetReveal).
     GPU:       анимируются только opacity / transform / filter —
                свойства, которые браузер компонует на GPU-слое без
                пересчёта layout.
     Purpose:   первый экран должен читаться как медленное появление
                архитектуры из тумана, а не как обычный fade-in.
     ================================================================ */
  let heroRevealed = false;

  function startHeroReveal() {
    if (heroRevealed) return;
    heroRevealed = true;

    const lines = document.querySelectorAll('.hero .reveal-line');
    lines.forEach((line, index) => {
      const delay = prefersReducedMotion ? 0 : index * 180;
      window.setTimeout(() => line.classList.add('is-revealed'), delay);
    });

    const heroJet = document.getElementById('heroJet');
    if (heroJet) {
      const jetDelay = prefersReducedMotion ? 0 : 260;
      window.setTimeout(() => heroJet.classList.add('is-revealed'), jetDelay);
    }
  }

  /* ================================================================
     4. GENERIC REVEAL-ON-SCROLL
     Trigger:   IntersectionObserver, порог 14% видимости элемента.
     Delay:     0 — но элементы внутри одного грид-ряда (например
                philosophy__figures или experience__grid) получают
                небольшой каскадный delay через inline transition-delay,
                чтобы не вспыхивать одновременным блоком.
     Duration:  1.1s (CSS var(--ease-atmosphere), transition уже
                описан в .reveal-on-scroll).
     GPU:       opacity / transform / filter — то же, что и в hero.
     Purpose:   контент проступает по мере того, как пользователь
                поднимается по "воздушным" пролётам страницы —
                архитектурная метафора, не просто scroll-appear.
     ================================================================ */
  function initRevealOnScroll() {
    const targets = document.querySelectorAll('.reveal-on-scroll');
    if (!targets.length) return;

    if (prefersReducedMotion || !('IntersectionObserver' in window)) {
      targets.forEach((el) => el.classList.add('is-visible'));
      return;
    }

    // Каскад внутри общего родителя (грид фигур, карточки опыта и т.п.):
    // элементы, у которых есть "братья" с тем же классом в одном
    // контейнере, получают нарастающую задержку.
    const groups = new Map();
    targets.forEach((el) => {
      const parent = el.parentElement;
      if (!groups.has(parent)) groups.set(parent, []);
      groups.get(parent).push(el);
    });
    groups.forEach((siblings) => {
      siblings.forEach((el, i) => {
        if (siblings.length > 1) {
          el.style.transitionDelay = `${Math.min(i, 6) * 90}ms`;
        }
      });
    });

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('is-visible');
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.14, rootMargin: '0px 0px -6% 0px' }
    );

    targets.forEach((el) => observer.observe(el));
  }

  /* ================================================================
     5. PHILOSOPHY — WORD-BY-WORD LIGHT
     Trigger:   IntersectionObserver на .philosophy__statement (один
                раз, при входе в 40% видимости).
     Delay:     каскад 70ms на слово.
     Duration:  0.6s (var(--dur-fast)… нет — фактически задаётся CSS
                transition opacity 0.6s var(--ease-glass) в .reveal-word).
     Purpose:   утверждение "Время — самый дорогой актив" словно
                загорается слово за словом, как будто мысль
                формируется прямо на глазах, а не появляется целиком.
     ================================================================ */
  function initPhilosophyWords() {
    const statement = document.querySelector('.philosophy__statement');
    if (!statement) return;
    const words = statement.querySelectorAll('.reveal-word');
    if (!words.length) return;

    const lightUp = () => {
      words.forEach((word, index) => {
        const delay = prefersReducedMotion ? 0 : index * 70;
        window.setTimeout(() => word.classList.add('is-lit'), delay);
      });
    };

    if (prefersReducedMotion || !('IntersectionObserver' in window)) {
      lightUp();
      return;
    }

    const observer = new IntersectionObserver(
      (entries, obs) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            lightUp();
            obs.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.4 }
    );
    observer.observe(statement);
  }

  /* ================================================================
     6. PHILOSOPHY — FIGURE COUNTERS
     Trigger:   IntersectionObserver на каждый .figure (40% видимости).
     Duration:  1.6s на счётчик (var(--dur-slow)), easing — плавное
                замедление к концу (см. easeOutCubic ниже), чтобы
                цифра "подъезжала" к финальному значению, а не
                щёлкала линейно.
     GPU:       меняется только textContent — рассчитано так, чтобы
                не задевать layout соседних элементов (ширина числа
                зафиксирована шрифтом var(--font-display) tabular).
     Purpose:   "80 минут", "24 часа", "600 аэропортов" — цифры,
                которые сами достраиваются, усиливают ощущение точно
                просчитанного, инженерного продукта.
     ================================================================ */
  function animateCount(el, target, duration) {
    if (prefersReducedMotion || duration === 0) {
      el.textContent = String(target);
      return;
    }
    const start = performance.now();
    const easeOutCubic = (t) => 1 - Math.pow(1 - t, 3);

    function tick(now) {
      const elapsed = now - start;
      const progress = Math.min(elapsed / duration, 1);
      const eased = easeOutCubic(progress);
      el.textContent = String(Math.round(target * eased));
      if (progress < 1) {
        requestAnimationFrame(tick);
      } else {
        el.textContent = String(target);
      }
    }
    requestAnimationFrame(tick);
  }

  function initFigureCounters() {
    const figures = document.querySelectorAll('.figure__number[data-count]');
    if (!figures.length) return;

    const run = (el) => {
      const target = parseInt(el.getAttribute('data-count'), 10);
      if (Number.isNaN(target)) return;
      animateCount(el, target, prefersReducedMotion ? 0 : 1600);
    };

    if (!('IntersectionObserver' in window)) {
      figures.forEach(run);
      return;
    }

    const observer = new IntersectionObserver(
      (entries, obs) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            run(entry.target);
            obs.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.4 }
    );
    figures.forEach((el) => observer.observe(el));
  }

  /* ================================================================
     7. AIRCRAFT DETAIL — VIEW TOGGLE
     Trigger:   клик по .view-toggle (роль tab, data-view задаёт
                режим: exterior / interior / plan).
     Duration:  0.4s (var(--dur-fast)) на короткий "вдох" рамки —
                лёгкое затемнение и восстановление, сигнализирующее
                смену контекста, синхронно с кросс-фейдом медиа.
     Purpose:   в .aircraft-detail__frame лежат три .aircraft-detail__view
                (data-view-target="exterior|interior|plan") друг на
                друге; клик по вкладке снимает .is-active с текущего
                изображения и ставит его на изображение с совпадающим
                data-view-target — CSS-переход (opacity/visibility)
                делает саму смену кадра плавной.
     ================================================================ */
  function initAircraftViewToggle() {
    const toggles = document.querySelectorAll('.view-toggle');
    const frame = document.getElementById('aircraftFrame');
    const views = frame
      ? frame.querySelectorAll('.aircraft-detail__view')
      : [];
    if (!toggles.length) return;

    toggles.forEach((toggle) => {
      toggle.addEventListener('click', () => {
        if (toggle.classList.contains('is-active')) return;

        toggles.forEach((t) => {
          t.classList.remove('is-active');
          t.setAttribute('aria-selected', 'false');
        });
        toggle.classList.add('is-active');
        toggle.setAttribute('aria-selected', 'true');

        const targetView = toggle.getAttribute('data-view');
        views.forEach((view) => {
          view.classList.toggle(
            'is-active',
            view.getAttribute('data-view-target') === targetView
          );
        });

        if (frame && !prefersReducedMotion) {
          frame.style.transition = `opacity var(--dur-fast) var(--ease-glass), filter var(--dur-fast) var(--ease-glass)`;
          frame.style.opacity = '0.35';
          frame.style.filter = 'blur(3px)';
          window.setTimeout(() => {
            frame.style.opacity = '1';
            frame.style.filter = 'blur(0)';
          }, 220);
        }
      });
    });
  }

  /* ================================================================
     8. FLEET → "Открыть карточку самолёта"
     Trigger:   клик по .text-link[data-jet-link] в подвале галереи
                флота.
     Duration:  наследует html { scroll-behavior: smooth } из CSS.
     Purpose:   единственная детальная страница самолёта в разметке —
                #aircraft-detail; ссылка ведёт к ней плавным скроллом
                вместо перехода в никуда (href="#").
     ================================================================ */
  function initFleetFooterLink() {
    const link = document.querySelector('[data-jet-link]');
    const detail = document.getElementById('aircraft-detail');
    if (!link || !detail) return;

    link.addEventListener('click', (event) => {
      event.preventDefault();
      detail.scrollIntoView({
        behavior: prefersReducedMotion ? 'auto' : 'smooth',
        block: 'start',
      });
    });
  }

  /* ================================================================
     9. DESTINATIONS — INTERACTIVE GLOBE
     Trigger:   hover / focus / клик по .globe__label (data-route).
     Duration:  0.4s (var(--dur-fast), цвет и фон лейбла — уже в CSS);
                сама линия маршрута всегда "течёт" через бесконечный
                keyframes routeFlow — JS лишь усиливает активную.
     Purpose:   при взаимодействии с точкой на глобусе подсвечивается
                именно её маршрут (globe__route[data-route]), формируя
                ощущение, что весь земной шар — это карта уже открытых
                для пользователя направлений.
     ================================================================ */
  function initGlobe() {
    const labels = document.querySelectorAll('.globe__label[data-route]');
    if (!labels.length) return;

    const routesByKey = new Map();
    document.querySelectorAll('.globe__route[data-route]').forEach((route) => {
      routesByKey.set(route.getAttribute('data-route'), route);
    });

    function setActive(routeKey) {
      routesByKey.forEach((route) => route.classList.remove('is-active'));
      labels.forEach((label) => label.classList.remove('is-active'));
      if (!routeKey) return;
      const route = routesByKey.get(routeKey);
      if (route) route.classList.add('is-active');
      labels.forEach((label) => {
        if (label.getAttribute('data-route') === routeKey) {
          label.classList.add('is-active');
        }
      });
    }

    labels.forEach((label) => {
      const key = label.getAttribute('data-route');
      label.addEventListener('mouseenter', () => setActive(key));
      label.addEventListener('focus', () => setActive(key));
      label.addEventListener('mouseleave', () => setActive(null));
      label.addEventListener('blur', () => setActive(null));
      label.addEventListener('click', (event) => event.preventDefault());
    });
  }

  /* ================================================================
     10. STORIES — MINIMAL CAROUSEL
     Trigger:   клик по стрелкам #storyPrev / #storyNext, клик по
                точке в #storyDots, свайп на touch-устройствах.
     Duration:  0.9s (var(--dur-medium) — переход .story-slide уже
                описан в CSS transition opacity/transform).
     Purpose:   истории клиентов сменяются друг другом медленно и
                без резких смещений — карусель ощущается как смена
                кадра в фильме, а не листание ленты.
     ================================================================ */
  function initStoriesCarousel() {
    const carousel = document.getElementById('storiesCarousel');
    if (!carousel) return;

    const slides = Array.from(carousel.querySelectorAll('.story-slide'));
    const dotsContainer = document.getElementById('storyDots');
    const prevBtn = document.getElementById('storyPrev');
    const nextBtn = document.getElementById('storyNext');
    if (!slides.length) return;

    let current = Math.max(0, slides.findIndex((s) => s.classList.contains('is-active')));
    if (current === -1) current = 0;

    // Точки создаются динамически — в разметке контейнер пуст.
    const dots = slides.map((_, index) => {
      const dot = document.createElement('button');
      dot.type = 'button';
      dot.setAttribute('aria-label', `История ${index + 1} из ${slides.length}`);
      if (index === current) dot.classList.add('is-active');
      dot.addEventListener('click', () => goTo(index));
      dotsContainer && dotsContainer.appendChild(dot);
      return dot;
    });

    function goTo(index) {
      const nextIndex = (index + slides.length) % slides.length;
      if (nextIndex === current) return;
      slides[current].classList.remove('is-active');
      dots[current] && dots[current].classList.remove('is-active');
      current = nextIndex;
      slides[current].classList.add('is-active');
      dots[current] && dots[current].classList.add('is-active');
    }

    prevBtn && prevBtn.addEventListener('click', () => goTo(current - 1));
    nextBtn && nextBtn.addEventListener('click', () => goTo(current + 1));

    // Автопрокрутка — медленная, останавливается при наведении
    // и не запускается при prefers-reduced-motion.
    let autoplayId = null;
    function startAutoplay() {
      if (prefersReducedMotion || slides.length < 2) return;
      stopAutoplay();
      autoplayId = window.setInterval(() => goTo(current + 1), 7000);
    }
    function stopAutoplay() {
      if (autoplayId) {
        window.clearInterval(autoplayId);
        autoplayId = null;
      }
    }
    carousel.addEventListener('mouseenter', stopAutoplay);
    carousel.addEventListener('mouseleave', startAutoplay);
    carousel.addEventListener('focusin', stopAutoplay);
    carousel.addEventListener('focusout', startAutoplay);
    startAutoplay();

    // Свайп для touch-устройств.
    let touchStartX = null;
    carousel.addEventListener(
      'touchstart',
      (event) => {
        touchStartX = event.touches[0].clientX;
      },
      { passive: true }
    );
    carousel.addEventListener(
      'touchend',
      (event) => {
        if (touchStartX === null) return;
        const deltaX = event.changedTouches[0].clientX - touchStartX;
        if (Math.abs(deltaX) > 40) {
          goTo(deltaX < 0 ? current + 1 : current - 1);
        }
        touchStartX = null;
      },
      { passive: true }
    );
  }

  /* ================================================================
     11. FAQ — LUXURY ACCORDION
     Trigger:   клик по .faq-item__trigger.
     Duration:  0.9s (var(--dur-medium) — max-height/opacity уже
                заданы CSS transition в .faq-item__panel).
     Purpose:   раскрывается только один вопрос за раз — спокойный,
                предсказуемый ритм чтения, без нагромождения текста.
     ================================================================ */
  function initFaqAccordion() {
    const triggers = document.querySelectorAll('.faq-item__trigger');
    if (!triggers.length) return;

    triggers.forEach((trigger) => {
      trigger.addEventListener('click', () => {
        const isOpen = trigger.getAttribute('aria-expanded') === 'true';
        triggers.forEach((t) => t.setAttribute('aria-expanded', 'false'));
        trigger.setAttribute('aria-expanded', String(!isOpen));
      });
    });
  }

  /* ================================================================
     11b. MEMBERSHIP — SELECTED ROW ACCENT
     Trigger:   клик/тап по .membership__row.
     Purpose:   золотая полоса слева — не hover-эффект, а стойкое
                состояние "выбранной" строки: остаётся видимой, пока
                не нажмут на другую строку или в любое другое место
                экрана. Это осознанно НЕ CSS :active/:hover — им
                не хватает памяти между тапами на touch-устройствах.
     ================================================================ */
  function initMembershipSelection() {
    const rows = document.querySelectorAll('.membership__row');
    if (!rows.length) return;

    rows.forEach((row) => {
      row.addEventListener('click', (e) => {
        const alreadySelected = row.classList.contains('is-selected');
        rows.forEach((r) => r.classList.remove('is-selected'));
        if (!alreadySelected) row.classList.add('is-selected');
        e.stopPropagation();
      });
    });

    document.addEventListener('click', () => {
      rows.forEach((r) => r.classList.remove('is-selected'));
    });
  }

  /* ================================================================
     12. REQUEST MODAL
     Trigger:   клик по любому [data-open-request] / закрытие через
                [data-close-request], backdrop, клавишу Escape.
     Duration:  0.9s открытие/закрытие (var(--dur-medium)), панель —
                своя кривая var(--ease-atmosphere) уже в CSS.
     Purpose:   заявка на перелёт — единственное реальное конверсионное
                действие на странице, поэтому модал перехватывает
                фокус (focus trap) и возвращает его на триггер после
                закрытия, чтобы не терять доступность на любом языке
                взаимодействия — клавиатура, скринридер, мышь.
     ================================================================ */
  function initRequestModal() {
    const modal = document.getElementById('requestModal');
    const form = document.getElementById('requestForm');
    const success = document.getElementById('requestSuccess');
    if (!modal) return;

    const openTriggers = document.querySelectorAll('[data-open-request]');
    const closeTriggers = modal.querySelectorAll('[data-close-request]');
    let lastFocused = null;

    function getFocusable() {
      return Array.from(
        modal.querySelectorAll(
          'a[href], button:not([disabled]), input:not([disabled]), textarea:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])'
        )
      ).filter((el) => el.offsetParent !== null);
    }

    function openModal() {
      lastFocused = document.activeElement;
      modal.classList.add('is-open');
      modal.setAttribute('aria-hidden', 'false');
      document.body.style.overflow = 'hidden';

      // Сбрасываем на форму, если предыдущий визит закончился успехом.
      if (form) form.hidden = false;
      if (success) success.classList.remove('is-visible');
      if (success) success.setAttribute('aria-hidden', 'true');

      const focusable = getFocusable();
      const first = focusable[0];
      if (first) {
        // Ждём кадр, чтобы transition панели уже начался — фокус
        // не должен дёргать скролл до старта анимации.
        nextFrame(() => first.focus());
      }
    }

    function closeModal() {
      modal.classList.remove('is-open');
      modal.setAttribute('aria-hidden', 'true');
      document.body.style.overflow = '';
      if (lastFocused && typeof lastFocused.focus === 'function') {
        lastFocused.focus();
      }
    }

    openTriggers.forEach((trigger) => {
      trigger.addEventListener('click', (event) => {
        event.preventDefault();
        openModal();
      });
    });

    closeTriggers.forEach((trigger) => {
      trigger.addEventListener('click', () => closeModal());
    });

    document.addEventListener('keydown', (event) => {
      if (!modal.classList.contains('is-open')) return;

      if (event.key === 'Escape') {
        closeModal();
        return;
      }

      // Focus trap — Tab не должен уводить фокус за пределы модала.
      if (event.key === 'Tab') {
        const focusable = getFocusable();
        if (!focusable.length) return;
        const first = focusable[0];
        const last = focusable[focusable.length - 1];

        if (event.shiftKey && document.activeElement === first) {
          event.preventDefault();
          last.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault();
          first.focus();
        }
      }
    });

    if (form) {
      form.addEventListener('submit', (event) => {
        event.preventDefault();
        // В продакшене здесь отправка на бэкенд/CRM. На уровне
        // фронтенда фиксируем намерение и показываем подтверждение —
        // консультант, согласно тексту формы, свяжется в течение
        // пятнадцати минут.
        form.hidden = true;
        if (success) {
          success.classList.add('is-visible');
          success.setAttribute('aria-hidden', 'false');
          success.setAttribute('tabindex', '-1');
          success.focus();
        }
      });
    }
  }

  /* ================================================================
     13. SPOTLIGHT CURSOR
     Trigger:   mousemove по документу (только устройства с hover:
                CSS уже скрывает .spotlight на touch через
                @media (hover: none), здесь дублируем проверку, чтобы
                не вешать лишний листенер там, где эффекта всё равно
                не будет).
     Duration:  transform обновляется каждый кадр без transition —
                opacity плавно нарастает через CSS (0.5s var(--ease-glass)).
     GPU:       только transform: translate — не трогает layout.
     Purpose:   мягкое пятно света, которое следует за курсором,
                усиливает ощущение стеклянного, объёмного интерфейса —
                как будто сам свет реагирует на присутствие пользователя.
     ================================================================ */
  function initSpotlight() {
    const spotlight = document.querySelector('.spotlight');
    if (!spotlight) return;
    if (!window.matchMedia('(hover: hover)').matches) return;

    // Сглаживание через lerp: пятно света не телепортируется к
    // курсору за один кадр, а плавно "нагоняет" его — так же, как
    // ведёт себя магнитная кнопка (см. п.14), только непрерывно,
    // а не только на mouseleave. 0.5 -50%,-50% всегда включены в
    // сам transform (центрирование элемента на точке), плюс lerp-
    // позиция поверх.
    let rafId = null;
    let targetX = window.innerWidth / 2;
    let targetY = window.innerHeight / 2;
    let currentX = targetX;
    let currentY = targetY;
    const smoothing = prefersReducedMotion ? 1 : 0.16;

    function apply() {
      currentX += (targetX - currentX) * smoothing;
      currentY += (targetY - currentY) * smoothing;
      spotlight.style.transform = `translate(${currentX}px, ${currentY}px) translate(-50%, -50%)`;

      // Пока расстояние до цели заметно, продолжаем rAF-цикл;
      // иначе останавливаем, чтобы не жечь кадры на неподвижном пятне.
      const dist = Math.abs(targetX - currentX) + Math.abs(targetY - currentY);
      if (dist > 0.1) {
        rafId = requestAnimationFrame(apply);
      } else {
        rafId = null;
      }
    }

    document.addEventListener('mousemove', (event) => {
      targetX = event.clientX;
      targetY = event.clientY;
      spotlight.classList.add('is-active');
      if (rafId === null) rafId = requestAnimationFrame(apply);
    });

    document.addEventListener('mouseleave', () => {
      spotlight.classList.remove('is-active');
    });
  }

  /* ================================================================
     14. SOFT MAGNETIC BUTTONS
     Trigger:   mousemove над элементом .magnetic.
     Duration:  без transition на самом сдвиге (следует за курсором
                напрямую для отзывчивости); возврат в состояние покоя
                использует var(--dur-medium) — задаётся через inline-
                переключение transition только на время "отпускания".
     GPU:       CSS-переменные --mx/--my читаются в transform
                (см. .magnetic в CSS) — двигается только сам слой.
     Purpose:   кнопки словно чуть притягиваются к курсору — тихий,
                почти незаметный отклик интерфейса, без резких скачков.
     ================================================================ */
  function initMagneticButtons() {
    if (!window.matchMedia('(hover: hover)').matches) return;
    const magnets = document.querySelectorAll('.magnetic');
    if (!magnets.length) return;

    const strength = prefersReducedMotion ? 0 : 0.28;
    const maxOffset = 10;

    magnets.forEach((el) => {
      el.addEventListener('mouseenter', () => {
        el.style.setProperty('--ms', '1.015');
      });

      el.addEventListener('mousemove', (event) => {
        if (strength === 0) return;
        const rect = el.getBoundingClientRect();
        const relX = event.clientX - rect.left - rect.width / 2;
        const relY = event.clientY - rect.top - rect.height / 2;
        const mx = Math.max(-maxOffset, Math.min(maxOffset, relX * strength));
        const my = Math.max(-maxOffset, Math.min(maxOffset, relY * strength));
        el.style.transition = 'transform 0.15s var(--ease-glass)';
        el.style.setProperty('--mx', `${mx}px`);
        el.style.setProperty('--my', `${my}px`);
      });

      el.addEventListener('mouseleave', () => {
        el.style.transition = 'transform var(--dur-medium) var(--ease-glass)';
        el.style.setProperty('--mx', '0px');
        el.style.setProperty('--my', '0px');
        el.style.setProperty('--ms', '1');
      });
    });
  }

  /* ================================================================
     15. SMOOTH ANCHOR SCROLL (общая навигация по якорям)
     Trigger:   клик по любой внутренней ссылке вида href="#id",
                кроме уже обработанных выше модальных/каруселевых
                триггеров.
     Purpose:   единая, предсказуемая прокрутка ко всем секциям —
                philosophy, fleet, experience, destinations,
                membership и так далее — с учётом фиксированной
                шапки (var(--nav-height)), чтобы заголовок секции не
                оказывался под навигацией.
     ================================================================ */
  function initSmoothAnchors() {
    const navHeightVar = getComputedStyle(document.documentElement)
      .getPropertyValue('--nav-height')
      .trim();
    const navHeight = parseInt(navHeightVar, 10) || 92;

    document.querySelectorAll('a[href^="#"]').forEach((link) => {
      const targetId = link.getAttribute('href');
      if (!targetId || targetId === '#') return;
      // Ссылки, у которых уже есть собственный обработчик
      // (data-jet-link, data-route), не трогаем — избегаем двойной
      // логики на одном элементе.
      if (link.hasAttribute('data-jet-link') || link.hasAttribute('data-route')) return;

      link.addEventListener('click', (event) => {
        const target = document.querySelector(targetId);
        if (!target) return;
        event.preventDefault();
        const top = target.getBoundingClientRect().top + window.scrollY - navHeight + 1;
        window.scrollTo({
          top,
          behavior: prefersReducedMotion ? 'auto' : 'smooth',
        });
      });
    });
  }

  /* ================================================================
     INIT
     Порядок вызовов не влияет на корректность — модули независимы
     друг от друга и работают с непересекающимися частями DOM.
     ================================================================ */
  function init() {
    initPreloader();
    updateNavScrolled();
    window.addEventListener('scroll', onScrollForNav, { passive: true });
    initMobileMenu();
    initRevealOnScroll();
    initPhilosophyWords();
    initFigureCounters();
    initAircraftViewToggle();
    initFleetFooterLink();
    initGlobe();
    initStoriesCarousel();
    initFaqAccordion();
    initMembershipSelection();
    initRequestModal();
    initSpotlight();
    initMagneticButtons();
    initSmoothAnchors();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
