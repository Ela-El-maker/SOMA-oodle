/**
 * server/scrapers/MarketDataScraper.js
 *
 * Scrapes real market data for the Simulation Suite.
 * SOMA uses this to trade on actual conditions, not synthetic noise.
 *
 * Sources:
 *   CoinGecko API    — crypto prices (free, no key)
 *   Yahoo Finance    — stocks + futures prices (unofficial API, no key)
 *   CoinDesk         — crypto news headlines (Puppeteer)
 *   Reuters Finance  — macro/stock news (Puppeteer)
 *   Reddit WSB       — retail sentiment from r/wallstreetbets (Reddit API)
 *
 * Cache: 60s in-memory. Returns stale data on scrape failure so the
 * frontend never gets a hard error.
 */

import puppeteer from 'puppeteer';

// ── Cache ──────────────────────────────────────────────────────────────────
const CACHE_TTL_MS = 60_000;
let _cache = null;
let _cacheTs = 0;
let _scraping = false;

// ── Fetch helpers ─────────────────────────────────────────────────────────

async function fetchJson(url, opts = {}) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), opts.timeout ?? 8000);
    try {
        const res = await fetch(url, {
            signal: controller.signal,
            headers: {
                'User-Agent': 'Mozilla/5.0 (compatible; SOMA/1.0)',
                ...(opts.headers || {}),
            },
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return await res.json();
    } finally {
        clearTimeout(timer);
    }
}

// ── Crypto prices — CoinGecko ─────────────────────────────────────────────

async function fetchCrypto() {
    try {
        const data = await fetchJson(
            'https://api.coingecko.com/api/v3/simple/price?ids=bitcoin,ethereum,solana,avalanche-2&vs_currencies=usd&include_24hr_change=true&include_24hr_vol=true'
        );
        return {
            BTC:  { price: data['bitcoin']?.usd,        change24h: data['bitcoin']?.usd_24h_change,        vol: data['bitcoin']?.usd_24h_vol },
            ETH:  { price: data['ethereum']?.usd,       change24h: data['ethereum']?.usd_24h_change,       vol: data['ethereum']?.usd_24h_vol },
            SOL:  { price: data['solana']?.usd,         change24h: data['solana']?.usd_24h_change,         vol: data['solana']?.usd_24h_vol },
            AVAX: { price: data['avalanche-2']?.usd,    change24h: data['avalanche-2']?.usd_24h_change,    vol: data['avalanche-2']?.usd_24h_vol },
        };
    } catch (e) {
        console.warn('[MarketDataScraper] CoinGecko failed:', e.message);
        return null;
    }
}

// ── Stock + futures prices — Yahoo Finance ────────────────────────────────

async function fetchYahooQuote(symbol) {
    try {
        const data = await fetchJson(
            `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?interval=1m&range=1d`,
            { timeout: 6000 }
        );
        const meta = data?.chart?.result?.[0]?.meta;
        if (!meta) return null;
        return {
            price: meta.regularMarketPrice,
            open:  meta.chartPreviousClose,
            change24h: meta.regularMarketPrice && meta.chartPreviousClose
                ? ((meta.regularMarketPrice - meta.chartPreviousClose) / meta.chartPreviousClose) * 100
                : null,
        };
    } catch (e) {
        return null;
    }
}

async function fetchStocksAndFutures() {
    const symbols = {
        stocks:  { NVDA: 'NVDA', MSFT: 'MSFT', AAPL: 'AAPL', META: 'META' },
        futures: { ES: 'ES=F', NQ: 'NQ=F', CL: 'CL=F', GC: 'GC=F' },
    };
    const results = { stocks: {}, futures: {} };
    const all = [
        ...Object.entries(symbols.stocks).map(([k, v]) => ({ cat: 'stocks', key: k, sym: v })),
        ...Object.entries(symbols.futures).map(([k, v]) => ({ cat: 'futures', key: k, sym: v })),
    ];
    await Promise.all(all.map(async ({ cat, key, sym }) => {
        const q = await fetchYahooQuote(sym);
        if (q) results[cat][key] = q;
    }));
    return results;
}

// ── News — CoinDesk (Puppeteer) ────────────────────────────────────────────

async function scrapeCoindeskNews(browser) {
    const page = await browser.newPage();
    try {
        await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0 Safari/537.36');
        await page.goto('https://www.coindesk.com/markets/', { waitUntil: 'domcontentloaded', timeout: 15000 });
        const headlines = await page.evaluate(() => {
            const items = [];
            document.querySelectorAll('h3, h4, [class*="headline"], [class*="title"]').forEach(el => {
                const text = el.innerText?.trim();
                if (text && text.length > 20 && text.length < 150) items.push(text);
            });
            return [...new Set(items)].slice(0, 8);
        });
        return headlines.map(h => ({ source: 'CoinDesk', text: h }));
    } catch (e) {
        console.warn('[MarketDataScraper] CoinDesk scrape failed:', e.message);
        return [];
    } finally {
        await page.close().catch(() => {});
    }
}

// ── WSB sentiment — Reddit API ─────────────────────────────────────────────

async function fetchWSB() {
    try {
        const data = await fetchJson(
            'https://www.reddit.com/r/wallstreetbets/hot.json?limit=25',
            {
                timeout: 8000,
                headers: { 'User-Agent': 'SOMA-SimBot/1.0 (market research)' },
            }
        );
        const posts = data?.data?.children || [];
        const items = posts
            .map(p => p.data)
            .filter(p => !p.stickied && p.score > 100)
            .slice(0, 12)
            .map(p => ({
                title: p.title,
                score: p.score,
                comments: p.num_comments,
                flair: p.link_flair_text || '',
                url: `https://reddit.com${p.permalink}`,
            }));

        // Simple sentiment: count bull/bear keywords in titles
        let bullCount = 0, bearCount = 0;
        const bullWords = ['moon', 'bull', 'calls', 'buy', 'long', 'yolo', 'squeeze', 'rocket', '🚀', 'gains'];
        const bearWords = ['puts', 'short', 'crash', 'bear', 'dump', 'sell', 'drop', 'rekt', 'loss'];
        for (const p of items) {
            const t = p.title.toLowerCase();
            if (bullWords.some(w => t.includes(w))) bullCount++;
            if (bearWords.some(w => t.includes(w))) bearCount++;
        }
        const total = bullCount + bearCount || 1;
        const sentiment = bullCount / total; // 0 = full bear, 1 = full bull

        return {
            posts: items,
            sentiment,
            sentimentLabel: sentiment > 0.65 ? 'BULLISH' : sentiment < 0.35 ? 'BEARISH' : 'NEUTRAL',
            bullCount,
            bearCount,
        };
    } catch (e) {
        console.warn('[MarketDataScraper] WSB fetch failed:', e.message);
        return null;
    }
}

// ── Reuters headlines — Puppeteer ─────────────────────────────────────────

async function scrapeReutersNews(browser) {
    const page = await browser.newPage();
    try {
        await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0 Safari/537.36');
        await page.goto('https://www.reuters.com/finance/', { waitUntil: 'domcontentloaded', timeout: 15000 });
        const headlines = await page.evaluate(() => {
            const items = [];
            document.querySelectorAll('[data-testid*="heading"], h3, [class*="heading"]').forEach(el => {
                const text = el.innerText?.trim();
                if (text && text.length > 20 && text.length < 160) items.push(text);
            });
            return [...new Set(items)].slice(0, 6);
        });
        return headlines.map(h => ({ source: 'Reuters', text: h }));
    } catch (e) {
        console.warn('[MarketDataScraper] Reuters scrape failed:', e.message);
        return [];
    } finally {
        await page.close().catch(() => {});
    }
}

// ── Main scrape ────────────────────────────────────────────────────────────

export async function scrapeMarketData() {
    // Return cached if fresh
    if (_cache && (Date.now() - _cacheTs) < CACHE_TTL_MS) {
        return { ..._cache, cached: true };
    }

    // Deduplicate concurrent scrape calls
    if (_scraping) {
        return _cache ? { ..._cache, cached: true, pending: true } : null;
    }
    _scraping = true;

    let browser = null;
    try {
        console.log('[MarketDataScraper] Starting market data scrape...');

        // Launch Puppeteer (headless, no sandbox for Windows)
        browser = await puppeteer.launch({
            headless: 'new',
            args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-gpu', '--disable-dev-shm-usage'],
            timeout: 20000,
        });

        // Run all scrapers in parallel
        const [crypto, stocksFutures, wsbData, coindeskNews, reutersNews] = await Promise.allSettled([
            fetchCrypto(),
            fetchStocksAndFutures(),
            fetchWSB(),
            scrapeCoindeskNews(browser),
            scrapeReutersNews(browser),
        ]);

        // Merge news
        const news = [
            ...(coindeskNews.status === 'fulfilled' ? coindeskNews.value : []),
            ...(reutersNews.status  === 'fulfilled' ? reutersNews.value  : []),
        ].filter(n => n.text && n.text.length > 10);

        const result = {
            timestamp: Date.now(),
            crypto:        crypto.status        === 'fulfilled' ? crypto.value        : null,
            stocks:        stocksFutures.status === 'fulfilled' ? stocksFutures.value?.stocks  : null,
            futures:       stocksFutures.status === 'fulfilled' ? stocksFutures.value?.futures : null,
            wsb:           wsbData.status       === 'fulfilled' ? wsbData.value       : null,
            news,
            cached: false,
        };

        _cache = result;
        _cacheTs = Date.now();

        console.log(`[MarketDataScraper] Done — crypto:${!!result.crypto} stocks:${!!result.stocks} news:${news.length} wsb:${!!result.wsb}`);
        return result;

    } catch (e) {
        console.error('[MarketDataScraper] Scrape error:', e.message);
        return _cache ? { ..._cache, cached: true, error: e.message } : null;
    } finally {
        if (browser) await browser.close().catch(() => {});
        _scraping = false;
    }
}

export function getCachedMarketData() {
    return _cache;
}
