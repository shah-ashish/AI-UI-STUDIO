import puppeteer from 'puppeteer';
import { getBrowser } from './web_search.js';

/**
 * Extracts and decodes URL parameters and title from Google Maps redirects
 */
function parseGoogleMapsDetails(url) {
  try {
    const decoded = decodeURIComponent(url);
    const placeMatch = decoded.match(/\/place\/([^/@]+)/);
    const name = placeMatch ? placeMatch[1].replace(/\+/g, ' ') : null;

    // Search query match if any
    const queryMatch = decoded.match(/query=([^&]+)/);
    const queryName = queryMatch ? decodeURIComponent(queryMatch[1]).replace(/\+/g, ' ') : null;

    return {
      businessName: name || queryName,
      isGoogleMaps: true,
      originalUrl: url,
    };
  } catch (_) {
    return { isGoogleMaps: true, originalUrl: url };
  }
}

/**
 * Resolves redirects and extracts metadata/content from any web page or map link
 *
 * @param {string} url - Target URL to scrape or resolve
 * @returns {Promise<{ title: string, resolvedUrl: string, content: string, businessName?: string }>}
 */
export async function scrapeUrl(url) {
  if (!url || typeof url !== 'string') {
    throw new Error('Valid URL is required.');
  }

  const cleanUrl = url.trim().replace(/[<>]/g, '');

  // 1. First follow HTTP redirects to get final destination URL
  let resolvedUrl = cleanUrl;
  try {
    const headRes = await fetch(cleanUrl, {
      method: 'GET',
      redirect: 'follow',
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      },
      signal: AbortSignal.timeout(8000),
    });
    resolvedUrl = headRes.url || cleanUrl;
  } catch (err) {
    console.warn(`[URL Scraper] Redirect resolve warning for ${cleanUrl}:`, err.message);
  }

  // 2. If it's a Google Maps URL, parse the business details from the URL structure
  if (resolvedUrl.includes('google.com/maps') || cleanUrl.includes('maps.app.goo.gl')) {
    const mapsInfo = parseGoogleMapsDetails(resolvedUrl);
    if (mapsInfo.businessName) {
      console.log(`📍 [URL Scraper] Detected Google Maps Business: "${mapsInfo.businessName}"`);
      return {
        title: mapsInfo.businessName,
        businessName: mapsInfo.businessName,
        resolvedUrl,
        content: `Google Maps Business: "${mapsInfo.businessName}".\nLocation details from Maps URL: ${resolvedUrl}`,
      };
    }
  }

  // 3. For general websites, load with Headless Chromium (domcontentloaded only, fast timeout)
  let browser = null;
  try {
    browser = await getBrowser();
    const page = await browser.newPage();

    await page.setUserAgent(
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
    );
    await page.setViewport({ width: 1280, height: 800 });

    // Block heavy media/fonts to load instantly
    await page.setRequestInterception(true);
    page.on('request', (req) => {
      const resourceType = req.resourceType();
      if (['image', 'media', 'font'].includes(resourceType)) {
        req.abort();
      } else {
        req.continue();
      }
    });

    await page.goto(resolvedUrl, { waitUntil: 'domcontentloaded', timeout: 12000 });

    const title = await page.title();
    const bodyText = await page.evaluate(() => {
      // Remove scripts, styles, noscripts
      const scripts = document.querySelectorAll('script, style, noscript, svg');
      scripts.forEach((el) => el.remove());
      return document.body ? document.body.innerText.replace(/\s+/g, ' ').substring(0, 3000) : '';
    });

    await page.close();

    return {
      title: title || 'Web Page',
      resolvedUrl,
      content: bodyText || `Title: ${title}`,
    };
  } catch (pageErr) {
    console.warn(`[URL Scraper] Chromium scrape fallback for ${resolvedUrl}:`, pageErr.message);
    return {
      title: 'External Web Link',
      resolvedUrl,
      content: `URL: ${resolvedUrl}`,
    };
  }
}

export function getToolDefinition() {
  return `- \`scrape_url\`: Resolves redirects and extracts text, metadata, and business names from any external URL, website, or Google Maps link. Arguments: \`{"tool": "scrape_url", "url": "https://..."}\``;
}

export async function executeTool(toolName, params) {
  if (toolName === 'scrape_url' || toolName === 'scrape_page' || toolName === 'url_scraper') {
    const targetUrl = params.url || params.query || params;
    const res = await scrapeUrl(targetUrl);
    return JSON.stringify(res, null, 2);
  }
  throw new Error(`Tool "${toolName}" not supported by url_scraper.`);
}
