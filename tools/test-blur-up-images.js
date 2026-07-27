'use strict';

const assert = require('assert');
const fs = require('fs');
const http = require('http');
const os = require('os');
const path = require('path');
const cheerio = require('cheerio');
const { createProcessor } = require('../scripts/blur-up-images');

const ROOT = path.resolve(__dirname, '..');
const SOURCE_DIR = path.join(ROOT, 'source');
const TEST_IMAGE = path.join(SOURCE_DIR, 'assets/uom-auto-printer/auto-print.webp');

function createHexo(cacheDir, overrides = {}) {
  const warnings = [];
  return {
    base_dir: ROOT,
    source_dir: SOURCE_DIR,
    config: {
      root: '/',
      blur_up_images: {
        cache_dir: cacheDir,
        remote_timeout_ms: 300,
        ...overrides
      }
    },
    log: {
      info() {},
      warn(...args) { warnings.push(args); }
    },
    warnings
  };
}

function inspectSingleImage(html) {
  const $ = cheerio.load(html);
  const image = $('img').first();
  assert.strictEqual(image.length, 1, 'expected one image');
  return image;
}

function routePathFromStyle(style) {
  const match = String(style || '').match(/url\('([^']+)'\)/);
  assert(match, 'placeholder URL was not written');
  return match[1].replace(/^\//, '');
}

async function listen(server) {
  await new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(0, '127.0.0.1', resolve);
  });
  return server.address().port;
}

async function close(server) {
  await new Promise((resolve, reject) => server.close(error => error ? reject(error) : resolve()));
}

async function testLocalImage(cacheDir) {
  const hexo = createHexo(cacheDir);
  const processor = createProcessor(hexo);
  const html = await processor.processHtml(
    '<img src="/assets/uom-auto-printer/auto-print.webp" alt="long screenshot">',
    { full_source: path.join(SOURCE_DIR, '_posts/test.md') }
  );
  const image = inspectSingleImage(html);

  assert(image.hasClass('blur-up-image'), 'local image is missing blur-up class');
  assert(image.hasClass('blur-up-image--tall'), 'long local image was not classified as tall');
  assert.strictEqual(image.attr('width'), '374');
  assert.strictEqual(image.attr('height'), '1039');
  assert.strictEqual(image.attr('data-blur-up'), 'local');
  assert.notStrictEqual(image.attr('no-lazy'), undefined, 'legacy lazy loader was not bypassed');

  const routes = processor.generateRoutes();
  assert.strictEqual(routes.length, 1, 'local preview route was not generated');
  assert(routes[0].data.length > 0 && routes[0].data.length < 2048, 'local preview size is unreasonable');
  assert.strictEqual(routePathFromStyle(image.attr('style')), routes[0].path);
}

async function testRemoteImage(cacheDir) {
  const imageBuffer = await fs.promises.readFile(TEST_IMAGE);
  let requests = 0;
  const server = http.createServer((request, response) => {
    requests += 1;
    if (request.url === '/redirect.webp') {
      response.writeHead(302, { Location: '/image.webp' });
      response.end();
      return;
    }
    response.writeHead(200, {
      'Content-Type': 'image/webp',
      'Content-Length': imageBuffer.length,
      ETag: '"blur-up-test"'
    });
    response.end(imageBuffer);
  });
  const port = await listen(server);
  const remoteUrl = `http://127.0.0.1:${port}/redirect.webp`;

  const firstHexo = createHexo(cacheDir);
  const firstProcessor = createProcessor(firstHexo);
  const firstHtml = await firstProcessor.processHtml(`<img src="${remoteUrl}" alt="remote">`);
  const firstImage = inspectSingleImage(firstHtml);
  assert.strictEqual(firstImage.attr('data-blur-up'), 'remote');
  assert(firstImage.hasClass('blur-up-image--tall'));
  assert.strictEqual(firstProcessor.generateRoutes().length, 1);
  assert.strictEqual(requests, 2, 'redirect and image requests were not both completed');

  const cachedHexo = createHexo(cacheDir);
  const cachedProcessor = createProcessor(cachedHexo);
  await cachedProcessor.processHtml(`<img src="${remoteUrl}" alt="remote cached">`);
  assert.strictEqual(requests, 2, 'fresh remote cache unexpectedly contacted the server');
  assert.strictEqual(cachedProcessor.stats.cacheHits, 1);

  await close(server);

  const staleHexo = createHexo(cacheDir, { remote_cache_days: -1 });
  const staleProcessor = createProcessor(staleHexo);
  const staleHtml = await staleProcessor.processHtml(`<img src="${remoteUrl}" alt="remote stale">`);
  const staleImage = inspectSingleImage(staleHtml);
  assert.strictEqual(staleImage.attr('data-blur-up'), 'remote');
  assert.strictEqual(staleProcessor.stats.staleFallbacks, 1, 'stale remote preview was not reused');
  assert.strictEqual(staleProcessor.generateRoutes().length, 1);
}

function verifyGeneratedSite() {
  const outputPath = path.join(ROOT, 'public/posts/UOM-Auto-Printer.html');
  if (!fs.existsSync(outputPath)) return;

  const $ = cheerio.load(fs.readFileSync(outputPath, 'utf8'));
  const images = $('.article-entry img.blur-up-image');
  assert.strictEqual(images.length, 14, 'generated UOM article should contain 14 processed images');
  assert.strictEqual($('.article-entry img[data-original]').length, 0, 'legacy SVG lazy loader still owns article images');
  assert.strictEqual($('.article-entry img.blur-up-image--tall').length, 2, 'expected two automatic tall-image classifications');

  images.each((index, element) => {
    const image = $(element);
    assert(Number(image.attr('width')) > 0 && Number(image.attr('height')) > 0, `image ${index + 1} has no dimensions`);
    const route = routePathFromStyle(image.attr('style'));
    assert(fs.existsSync(path.join(ROOT, 'public', route)), `placeholder route is missing: ${route}`);
  });

  const indexHtml = fs.readFileSync(path.join(ROOT, 'public/index.html'), 'utf8');
  assert(indexHtml.includes('/scripts/imageReveal.js'), 'image reveal script is missing from the home page');
}

async function main() {
  const tempRoot = await fs.promises.mkdtemp(path.join(os.tmpdir(), 'hexo-blur-up-test-'));
  try {
    await testLocalImage(path.join(tempRoot, 'local'));
    await testRemoteImage(path.join(tempRoot, 'remote'));
    verifyGeneratedSite();
    console.log('Blur-up image tests passed');
  } finally {
    await fs.promises.rm(tempRoot, { recursive: true, force: true });
  }
}

main().catch(error => {
  console.error(error.stack || error);
  process.exitCode = 1;
});
