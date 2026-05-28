(() => {
  const main = document.querySelector('#contenu');
  const siteTitle = 'Flash Dog Duke Silver présente';
  const homeHTML = main ? main.innerHTML : '';
  const cache = new Map();

  const state = {
    articles: [],
    categories: [],
    categoryBySlug: new Map(),
    searchIndex: new Map(),
    activeCategory: '',
    query: '',
    introCollapsed: false,
    ready: false
  };

  const redirectAliases = {
    "appologetique": "apollogetique",
    "armee-citronnee": "jacques-citrus-et-son-armee-de-citrons",
    "astronef": "le-cogito",
    "credits-interstellaires": "credit-interstellaire",
    "jac-citrus-et-son-armee-de-citrons": "jacques-citrus-et-son-armee-de-citrons",
    "membres-supposes": "chroniqueurs"
  };

  const homeAliases = new Set([
    'accueil',
    'wiki-flash-dog-duke-silver-presente',
    'wiki-flash-dog-duke-silver-presente-2'
  ]);

  function normalizeText(value) {
    return String(value || '').trim();
  }

  function normalizeForSearch(value) {
    return String(value || '')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLocaleLowerCase('fr-FR')
      .replace(/[^a-z0-9]+/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  function categorySlug(label) {
    return normalizeText(label)
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLocaleLowerCase('fr-FR')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '') || 'categorie';
  }

  function escapeHTML(value) {
    return String(value || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  function resolveSlug(slug) {
    let current = normalizeText(slug).replace(/^\/+|\/+$/g, '');
    const seen = new Set();
    while (redirectAliases[current] && !seen.has(current)) {
      seen.add(current);
      current = redirectAliases[current];
    }
    return current;
  }

  function slugFromHash() {
    const hash = window.location.hash || '';
    if (!hash.startsWith('#/')) return '';
    return decodeURIComponent(hash.slice(2)).replace(/^\/+|\/+$/g, '');
  }

  function slugFromHref(href) {
    if (!href) return '';
    if (href.startsWith('#/categorie/')) return '';
    if (href.startsWith('#/')) return href.slice(2).replace(/^\/+|\/+$/g, '');
    const match = href.match(/(?:^|\/)pages\/([^/?#]+)\.html/i);
    return match ? match[1] : '';
  }

  function articleBySlug(slug) {
    const resolved = resolveSlug(slug);
    return state.articles.find((article) => article.slug === resolved);
  }

  function pagePathForSlug(slug) {
    const article = articleBySlug(slug);
    return article ? article.path : `pages/${slug}.html`;
  }

  function sortByTitle(items) {
    return [...items].sort((a, b) => a.title.localeCompare(b.title, 'fr-FR'));
  }

  function sortCategories(items) {
    return [...items].sort((a, b) => a.label.localeCompare(b.label, 'fr-FR'));
  }

  async function fetchJSON(path) {
    const response = await fetch(path, { cache: 'no-store' });
    if (!response.ok) throw new Error(`HTTP ${response.status} pour ${path}`);
    return response.json();
  }

  async function loadData() {
    const [articles, categories, searchIndex] = await Promise.all([
      fetchJSON('data/articles.json'),
      fetchJSON('data/categories.json'),
      fetchJSON('data/search-index.json')
    ]);

    state.articles = sortByTitle(articles || []);
    state.searchIndex = new Map((searchIndex || []).map((entry) => [entry.slug, entry]));

    const declared = new Map((categories || []).map((category) => [category.slug || categorySlug(category.label), category]));
    const usedLabels = new Set();
    state.articles.forEach((article) => (article.categories || []).forEach((label) => usedLabels.add(label)));

    state.categories = sortCategories([...usedLabels].map((label) => {
      const slug = categorySlug(label);
      return {
        slug,
        label,
        description: declared.get(slug)?.description || '',
        image: declared.get(slug)?.image || ''
      };
    }));

    state.categoryBySlug = new Map(state.categories.map((category) => [category.slug, category]));
    state.ready = true;
  }

  function categoryCount(category) {
    return state.articles.filter((article) => (article.categories || []).some((label) => categorySlug(label) === category.slug)).length;
  }

  function articleMatchesCategory(article, activeCategorySlug) {
    if (!activeCategorySlug) return true;
    return (article.categories || []).some((label) => categorySlug(label) === activeCategorySlug);
  }

  function articleMatchesSearch(article, query) {
    const normalizedQuery = normalizeForSearch(query);
    if (!normalizedQuery) return true;

    const indexEntry = state.searchIndex.get(article.slug);
    const fallbackText = normalizeForSearch([
      article.title,
      article.summary,
      (article.categories || []).join(' ')
    ].join(' '));

    const haystack = indexEntry?.searchText || fallbackText;
    if (haystack.includes(normalizedQuery)) return true;

    const tokens = normalizedQuery.split(' ').filter(Boolean);
    return tokens.length > 1 && tokens.every((token) => haystack.includes(token));
  }

  function filteredArticles() {
    return state.articles.filter((article) => {
      return articleMatchesCategory(article, state.activeCategory) && articleMatchesSearch(article, state.query);
    });
  }

  function renderIntroState() {
    const intro = document.querySelector('#home-intro');
    const content = document.querySelector('#home-intro-content');
    const button = document.querySelector('#toggle-intro');
    if (!intro || !content || !button) return;

    intro.classList.toggle('is-collapsed', state.introCollapsed);
    content.hidden = state.introCollapsed;
    button.setAttribute('aria-expanded', state.introCollapsed ? 'false' : 'true');
    button.textContent = state.introCollapsed ? 'Afficher la présentation' : 'Masquer la présentation';
  }

  function renderCategoryCards() {
    const grid = document.querySelector('#category-grid');
    if (!grid) return;

    grid.innerHTML = state.categories.map((category) => {
      const count = categoryCount(category);
      const active = category.slug === state.activeCategory;
      const img = category.image ? `<img src="${escapeHTML(category.image)}" alt="" loading="lazy">` : '';
      return `
        <a class="category-card${active ? ' is-active' : ''}"
           href="#/categorie/${escapeHTML(category.slug)}"
           data-category="${escapeHTML(category.slug)}"
           ${active ? 'aria-current="true"' : ''}>
          ${img}
          <span class="category-card-body">
            <span class="category-card-title">${escapeHTML(category.label)}</span>
            <span class="category-card-count">${count} article${count > 1 ? 's' : ''}</span>
            ${category.description ? `<span class="category-card-description">${escapeHTML(category.description)}</span>` : ''}
          </span>
        </a>`;
    }).join('');
  }

  function renderCategorySelect() {
    const select = document.querySelector('#category-select');
    if (!select) return;

    const options = [
      `<option value="">Toutes les catégories</option>`,
      ...state.categories.map((category) => {
        const count = categoryCount(category);
        return `<option value="${escapeHTML(category.slug)}">${escapeHTML(category.label)} (${count})</option>`;
      })
    ];

    select.innerHTML = options.join('');
    select.value = state.activeCategory || '';
  }

  function renderArticleCards() {
    const grid = document.querySelector('#article-grid');
    const summary = document.querySelector('#article-filter-summary');
    const empty = document.querySelector('#article-empty-state');
    if (!grid) return;

    const category = state.categoryBySlug.get(state.activeCategory);
    const articles = filteredArticles();
    const hasQuery = Boolean(normalizeForSearch(state.query));

    if (summary) {
      const parts = [];
      if (category) parts.push(`catégorie <strong>${escapeHTML(category.label)}</strong>`);
      if (hasQuery) parts.push(`recherche <strong>${escapeHTML(state.query)}</strong>`);

      if (parts.length) {
        summary.innerHTML = `${articles.length} article${articles.length > 1 ? 's' : ''} affiché${articles.length > 1 ? 's' : ''} pour ${parts.join(' et ')}.`;
      } else {
        summary.textContent = `${state.articles.length} articles sont disponibles. Sélectionnez une catégorie ou saisissez une recherche pour filtrer cette liste.`;
      }
    }

    grid.innerHTML = articles.map((article) => {
      const img = article.image ? `<img src="${escapeHTML(article.image)}" alt="" loading="lazy">` : '';
      const chips = (article.categories || []).map((label) => `<span>${escapeHTML(label)}</span>`).join('');
      return `
        <a class="card article-card" href="#/${escapeHTML(article.slug)}" data-page="${escapeHTML(article.path)}" data-slug="${escapeHTML(article.slug)}">
          ${img}
          <span class="article-card-categories">${chips}</span>
          <h2>${escapeHTML(article.title)}</h2>
          ${article.summary ? `<p>${escapeHTML(article.summary)}</p>` : ''}
        </a>`;
    }).join('');

    if (empty) {
      empty.style.display = articles.length ? 'none' : 'block';
    }
  }

  function renderSearchState() {
    const search = document.querySelector('#site-search');
    if (search && search.value !== state.query) search.value = state.query;
  }

  function renderHomeContent() {
    renderIntroState();
    renderCategoryCards();
    renderCategorySelect();
    renderSearchState();
    renderArticleCards();
    normalizeArticleLinks(main);

    const reset = document.querySelector('#clear-filters');
    if (reset) {
      reset.hidden = !state.activeCategory && !normalizeForSearch(state.query);
    }
  }

  function normalizeArticleLinks(scope) {
    if (!scope) return;

    scope.querySelectorAll('a[href]').forEach((link) => {
      const href = link.getAttribute('href');
      if (href && href.startsWith('#/categorie/')) return;
      if (link.dataset.home === 'true') return;

      const slug = resolveSlug(link.dataset.slug || slugFromHref(href));
      if (slug && !homeAliases.has(slug)) {
        link.setAttribute('href', `#/${slug}`);
        link.dataset.page = pagePathForSlug(slug);
        link.dataset.slug = slug;
      }
    });
  }

  function getTitleFromMain() {
    const h1 = main ? main.querySelector('h1') : null;
    return h1 ? h1.textContent.trim() : '';
  }

  function showHome(activeCategorySlug = '') {
    if (!main) return;
    state.activeCategory = activeCategorySlug || '';
    main.innerHTML = homeHTML;
    main.dataset.view = state.activeCategory ? 'category' : 'home';
    renderHomeContent();

    const category = state.categoryBySlug.get(state.activeCategory);
    document.title = category ? `${category.label} — ${siteTitle}` : siteTitle;
    main.focus({ preventScroll: true });
  }

  function extractMainContent(htmlText) {
    const parsed = new DOMParser().parseFromString(htmlText, 'text/html');
    const articleMain = parsed.querySelector('main#contenu');
    if (articleMain) return articleMain.innerHTML;
    const article = parsed.querySelector('article.article');
    if (article) return article.outerHTML;
    return htmlText;
  }

  async function loadPage(slug) {
    if (!main || !slug) {
      showHome();
      return;
    }

    const resolvedSlug = resolveSlug(slug);
    if (homeAliases.has(resolvedSlug)) {
      showHome();
      return;
    }

    const article = articleBySlug(resolvedSlug);
    if (!article) {
      showNotFound(resolvedSlug);
      return;
    }

    const path = article.path;

    try {
      main.classList.add('is-loading');

      let html = cache.get(path);
      if (!html) {
        const response = await fetch(path, { cache: 'no-store' });
        if (!response.ok) throw new Error(`HTTP ${response.status} pour ${path}`);
        html = await response.text();
        cache.set(path, html);
      }

      main.innerHTML = extractMainContent(html);
      main.dataset.view = 'article';
      normalizeArticleLinks(main);
      state.activeCategory = '';

      const pageTitle = getTitleFromMain();
      document.title = pageTitle ? `${pageTitle} — ${siteTitle}` : siteTitle;
      main.focus({ preventScroll: true });
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (error) {
      console.error(error);
      showNotFound(resolvedSlug);
    } finally {
      main.classList.remove('is-loading');
    }
  }

  function showNotFound(slug) {
    if (!main) return;
    main.innerHTML = `
      <article class="article">
        <header class="article-header"><h1>Page introuvable</h1></header>
        <div class="article-body">
          <p>Le contenu demandé n’a pas pu être chargé.</p>
          ${slug ? `<p>Route demandée : <code>${escapeHTML(slug)}</code></p>` : ''}
          <p><a href="index.html" data-home="true">Retourner à l’accueil</a></p>
        </div>
      </article>`;
    document.title = `Page introuvable — ${siteTitle}`;
  }

  function route() {
    if (!state.ready) return;

    const rawSlug = slugFromHash();
    if (!rawSlug) {
      showHome();
      return;
    }

    if (rawSlug.startsWith('categorie/')) {
      const activeCategorySlug = rawSlug.replace(/^categorie\/+/, '');
      if (state.categoryBySlug.has(activeCategorySlug)) {
        showHome(activeCategorySlug);
      } else {
        showNotFound(rawSlug);
      }
      return;
    }

    const slug = resolveSlug(rawSlug);

    if (homeAliases.has(slug)) {
      history.replaceState(null, '', window.location.pathname);
      showHome();
      return;
    }

    if (rawSlug && rawSlug !== slug) {
      history.replaceState(null, '', `#/${slug}`);
    }

    loadPage(slug);
  }

  function resetFilters() {
    state.query = '';
    state.activeCategory = '';
    if (window.location.hash) {
      history.pushState(null, '', window.location.pathname);
    }
    showHome();
  }

  function setCategory(categorySlugValue) {
    state.activeCategory = categorySlugValue || '';
    if (state.activeCategory) {
      const nextHash = `#/categorie/${state.activeCategory}`;
      if (window.location.hash === nextHash) {
        showHome(state.activeCategory);
      } else {
        window.location.hash = nextHash;
      }
    } else {
      if (window.location.hash) {
        history.pushState(null, '', window.location.pathname);
      }
      showHome('');
    }
  }

  document.addEventListener('input', (event) => {
    const target = event.target;
    if (!target || target.id !== 'site-search') return;

    state.query = target.value || '';
    const rawSlug = slugFromHash();
    const isHomeOrCategory = !rawSlug || rawSlug.startsWith('categorie/');

    if (!isHomeOrCategory) {
      history.pushState(null, '', window.location.pathname);
      showHome();
      return;
    }

    renderHomeContent();
  });

  document.addEventListener('change', (event) => {
    const target = event.target;
    if (!target || target.id !== 'category-select') return;
    setCategory(target.value || '');
  });

  document.addEventListener('click', (event) => {
    const link = event.target.closest('a');
    const button = event.target.closest('button');

    if (button && button.id === 'toggle-intro') {
      event.preventDefault();
      state.introCollapsed = !state.introCollapsed;
      renderIntroState();
      return;
    }

    if (button && button.id === 'clear-filters') {
      event.preventDefault();
      resetFilters();
      return;
    }

    if (!link) return;

    if (link.dataset.home === 'true') {
      event.preventDefault();
      resetFilters();
      return;
    }

    const href = link.getAttribute('href') || '';
    if (href.startsWith('#/categorie/')) {
      event.preventDefault();
      const category = href.replace('#/categorie/', '').replace(/^\/+|\/+$/g, '');
      setCategory(category);
      return;
    }

    const slug = resolveSlug(link.dataset.slug || slugFromHref(href));
    if (!slug) return;

    event.preventDefault();
    const nextHash = `#/${slug}`;
    if (window.location.hash === nextHash) {
      loadPage(slug);
    } else {
      window.location.hash = nextHash;
    }
  });

  window.addEventListener('hashchange', route);
  window.addEventListener('popstate', route);

  loadData()
    .then(route)
    .catch((error) => {
      console.error(error);
      if (main) {
        main.innerHTML = `
          <article class="article">
            <header class="article-header"><h1>Erreur de chargement</h1></header>
            <div class="article-body">
              <p>Les données du site n’ont pas pu être chargées.</p>
              <p>Vérifiez que le site est lancé depuis Live Server ou un serveur local, et non depuis une adresse <code>file://</code>.</p>
            </div>
          </article>`;
      }
    });
})();
