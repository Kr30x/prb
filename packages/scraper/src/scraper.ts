import axios from "axios";
import * as cheerio from "cheerio";
import type { BillListItem, Bill, Author, Document, BillEvent } from "@prb/shared";

const BASE_URL = "https://sozd.duma.gov.ru";
const REQUEST_DELAY_MS = 500;

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function fetchPage(url: string): Promise<string> {
  await sleep(REQUEST_DELAY_MS);
  const response = await axios.get(url, {
    headers: {
      "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
      "Accept-Language": "ru-RU,ru;q=0.9,en;q=0.8",
    },
    timeout: 30000,
  });
  return response.data as string;
}

export async function scrapeBillList(page: number, perPage = 100): Promise<BillListItem[]> {
  const url = `${BASE_URL}/search?per_page=${perPage}&page=${page}`;
  console.log(`Scraping list page ${page}: ${url}`);

  const html = await fetchPage(url);
  const $ = cheerio.load(html);
  const bills: BillListItem[] = [];

  // Each bill row in search results
  $("tr.tr_obj, table.table tbody tr").each((_, row) => {
    const $row = $(row);
    const linkEl = $row.find("a[href*='/bill/']").first();
    if (!linkEl.length) return;

    const href = linkEl.attr("href") || "";
    const idMatch = href.match(/\/bill\/([^/?#]+)/);
    if (!idMatch) return;

    const id = idMatch[1];
    const title = linkEl.text().trim();
    const fullUrl = href.startsWith("http") ? href : `${BASE_URL}${href}`;

    // Date is usually in a <td> with class containing "date" or matching dd.mm.yyyy
    let registrationDate = "";
    $row.find("td").each((_, td) => {
      const text = $(td).text().trim();
      if (/^\d{2}\.\d{2}\.\d{4}$/.test(text)) registrationDate = text;
    });

    // Status badge
    const status = $row.find(".badge, [class*='status']").first().text().trim();

    if (id) bills.push({ id, title, registrationDate, status, url: fullUrl });
  });

  // Fallback: find any links to /bill/ on the page
  if (bills.length === 0) {
    const seen = new Set<string>();
    $("a[href*='/bill/']").each((_, el) => {
      const href = $(el).attr("href") || "";
      const idMatch = href.match(/\/bill\/([^/?#]+)/);
      if (!idMatch || seen.has(idMatch[1])) return;
      seen.add(idMatch[1]);
      const id = idMatch[1];
      const title = $(el).text().trim();
      const fullUrl = href.startsWith("http") ? href : `${BASE_URL}${href}`;
      if (title && !title.includes("созыв")) {
        bills.push({ id, title, registrationDate: "", status: "", url: fullUrl });
      }
    });
  }

  console.log(`  Found ${bills.length} bills on page ${page}`);
  return bills;
}

function parseAuthors(raw: string): Author[] {
  if (!raw) return [];

  let type: Author["type"] = "other";
  let role = "";

  const lower = raw.toLowerCase();
  if (lower.startsWith("депутат")) {
    type = "deputy";
    role = "Депутат Государственной Думы";
  } else if (lower.startsWith("сенатор")) {
    type = "senator";
    role = "Сенатор Российской Федерации";
  } else if (lower.includes("правительство")) {
    return [{ name: "Правительство Российской Федерации", role: "Правительство", type: "government" }];
  } else if (lower.includes("президент")) {
    return [{ name: "Президент Российской Федерации", role: "Президент", type: "government" }];
  }

  // Strip prefix like "Депутаты Государственной Думы " or "Сенаторы Российской Федерации "
  const prefixMatch = raw.match(/^(?:Депутаты?|Сенаторы?)(?:\s+\S+){0,4}?\s+(?=[А-Я][а-я]?\.[А-Я])/);
  const namesPart = prefixMatch ? raw.slice(prefixMatch[0].length) : raw;

  // Names are like "А.В.Картаполов, Д.Ф.Вяткин, ..."
  const names = namesPart
    .split(",")
    .map((n) => n.trim())
    .filter((n) => n.length > 2 && /[А-ЯA-Z]/.test(n));

  return names.map((name) => ({ name, role, type }));
}

export async function scrapeBillDetail(billId: string): Promise<Partial<Bill>> {
  const url = `${BASE_URL}/bill/${billId}`;
  console.log(`Scraping bill detail: ${url}`);

  const html = await fetchPage(url);
  const $ = cheerio.load(html);

  // Title: the actual bill name (not the number)
  const title = $("#oz_name, .oz_naimen").first().text().trim()
    || $("title").text().replace(/№\S+\s*Законопроект\s*::\s*.*/, "").trim();

  // Status
  const status = $("#current_oz_status").first().text().trim();

  // Passport data table rows
  const passportData: Record<string, string> = {};
  const passportDocs: Document[] = [];

  $("#opc_hild tr").each((_, row) => {
    const label = $(row).find(".opch_l_txt").text().trim();
    if (!label) return;

    // Check for PDF links in this row
    $(row).find("a[href^='/download/']").each((_, a) => {
      const href = $(a).attr("href") || "";
      passportDocs.push({
        type: label,
        url: `${BASE_URL}${href}`,
        name: label,
      });
    });

    const value = $(row).find(".opch_r").clone()
      .find("a").remove().end()  // remove link elements, keep text
      .text().trim()
      || $(row).find(".opch_r").text().trim();

    passportData[label] = value;
  });

  // Authors
  const authorsRaw = passportData["Субъект права законодательной инициативы"] || "";
  const authors = parseAuthors(authorsRaw);

  // Law form
  const lawForm = passportData["Форма законопроекта"] || "";

  // Committee
  const committeeRaw = passportData["Профильный комитет"]
    || passportData["Ответственный комитет"]
    || "";
  const committees = committeeRaw ? [committeeRaw] : [];

  // Events timeline from the ERK section
  const events: BillEvent[] = [];
  $(".oz_event.bh_etap[data-eventdate]").each((_, el) => {
    const date = $(el).attr("data-eventdate") || "";
    const eventNum = $(el).attr("data-eventnum") || "";
    const name = $(el).find(".name").first().text().trim();
    if (!date || !name) return;

    // Documents attached to this event
    const eventDocs: Document[] = [];
    $(el).find("a[href^='/download/']").each((_, a) => {
      const href = $(a).attr("href") || "";
      const docName = $(a).closest(".bh_etap_doc, .doc_row").find(".doc_name, .name").text().trim() || "Документ";
      eventDocs.push({ type: "Документ", url: `${BASE_URL}${href}`, name: docName });
    });

    events.push({ date, eventNum, name, documents: eventDocs });
  });

  // Registration date from event 1.1 or first event
  let registrationDate = "";
  const regEvent = events.find((e) => e.eventNum === "1.1") || events[0];
  if (regEvent) registrationDate = regEvent.date;

  // Last event
  const lastEvt = events[events.length - 1];
  const lastEvent = lastEvt
    ? { stage: lastEvt.name, date: lastEvt.date }
    : { stage: "", date: new Date() };

  // Convocation from bill number suffix (e.g. "1169350-8" → 8)
  const convMatch = billId.match(/-(\d+)$/);
  const convocation = convMatch ? parseInt(convMatch[1]) : 8;

  return {
    id: billId,
    title,
    lawForm,
    registrationDate: registrationDate || new Date().toISOString(),
    status,
    lastEvent,
    authors,
    committees,
    convocation,
    url,
    documents: passportDocs,
    events,
    scrapedAt: new Date(),
    updatedAt: new Date(),
  };
}
