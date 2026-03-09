import axios from "axios";
// eslint-disable-next-line @typescript-eslint/no-require-imports
const pdfParse = require("pdf-parse") as (buf: Buffer) => Promise<{ text: string; numpages: number }>;

export async function extractPdfText(url: string): Promise<string> {
  console.log(`Downloading PDF: ${url}`);

  const response = await axios.get(url, {
    responseType: "arraybuffer",
    headers: { "User-Agent": "Mozilla/5.0 (compatible; PRB-Analyzer/1.0)" },
    timeout: 60000,
  });

  const buffer = Buffer.from(response.data as ArrayBuffer);
  console.log(`PDF downloaded, size: ${buffer.byteLength} bytes`);

  const data = await pdfParse(buffer);
  console.log(`Extracted ${data.text.length} characters from ${data.numpages} pages`);
  return data.text;
}
