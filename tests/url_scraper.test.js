import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { scrapeUrl, getToolDefinition, executeTool } from '../src/tools/url_scraper.js';

describe('URL Scraper & Google Maps Extractor', () => {
  it('should provide a descriptive tool definition for the model', () => {
    const def = getToolDefinition();
    assert.match(def, /scrape_url/);
    assert.match(def, /Google Maps/);
  });

  it('should reject invalid or empty URLs', async () => {
    await assert.rejects(async () => {
      await scrapeUrl('');
    }, /Valid URL is required/);

    await assert.rejects(async () => {
      await scrapeUrl(null);
    }, /Valid URL is required/);
  });

  it('should parse Google Maps place URLs and decode business name', async () => {
    const mapsUrl = 'https://www.google.com/maps/place/The+Dark+Phoenix+Cafe/@28.6139,77.2090,17z';
    const result = await scrapeUrl(mapsUrl);

    assert.equal(result.businessName, 'The Dark Phoenix Cafe');
    assert.equal(result.title, 'The Dark Phoenix Cafe');
    assert.match(result.content, /The Dark Phoenix Cafe/);
  });

  it('should parse Google Maps search query URLs', async () => {
    const mapsQueryUrl = 'https://www.google.com/maps?query=Artisan+Coffee+Roasters';
    const result = await scrapeUrl(mapsQueryUrl);

    assert.equal(result.businessName, 'Artisan Coffee Roasters');
  });

  it('should execute tool via executeTool function', async () => {
    const jsonStr = await executeTool('scrape_url', {
      url: 'https://www.google.com/maps/place/Blue+Tokai+Coffee/@19.0760,72.8777,17z',
    });

    const parsed = JSON.parse(jsonStr);
    assert.equal(parsed.businessName, 'Blue Tokai Coffee');
  });
});
