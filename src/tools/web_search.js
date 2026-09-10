import puppeteer from 'puppeteer';

let browserInstance = null;

/**
 * Gets or initializes a singleton Puppeteer browser instance.
 */
export async function getBrowser() {
  if (!browserInstance || !browserInstance.connected) {
    browserInstance = await puppeteer.launch({
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-gpu',
        '--window-size=1280,800',
      ],
    });
  }
  return browserInstance;
}

/**
 * Safely closes the browser instance.
 */
export async function closeBrowser() {
  if (browserInstance && browserInstance.connected) {
    await browserInstance.close();
    browserInstance = null;
  }
}

/**
 * Searches the web using Headless Chromium and extracts organic results.
 * 
 * @param {string} query - The search query.
 * @param {number} [maxResults=5] - Maximum results to return.
 * @returns {Promise<Array<{ title: string, link: string, snippet: string }>>}
 */
export async function searchWeb(query, maxResults = 5) {
  if (!query || typeof query !== 'string') {
    throw new Error('Search query must be a non-empty string.');
  }

  const browser = await getBrowser();
  const page = await browser.newPage();

  try {
    await page.setUserAgent(
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
    );
    await page.setViewport({ width: 1280, height: 800 });

    const searchUrl = `https://html.duckduckgo.com/html/?q=${encodeURIComponent(query)}`;
    await page.goto(searchUrl, { waitUntil: 'domcontentloaded', timeout: 15000 });

    const results = await page.evaluate((max) => {
      const items = [];
      const blocks = document.querySelectorAll('.web-result');

      for (const block of blocks) {
        if (items.length >= max) break;

        const titleEl = block.querySelector('.result__a');
        const snippetEl = block.querySelector('.result__snippet');

        if (titleEl) {
          let rawUrl = titleEl.getAttribute('href') || '';
          if (rawUrl.includes('uddg=')) {
            const match = rawUrl.match(/uddg=([^&]+)/);
            if (match) rawUrl = decodeURIComponent(match[1]);
          } else if (rawUrl.startsWith('//')) {
            rawUrl = 'https:' + rawUrl;
          }

          const title = titleEl.textContent.trim();
          const snippet = snippetEl ? snippetEl.textContent.trim() : '';

          if (title && rawUrl && !rawUrl.includes('duckduckgo.com')) {
            items.push({ title, link: rawUrl, snippet });
          }
        }
      }
      return items;
    }, maxResults);

    return results;
  } catch (error) {
    console.error(`Search error for "${query}":`, error.message);
    return [];
  } finally {
    await page.close();
  }
}

/**
 * Scrapes and extracts the readable text content of a specific web page using Chromium.
 * 
 * @param {string} url - The URL to inspect.
 * @param {number} [maxChars=2000] - Maximum characters of page content to return.
 * @returns {Promise<{ title: string, text: string, url: string }>}
 */
export async function scrapePageContent(url, maxChars = 2000) {
  if (!url || !url.startsWith('http')) {
    throw new Error('Valid http/https URL is required.');
  }

  const browser = await getBrowser();
  const page = await browser.newPage();

  try {
    await page.setUserAgent(
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
    );
    await page.setViewport({ width: 1280, height: 800 });

    await page.setRequestInterception(true);
    page.on('request', (req) => {
      const resourceType = req.resourceType();
      if (['image', 'stylesheet', 'font', 'media'].includes(resourceType)) {
        req.abort();
      } else {
        req.continue();
      }
    });

    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 20000 });

    const pageData = await page.evaluate((max) => {
      const elementsToRemove = document.querySelectorAll(
        'script, style, noscript, iframe, svg, nav, footer, header, .ad, .cookie-banner'
      );
      elementsToRemove.forEach((el) => el.remove());

      const title = document.title || '';
      const bodyText = (document.body ? document.body.innerText : '')
        .replace(/\n\s*\n/g, '\n')
        .trim();

      return {
        title,
        text: bodyText.slice(0, max),
      };
    }, maxChars);

    return {
      title: pageData.title,
      url: url,
      text: pageData.text,
    };
  } catch (error) {
    console.error(`Failed to scrape page ${url}:`, error.message);
    return { title: '', url, text: `Could not retrieve content: ${error.message}` };
  } finally {
    await page.close();
  }
}

/**
 * Formats search results into readable text.
 */
export function formatSearchResults(results) {
  if (!results || results.length === 0) {
    return 'No web results found.';
  }
  return results
    .map(
      (r, i) =>
        `[${i + 1}] Title: ${r.title}\nURL: ${r.link}\nSummary: ${r.snippet}`
    )
    .join('\n\n');
}

/**
 * Tool metadata and schemas for the LLM.
 */
export const toolDefinitions = [
  {
    name: 'web_search',
    description: 'Searches the web for business information, competitor websites, products, and design trends.',
    usage: '{"tool": "web_search", "query": "your search query"}',
  },
  {
    name: 'scrape_page',
    description: 'Scrapes and extracts readable text from a specific webpage URL.',
    usage: '{"tool": "scrape_page", "url": "https://example.com"}',
  },
];

/**
 * Universal executor for web_search tools.
 */
export async function executeTool(actionName, params = {}) {
  if (actionName === 'web_search' || actionName === 'searchWeb') {
    const query = params.query || params.q || (typeof params === 'string' ? params : '');
    const maxResults = params.maxResults || 3;
    const results = await searchWeb(query, maxResults);
    return formatSearchResults(results);
  }

  if (actionName === 'scrape_page' || actionName === 'scrapePage' || actionName === 'scrapePageContent') {
    const targetUrl = params.url || (typeof params === 'string' ? params : '');
    const pageData = await scrapePageContent(targetUrl);
    return `Page Title: ${pageData.title}\nURL: ${pageData.url}\nContent:\n${pageData.text}`;
  }

  throw new Error(`Unknown tool action: ${actionName}`);
}

export default {
  searchWeb,
  scrapePageContent,
  formatSearchResults,
  toolDefinitions,
  executeTool,
  closeBrowser,
};
