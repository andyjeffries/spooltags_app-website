#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const SITE_URL = 'https://spooltags.app';
const SRC_DIR = path.join(__dirname, '..', 'src');
const OUTPUT_FILE = path.join(__dirname, '..', 'dist', 'sitemap.xml');

// Find all index.html files recursively
function findHtmlFiles(dir, files = []) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);

    if (entry.isDirectory()) {
      // Skip image and asset directories
      if (!['images', 'assets'].includes(entry.name)) {
        findHtmlFiles(fullPath, files);
      }
    } else if (entry.name === 'index.html') {
      files.push(fullPath);
    }
  }

  return files;
}

// Convert file path to URL
function pathToUrl(filePath) {
  const relativePath = path.relative(SRC_DIR, filePath);
  const urlPath = path.dirname(relativePath);

  if (urlPath === '.') {
    return SITE_URL + '/';
  }

  return SITE_URL + '/' + urlPath.replace(/\\/g, '/') + '/';
}

// Get file modification date
function getLastMod(filePath) {
  const stats = fs.statSync(filePath);
  return stats.mtime.toISOString().split('T')[0];
}

// Determine priority based on URL depth
function getPriority(url) {
  const path = url.replace(SITE_URL, '');
  const depth = (path.match(/\//g) || []).length - 1;

  if (depth === 0) return '1.0';  // Homepage
  if (depth === 1) return '0.8';  // Top-level pages
  return '0.6';                    // Nested pages (blog posts, etc.)
}

// Generate sitemap XML
function generateSitemap() {
  const htmlFiles = findHtmlFiles(SRC_DIR);
  const urls = htmlFiles.map(file => ({
    loc: pathToUrl(file),
    lastmod: getLastMod(file),
    priority: getPriority(pathToUrl(file))
  }));

  // Sort by priority (highest first), then alphabetically
  urls.sort((a, b) => {
    if (b.priority !== a.priority) {
      return parseFloat(b.priority) - parseFloat(a.priority);
    }
    return a.loc.localeCompare(b.loc);
  });

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.map(url => `  <url>
    <loc>${url.loc}</loc>
    <lastmod>${url.lastmod}</lastmod>
    <priority>${url.priority}</priority>
  </url>`).join('\n')}
</urlset>
`;

  // Ensure dist directory exists
  const distDir = path.dirname(OUTPUT_FILE);
  if (!fs.existsSync(distDir)) {
    fs.mkdirSync(distDir, { recursive: true });
  }

  fs.writeFileSync(OUTPUT_FILE, xml);
  console.log(`Sitemap generated with ${urls.length} URLs:`);
  urls.forEach(url => console.log(`  - ${url.loc}`));
}

generateSitemap();
