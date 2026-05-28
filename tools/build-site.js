#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const contentDir = path.join(root, 'content');
const templatesDir = path.join(root, 'templates');
const pagesDir = path.join(root, 'pages');
const dataDir = path.join(root, 'data');

function readJSON(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function writeJSON(filePath, value) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`, 'utf8');
}

function readText(filePath) {
  return fs.readFileSync(filePath, 'utf8');
}

function writeText(filePath, value) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, value, 'utf8');
}

function escapeHTML(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function normalizeForSearch(value) {
  return String(value ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLocaleLowerCase('fr-FR')
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;|&#160;/g, ' ')
    .replace(/&amp;/g, ' et ')
    .replace(/&quot;|&#034;/g, ' ')
    .replace(/&#039;|&apos;/g, ' ')
    .replace(/[^a-z0-9]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function stripHTML(value) {
  return String(value ?? '')
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;|&#160;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&quot;|&#034;/g, '"')
    .replace(/&#039;|&apos;/g, "'")
    .replace(/\s+/g, ' ')
    .trim();
}

function slugify(value) {
  return String(value ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLocaleLowerCase('fr-FR')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '') || 'article';
}

function interpolate(template, values) {
  return template.replace(/{{(\w+)}}/g, (_, key) => values[key] ?? '');
}

function sortByTitle(items) {
  return [...items].sort((a, b) => String(a.title).localeCompare(String(b.title), 'fr-FR'));
}

function sortCategories(items) {
  return [...items].sort((a, b) => String(a.label).localeCompare(String(b.label), 'fr-FR'));
}

function loadArticles() {
  const articlesPath = path.join(contentDir, 'articles');
  return fs.readdirSync(articlesPath)
    .filter((file) => file.endsWith('.json'))
    .map((file) => readJSON(path.join(articlesPath, file)))
    .map((article) => ({
      slug: article.slug || slugify(article.title),
      title: article.title,
      summary: article.summary || '',
      image: article.image || '',
      categories: Array.isArray(article.categories) ? article.categories : [],
      bodyHtml: article.bodyHtml || ''
    }));
}

function build() {
  const site = readJSON(path.join(contentDir, 'site.json'));
  const home = readJSON(path.join(contentDir, 'home.json'));
  const declaredCategories = readJSON(path.join(contentDir, 'categories.json'));
  const articles = sortByTitle(loadArticles());

  const indexTemplate = readText(path.join(templatesDir, 'index.html'));
  const articleTemplate = readText(path.join(templatesDir, 'article.html'));

  const usedCategoryLabels = new Set();
  articles.forEach((article) => article.categories.forEach((label) => usedCategoryLabels.add(label)));
  const categoryBySlug = new Map(declaredCategories.map((category) => [category.slug || slugify(category.label), category]));
  const categories = sortCategories([...usedCategoryLabels].map((label) => {
    const slug = slugify(label);
    const declared = categoryBySlug.get(slug) || {};
    return {
      slug,
      label,
      description: declared.description || '',
      image: declared.image || ''
    };
  }));

  fs.mkdirSync(pagesDir, { recursive: true });
  articles.forEach((article) => {
    const pageHTML = interpolate(articleTemplate, {
      language: escapeHTML(site.language || 'fr'),
      siteTitle: escapeHTML(site.title),
      articleTitle: escapeHTML(article.title),
      articleCategories: escapeHTML(article.categories.join(', ')),
      articleBodyHtml: article.bodyHtml
    });
    writeText(path.join(pagesDir, `${article.slug}.html`), pageHTML);
  });

  const articlesData = articles.map((article) => ({
    slug: article.slug,
    title: article.title,
    path: `pages/${article.slug}.html`,
    categories: article.categories,
    image: article.image,
    summary: article.summary
  }));

  const searchIndex = articles.map((article) => {
    const rawText = [
      article.title,
      article.summary,
      article.categories.join(' '),
      stripHTML(article.bodyHtml)
    ].join(' ');
    return {
      slug: article.slug,
      title: article.title,
      path: `pages/${article.slug}.html`,
      categories: article.categories,
      summary: article.summary,
      searchText: normalizeForSearch(rawText)
    };
  });

  writeJSON(path.join(dataDir, 'articles.json'), articlesData);
  writeJSON(path.join(dataDir, 'categories.json'), categories);
  writeJSON(path.join(dataDir, 'search-index.json'), searchIndex);

  const indexHTML = interpolate(indexTemplate, {
    language: escapeHTML(site.language || 'fr'),
    siteTitle: escapeHTML(site.title),
    siteDescription: escapeHTML(site.description || ''),
    brandLogo: escapeHTML(site.brand?.logo || 'assets/images/site-logo.webp'),
    brandLabel: escapeHTML(site.brand?.label || site.title),
    homeIntroHtml: home.introHtml || '',
    categoriesTitle: escapeHTML(home.categoriesTitle || 'Catégories principales'),
    categoriesIntro: escapeHTML(home.categoriesIntro || 'Sélectionnez une catégorie pour filtrer les articles.'),
    articlesTitle: escapeHTML(home.articlesTitle || 'Les articles'),
    searchLabel: escapeHTML(home.searchLabel || 'Recherche'),
    searchPlaceholder: escapeHTML(home.searchPlaceholder || ''),
    resetLabel: escapeHTML(home.resetLabel || 'Réinitialiser les filtres')
  });
  writeText(path.join(root, 'index.html'), indexHTML);

  writeJSON(path.join(root, 'build-summary-v3_7.json'), {
    version: 'v3.7',
    generatedAt: new Date().toISOString(),
    articles: articles.length,
    categories: categories.length,
    source: 'content/',
    generated: ['index.html', 'pages/*.html', 'data/articles.json', 'data/categories.json', 'data/search-index.json']
  });
}

build();
