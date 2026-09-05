'use strict';

const crypto = require('crypto');
const fs = require('fs');
const http = require('http');
const https = require('https');
const path = require('path');
const cheerio = require('cheerio');
const sharp = require('sharp');

const CACHE_VERSION = 1;
const DEFAULTS = {
  enable: true,
  local: true,
  remote: true,
  cache_dir: '.cache/hexo-image-placeholders',
  route_dir: 'assets/image-placeholders',
  placeholder_size: 24,
  placeholder_quality: 32,
  remote_cache_days: 7,
  remote_timeout_ms: 10000,
  remote_max_bytes: 15 * 1024 * 1024,
  max_redirects: 5,
  portrait_ratio: 1.45,
  tall_ratio: 2,
  min_dimension: 64
};

function hash(value) {
  return crypto.createHash('sha256').update(value).digest('hex');
}

function normalizeRoute(value) {
  return String(value || '').replace(/^\/+|\/+$/g, '');
}

function sitePath(root, route) {
  const normalizedRoot = `/${String(root || '/').replace(/^\/+|\/+$/g, '')}`.replace(/\/$/, '');
  return `${normalizedRoot}/${normalizeRoute(route)}`.replace(/^\/\//, '/');
}

function isRemoteSource(src) {
  return /^(?:https?:)?\/\//i.test(src);
}

function isSkippedSource(src) {
  return !src || /^(?:data:|blob:|javascript:|#)/i.test(src) || /\.svg(?:[?#]|$)/i.test(src);
}

function dimensionsFromMetadata(metadata) {
  const shouldSwap = [5, 6, 7, 8].includes(metadata.orientation);
  return {
    width: shouldSwap ? metadata.height : metadata.width,
    height: shouldSwap ? metadata.width : metadata.height
  };
}

function appendStyle(style, name, value) {
  const withoutExisting = String(style || '')
    .split(';')
    .map(part => part.trim())
    .filter(Boolean)
    .filter(part => !part.startsWith(`${name}:`));
  withoutExisting.push(`${name}:${value}`);
  return `${withoutExisting.join(';')};`;
}

function previewNameFromStyle(style, routeDir) {
  const declaration = String(style || '')
    .split(';')
    .map(part => part.trim())
    .find(part => part.startsWith('--blur-up-placeholder:'));
  if (!declaration) return null;

  const match = declaration.match(/url\(\s*(['"]?)(.*?)\1\s*\)/i);
  if (!match) return null;

  const pathname = normalizeRoute(match[2].split('#')[0].split('?')[0]);
  const prefix = `${routeDir}/`;
  const prefixIndex = pathname.lastIndexOf(prefix);
  if (prefixIndex < 0) return null;

  const previewName = pathname.slice(prefixIndex + prefix.length);
  return /^[a-f0-9]{24}\.webp$/i.test(previewName) ? previewName : null;
}

function resolveLocalPath(sourceDir, postSource, src) {
  let pathname;
  try {
    pathname = decodeURIComponent(String(src).split('#')[0].split('?')[0]);
  } catch (error) {
    pathname = String(src).split('#')[0].split('?')[0];
  }

  const candidates = [];
  if (pathname.startsWith('/')) {
    candidates.push(path.resolve(sourceDir, `.${pathname}`));
  } else {
    if (postSource) candidates.push(path.resolve(path.dirname(postSource), pathname));
    candidates.push(path.resolve(sourceDir, pathname));
  }

  return candidates.find(candidate => {
    try {
      return fs.statSync(candidate).isFile();
    } catch (error) {
      return false;
    }
  });
}

function requestRemote(url, options, headers = {}, redirects = 0) {
  const normalizedUrl = url.startsWith('//') ? `https:${url}` : url;

  return new Promise((resolve, reject) => {
    const client = normalizedUrl.startsWith('https:') ? https : http;
    const request = client.get(normalizedUrl, {
      headers: {
        Accept: 'image/avif,image/webp,image/apng,image/*,*/*;q=0.8',
        'User-Agent': 'GeGeXD-Hexo-Image-Placeholder/1.0',
        ...headers
      }
    }, response => {
      const status = response.statusCode || 0;
      const location = response.headers.location;

      if (status >= 300 && status < 400 && location) {
        response.resume();
        if (redirects >= options.max_redirects) {
          reject(new Error(`too many redirects for ${url}`));
          return;
        }
        const redirectUrl = new URL(location, normalizedUrl).toString();
        requestRemote(redirectUrl, options, headers, redirects + 1).then(resolve, reject);
        return;
      }

      if (status === 304) {
        response.resume();
        resolve({ status, headers: response.headers, buffer: null });
        return;
      }

      if (status !== 200) {
        response.resume();
        reject(new Error(`HTTP ${status} for ${url}`));
        return;
      }

      const contentType = String(response.headers['content-type'] || '').toLowerCase();
      if (contentType && !contentType.startsWith('image/')) {
        response.resume();
        reject(new Error(`unexpected content type ${contentType} for ${url}`));
        return;
      }

      const contentLength = Number(response.headers['content-length'] || 0);
      if (contentLength > options.remote_max_bytes) {
        response.resume();
        reject(new Error(`remote image exceeds ${options.remote_max_bytes} bytes`));
        return;
      }

      const chunks = [];
      let size = 0;
      response.on('data', chunk => {
        size += chunk.length;
        if (size > options.remote_max_bytes) {
          request.destroy(new Error(`remote image exceeds ${options.remote_max_bytes} bytes`));
          return;
        }
        chunks.push(chunk);
      });
      response.on('end', () => {
        resolve({
          status,
          headers: response.headers,
          buffer: Buffer.concat(chunks)
        });
      });
    });

    request.setTimeout(options.remote_timeout_ms, () => {
      request.destroy(new Error(`remote image timed out after ${options.remote_timeout_ms}ms`));
    });
    request.on('error', reject);
  });
}

async function readJson(filePath) {
  try {
    return JSON.parse(await fs.promises.readFile(filePath, 'utf8'));
  } catch (error) {
    return null;
  }
}

async function writeJson(filePath, value) {
  await fs.promises.writeFile(filePath, `${JSON.stringify(value, null, 2)}\n`);
}

async function buildPreview(buffer, options) {
  const image = sharp(buffer, { animated: false, failOn: 'warning' }).rotate();
  const metadata = await image.metadata();
  const dimensions = dimensionsFromMetadata(metadata);

  if (!dimensions.width || !dimensions.height) {
    throw new Error('image dimensions are unavailable');
  }

  const preview = await sharp(buffer, { animated: false, failOn: 'warning' })
    .rotate()
    .resize({
      width: options.placeholder_size,
      height: options.placeholder_size,
      fit: 'inside',
      withoutEnlargement: true
    })
    .webp({ quality: options.placeholder_quality, effort: 4 })
    .toBuffer();

  return { ...dimensions, preview };
}

function createProcessor(hexoInstance, overrides = {}) {
  const config = {
    ...DEFAULTS,
    ...(hexoInstance.config.blur_up_images || {}),
    ...overrides
  };
  const cacheDir = path.resolve(hexoInstance.base_dir, config.cache_dir);
  const routeDir = normalizeRoute(config.route_dir);
  const workCache = new Map();
  const warningCache = new Set();
  const routeFiles = new Map();
  const stats = {
    unique: new Set(),
    local: 0,
    remote: 0,
    generated: 0,
    cacheHits: 0,
    staleFallbacks: 0,
    skipped: 0,
    failed: 0
  };

  async function ensureCacheDir() {
    await fs.promises.mkdir(cacheDir, { recursive: true });
  }

  async function exposePreview(result) {
    const route = `${routeDir}/${result.previewName}`;
    if (!routeFiles.has(route)) {
      const preview = await fs.promises.readFile(result.previewPath);
      routeFiles.set(route, preview);
    }
    return sitePath(hexoInstance.config.root, route);
  }

  async function processBuffer(buffer, identity, type, remoteMetadata = {}) {
    const contentHash = hash(buffer);
    const previewName = `${contentHash.slice(0, 24)}.webp`;
    const previewPath = path.join(cacheDir, previewName);
    let built;

    try {
      const stat = await fs.promises.stat(previewPath);
      const metadata = await sharp(buffer, { animated: false, failOn: 'warning' }).metadata();
      const dimensions = dimensionsFromMetadata(metadata);
      if (!dimensions.width || !dimensions.height || !stat.isFile()) throw new Error('invalid cache');
      built = { ...dimensions, preview: null };
      stats.cacheHits += 1;
    } catch (error) {
      built = await buildPreview(buffer, config);
      await fs.promises.writeFile(previewPath, built.preview);
      stats.generated += 1;
    }

    return {
      version: CACHE_VERSION,
      identity,
      type,
      width: built.width,
      height: built.height,
      previewName,
      previewPath,
      sourceHash: contentHash,
      fetchedAt: Date.now(),
      etag: remoteMetadata.etag || null,
      lastModified: remoteMetadata.lastModified || null
    };
  }

  async function processLocal(localPath) {
    const stat = await fs.promises.stat(localPath);
    const key = `local:${localPath}:${stat.size}:${stat.mtimeMs}`;
    if (!workCache.has(key)) {
      workCache.set(key, (async () => {
        const buffer = await fs.promises.readFile(localPath);
        return processBuffer(buffer, localPath, 'local');
      })());
    }
    return workCache.get(key);
  }

  async function processRemote(src) {
    const normalizedSrc = src.startsWith('//') ? `https:${src}` : src;
    const key = `remote:${normalizedSrc}`;
    if (workCache.has(key)) return workCache.get(key);

    const work = (async () => {
      await ensureCacheDir();
      const metadataPath = path.join(cacheDir, `remote-${hash(normalizedSrc).slice(0, 24)}.json`);
      const cached = await readJson(metadataPath);
      const cachedPreviewExists = cached && cached.version === CACHE_VERSION && cached.previewName &&
        fs.existsSync(path.join(cacheDir, cached.previewName));
      const maxAge = Number(config.remote_cache_days) * 86400000;
      const isFresh = cachedPreviewExists && Date.now() - Number(cached.fetchedAt || 0) < maxAge;

      if (isFresh) {
        stats.cacheHits += 1;
        return { ...cached, previewPath: path.join(cacheDir, cached.previewName) };
      }

      const headers = {};
      if (cachedPreviewExists && cached.etag) headers['If-None-Match'] = cached.etag;
      if (cachedPreviewExists && cached.lastModified) headers['If-Modified-Since'] = cached.lastModified;

      try {
        const response = await requestRemote(normalizedSrc, config, headers);
        if (response.status === 304 && cachedPreviewExists) {
          const refreshed = { ...cached, fetchedAt: Date.now() };
          await writeJson(metadataPath, refreshed);
          stats.cacheHits += 1;
          return { ...refreshed, previewPath: path.join(cacheDir, refreshed.previewName) };
        }

        const result = await processBuffer(response.buffer, normalizedSrc, 'remote', {
          etag: response.headers.etag,
          lastModified: response.headers['last-modified']
        });
        const persistent = { ...result };
        delete persistent.previewPath;
        await writeJson(metadataPath, persistent);
        return result;
      } catch (error) {
        if (cachedPreviewExists) {
          stats.staleFallbacks += 1;
          return { ...cached, previewPath: path.join(cacheDir, cached.previewName), stale: true };
        }
        throw error;
      }
    })();

    workCache.set(key, work);
    return work;
  }

  function warnOnce(src, error) {
    const key = `${src}:${error.message}`;
    if (warningCache.has(key)) return;
    warningCache.add(key);
    hexoInstance.log.warn('[blur-up] skipped %s: %s', src, error.message);
  }

  async function transformImage($, element, post) {
    const image = $(element);
    const originalSrc = String(image.attr('data-original') || image.attr('src') || '').trim();
    const src = originalSrc;

    if (isSkippedSource(src) || image.attr('data-no-blur-up') !== undefined || image.hasClass('no-blur-up') || image.attr('data-blur-up') === 'profile') {
      stats.skipped += 1;
      return;
    }

    const remote = isRemoteSource(src);
    if ((remote && !config.remote) || (!remote && !config.local)) {
      stats.skipped += 1;
      return;
    }

    try {
      let result;
      if (remote) {
        result = await processRemote(src);
      } else {
        const localPath = resolveLocalPath(hexoInstance.source_dir, post.full_source || post.source, src);
        if (!localPath) throw new Error('local source file was not found');
        await ensureCacheDir();
        result = await processLocal(localPath);
      }

      const shortestDimension = Math.min(result.width, result.height);
      if (shortestDimension < config.min_dimension) {
        stats.skipped += 1;
        return;
      }

      const placeholderUrl = await exposePreview(result);
      const ratio = result.height / result.width;
      image.addClass('blur-up-image');
      if (ratio >= config.portrait_ratio) image.addClass('blur-up-image--portrait');
      if (ratio >= config.tall_ratio) image.addClass('blur-up-image--tall');
      image.attr('width', String(result.width));
      image.attr('height', String(result.height));
      image.attr('loading', image.attr('loading') || 'lazy');
      image.attr('decoding', image.attr('decoding') || 'async');
      // Keep the legacy lazy-loader from replacing the placeholder with its spinner.
      image.attr('no-lazy', '');
      image.attr('data-blur-up', remote ? 'remote' : 'local');
      image.attr('src', placeholderUrl);
      image.attr('data-original', originalSrc);
      const styleWithAspect = appendStyle(
        image.attr('style'),
        '--blur-up-aspect',
        `${result.width} / ${result.height}`
      );
      image.attr('style', appendStyle(
        styleWithAspect,
        '--blur-up-placeholder',
        `url('${placeholderUrl}')`
      ));

      if (!stats.unique.has(src)) {
        stats.unique.add(src);
        if (remote) stats.remote += 1;
        else stats.local += 1;
      }
    } catch (error) {
      stats.failed += 1;
      warnOnce(src, error);
    }
  }

  async function processHtml(html, post = {}) {
    if (!html || typeof html !== 'string') return html;
    const wrapperId = `blur-up-root-${hash(html).slice(0, 10)}`;
    const $ = cheerio.load(`<div id="${wrapperId}">${html}</div>`, { decodeEntities: false });
    const images = $(`#${wrapperId} img`).toArray();
    await Promise.all(images.map(element => transformImage($, element, post)));
    return $(`#${wrapperId}`).html();
  }

  async function processPost(data) {
    if (!config.enable || data.blur_up_images === false) return data;
    if (!data.photos || (Array.isArray(data.photos) && data.photos.length === 0)) {
      const photoSources = new Set();
      const sourceHtml = [data.content, data.excerpt, data.more].filter(Boolean).join('\n');
      const sourceDocument = cheerio.load(`<div>${sourceHtml}</div>`, { decodeEntities: false });
      sourceDocument('img').each((index, element) => {
        const source = String(sourceDocument(element).attr('data-original') || sourceDocument(element).attr('src') || '').trim();
        if (!isSkippedSource(source)) photoSources.add(source);
      });
      if (photoSources.size > 0) data.photos = [...photoSources];
    }
    data.content = await processHtml(data.content, data);
    if (data.excerpt) data.excerpt = await processHtml(data.excerpt, data);
    if (data.more) data.more = await processHtml(data.more, data);
    return data;
  }

  function report() {
    if (!config.enable || stats.unique.size === 0) return;
    const totalBytes = [...routeFiles.values()].reduce((sum, preview) => sum + preview.length, 0);
    hexoInstance.log.info(
      '[blur-up] %d images (%d local, %d remote), %d previews generated, %d cache hits, %s routed',
      stats.unique.size,
      stats.local,
      stats.remote,
      stats.generated,
      stats.cacheHits,
      `${(totalBytes / 1024).toFixed(1)} KB`
    );
    if (stats.staleFallbacks) {
      hexoInstance.log.warn('[blur-up] reused %d stale remote previews after network failures', stats.staleFallbacks);
    }
  }

  async function restoreReferencedRoutes() {
    if (!hexoInstance.locals || typeof hexoInstance.locals.get !== 'function') return;
    const postsQuery = hexoInstance.locals.get('posts');
    const posts = postsQuery && typeof postsQuery.toArray === 'function' ? postsQuery.toArray() : [];
    const previewNames = new Set();

    posts.forEach(post => {
      [post.content, post.excerpt, post.more].filter(Boolean).forEach(html => {
        const $ = cheerio.load(`<div>${html}</div>`, { decodeEntities: false });
        $('img.blur-up-image[style]').each((index, element) => {
          const previewName = previewNameFromStyle($(element).attr('style'), routeDir);
          if (previewName) previewNames.add(previewName);
        });
      });
    });

    await Promise.all([...previewNames].map(async previewName => {
      const route = `${routeDir}/${previewName}`;
      if (routeFiles.has(route)) return;
      try {
        routeFiles.set(route, await fs.promises.readFile(path.join(cacheDir, previewName)));
      } catch (error) {
        warnOnce(route, new Error('cached preview was not found'));
      }
    }));
  }

  async function generateRoutes() {
    await restoreReferencedRoutes();
    return [...routeFiles.entries()].map(([route, data]) => ({ path: route, data }));
  }

  return { config, generateRoutes, processHtml, processPost, report, stats };
}

function register(hexoInstance) {
  const processor = createProcessor(hexoInstance);
  hexoInstance.extend.filter.register('after_post_render', processor.processPost, 20);
  hexoInstance.extend.generator.register('blur-up-image-placeholders', processor.generateRoutes);
  hexoInstance.extend.filter.register('after_generate', processor.report, 20);
  return processor;
}

if (typeof hexo !== 'undefined') register(hexo);

module.exports = {
  DEFAULTS,
  buildPreview,
  createProcessor,
  register,
  requestRemote,
  resolveLocalPath,
  sitePath
};
