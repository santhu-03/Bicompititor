import * as cheerio from "cheerio";

const USER_AGENT =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36";

// Private/internal IP ranges to block (SSRF protection)
const BLOCKED_HOSTS = new Set([
  "localhost",
  "0.0.0.0",
  "::1",
  "169.254.169.254", // AWS/GCP metadata
  "metadata.google.internal",
]);

// Matches private IPv4 ranges: 10.x, 172.16-31.x, 192.168.x, 127.x, 169.254.x
const PRIVATE_IP_RE =
  /^(10\.\d+\.\d+\.\d+|172\.(1[6-9]|2\d|3[01])\.\d+\.\d+|192\.168\.\d+\.\d+|127\.\d+\.\d+\.\d+|169\.254\.\d+\.\d+)$/;

function isSafeUrl(urlStr) {
  let parsed;
  try {
    parsed = new URL(urlStr);
  } catch {
    return false;
  }
  if (parsed.protocol !== "https:" && parsed.protocol !== "http:") return false;
  const host = parsed.hostname.toLowerCase();
  if (BLOCKED_HOSTS.has(host)) return false;
  if (PRIVATE_IP_RE.test(host)) return false;
  return true;
}

let puppeteerModule = null;
let puppeteerChecked = false;

async function getPuppeteer() {
  if (puppeteerChecked) return puppeteerModule;
  puppeteerChecked = true;
  try {
    puppeteerModule = (await import("puppeteer")).default;
  } catch {
    console.warn("⚠ Puppeteer not installed — using lightweight fetch scraping only.");
    puppeteerModule = null;
  }
  return puppeteerModule;
}

export function normalizeUrl(input) {
  if (!input) return null;
  let url = input.trim();
  if (!/^https?:\/\//i.test(url)) url = `https://${url}`;
  try {
    const parsed = new URL(url);
    if (!isSafeUrl(parsed.toString())) return null;
    return parsed.toString();
  } catch {
    return null;
  }
}

/**
 * Fetch a page's HTML. Tries plain fetch first (fast, cheap), and falls back
 * to Puppeteer for JavaScript-rendered pages when available.
 */
async function fetchHtml(url) {
  if (!isSafeUrl(url)) return null;

  // 1. Plain fetch
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 15000);
    const res = await fetch(url, {
      headers: { "User-Agent": USER_AGENT, Accept: "text/html" },
      redirect: "follow",
      signal: controller.signal,
    });
    clearTimeout(timer);
    if (res.ok) {
      const html = await res.text();
      const textLength = cheerio.load(html)("body").text().replace(/\s+/g, " ").length;
      if (textLength > 400) return html;
    }
  } catch {
    /* fall through to puppeteer */
  }

  // 2. Puppeteer (JS-rendered sites)
  const puppeteer = await getPuppeteer();
  if (!puppeteer) return null;
  let browser;
  try {
    browser = await puppeteer.launch({
      headless: "new",
      args: ["--no-sandbox", "--disable-setuid-sandbox", "--disable-dev-shm-usage"],
    });
    const page = await browser.newPage();
    await page.setUserAgent(USER_AGENT);
    await page.goto(url, { waitUntil: "networkidle2", timeout: 30000 });
    return await page.content();
  } catch (err) {
    console.warn(`Puppeteer failed for ${url}: ${err.message}`);
    return null;
  } finally {
    if (browser) await browser.close().catch(() => {});
  }
}

/**
 * Scrape a website and return structured, LLM-ready content:
 * title, description, headings, nav links, visible text, and pricing signals.
 */
export async function scrapeWebsite(rawUrl) {
  const url = normalizeUrl(rawUrl);
  if (!url) return { url: rawUrl, ok: false, reason: "invalid-url" };

  const html = await fetchHtml(url);
  if (!html) return { url, ok: false, reason: "unreachable" };

  const $ = cheerio.load(html);
  $("script, style, noscript, svg, iframe").remove();

  const title = $("title").first().text().trim();
  const description =
    $('meta[name="description"]').attr("content") ||
    $('meta[property="og:description"]').attr("content") ||
    "";

  const headings = [];
  $("h1, h2, h3").each((_, el) => {
    const text = $(el).text().replace(/\s+/g, " ").trim();
    if (text && text.length < 140) headings.push(text);
  });

  const navLinks = [];
  $("nav a, header a, footer a").each((_, el) => {
    const text = $(el).text().replace(/\s+/g, " ").trim();
    if (text && text.length < 50) navLinks.push(text);
  });

  const bodyText = $("body").text().replace(/\s+/g, " ").trim().slice(0, 8000);

  const priceMatches =
    bodyText.match(
      /(?:[$€£₹]\s?\d[\d,]*(?:\.\d{1,2})?|\d[\d,]*\s?(?:USD|EUR|INR|GBP))(?:\s?\/\s?(?:mo|month|yr|year|user|seat))?/gi
    ) || [];

  return {
    url,
    ok: true,
    title,
    description,
    headings: [...new Set(headings)].slice(0, 40),
    navLinks: [...new Set(navLinks)].slice(0, 40),
    bodyText,
    pricingSignals: [...new Set(priceMatches)].slice(0, 30),
  };
}

/**
 * Try common pricing pages on a domain for stronger pricing extraction.
 */
export async function scrapePricingPage(baseUrl) {
  const url = normalizeUrl(baseUrl);
  if (!url) return null;
  const origin = new URL(url).origin;
  for (const path of ["/pricing", "/plans", "/pricing/", "/price"]) {
    const page = await scrapeWebsite(origin + path);
    if (page.ok && page.pricingSignals.length > 0) return page;
  }
  return null;
}
