import React from "react";
import { Download, Printer } from "lucide-react";

// Code 39: each symbol contains nine bars/spaces, of which three are wide.
// The GHZ-generated identifiers use only A-F, digits, G, H and Z.
const PATTERNS = {
  "0": "nnnwwnwnn", "1": "wnnwnnnnw", "2": "nnwwnnnnw",
  "3": "wnwwnnnnn", "4": "nnnwwnnnw", "5": "wnnwwnnnn",
  "6": "nnwwwnnnn", "7": "nnnwnnwnw", "8": "wnnwnnwnn",
  "9": "nnwwnnwnn", "A": "wnnnnwnnw", "B": "nnwnnwnnw",
  "C": "wnwnnwnnn", "D": "nnnnwwnnw", "E": "wnnnwwnnn",
  "F": "nnwnwwnnn", "G": "nnnnnwwnw", "H": "wnnnnwwnn",
  "I": "nnwnnwwnn", "J": "nnnnwwwnn", "K": "wnnnnnnww",
  "L": "nnwnnnnww", "M": "wnwnnnnwn", "N": "nnnnwnnww",
  "O": "wnnnwnnwn", "P": "nnwnwnnwn", "Q": "nnnnnnwww",
  "R": "wnnnnnwwn", "S": "nnwnnnwwn", "T": "nnnnwnwwn",
  "U": "wwnnnnnnw", "V": "nwwnnnnnw", "W": "wwwnnnnnn",
  "X": "nwnnwnnnw", "Y": "wwnnwnnnn", "Z": "nwwnwnnnn",
  "-": "nwnnnnwnw", ".": "wwnnnnwnn", " ": "nwwnnnwnn",
  "$": "nwnwnwnnn", "/": "nwnwnnnwn", "+": "nwnnnwnwn",
  "%": "nnnwnwnwn", "*": "nwnnwnwnn",
};

function encodeBarcode(value) {
  const text = String(value || "").trim().toUpperCase();
  if (!text || [...text].some((c) => !PATTERNS[c] || c === "*")) return null;
  const encoded = `*${text}*`;
  const bars = [];
  let x = 12;
  for (const ch of encoded) {
    const pattern = PATTERNS[ch];
    for (let i = 0; i < pattern.length; i += 1) {
      const width = pattern[i] === "w" ? 6 : 2;
      if (i % 2 === 0) bars.push({ x, width });
      x += width;
    }
    x += 2; // inter-character gap
  }
  return { text, bars, width: x + 10 };
}

function svgMarkup(data) {
  const lines = data.bars.map(({ x, width }) =>
    `<rect x="${x}" y="10" width="${width}" height="70" fill="#000"/>`
  ).join("");
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${data.width}" height="110" viewBox="0 0 ${data.width} 110"><rect width="100%" height="100%" fill="#fff"/>${lines}<text x="${data.width / 2}" y="101" fill="#000" text-anchor="middle" font-size="15" font-family="Arial,sans-serif">${data.text}</text></svg>`;
}

export default function ProductBarcode({ value, productName = "", price = null }) {
  const data = encodeBarcode(value);
  if (!data) return <p className="text-sm text-muted-foreground">No scannable barcode available.</p>;

  const download = () => {
    const blob = new Blob([svgMarkup(data)], { type: "image/svg+xml;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${data.text}-barcode.svg`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  };

  const printLabel = () => {
    const escapeHtml = (value) => String(value ?? "").replace(/[&<>"']/g, (char) => ({
      "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
    })[char]);
    const printWindow = window.open("", "_blank", "width=650,height=550");
    if (!printWindow) { window.alert("Allow pop-ups to print barcode labels."); return; }
    const priceLabel = price === null || price === undefined || price === ""
      ? "" : `<div class="price">AED ${escapeHtml(price)}</div>`;
    printWindow.document.open();
    printWindow.document.write(`<!doctype html><html><head><meta charset="utf-8"/><title>Barcode ${escapeHtml(data.text)}</title>
      <style>@page{size:50mm 30mm;margin:0}html,body{margin:0;padding:0;font-family:Arial,sans-serif;color:#000}
      .label{box-sizing:border-box;width:50mm;height:30mm;padding:2mm;display:flex;flex-direction:column;align-items:center;justify-content:center;overflow:hidden}
      .name{font-size:9pt;font-weight:700;text-align:center;max-width:100%;overflow:hidden;white-space:nowrap;text-overflow:ellipsis}
      svg{display:block;width:46mm;height:17mm}.price{font-size:9pt;font-weight:700}
      @media screen{body{background:#ddd;display:flex;justify-content:center;padding:20px}.label{background:white}}
      </style></head><body><div class="label"><div class="name">${escapeHtml(productName)}</div>${svgMarkup(data)}${priceLabel}</div>
      <script>window.addEventListener('load',function(){setTimeout(function(){window.print()},250)});<\/script></body></html>`);
    printWindow.document.close();
  };

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 dark:border-white/10">
      <svg role="img" aria-label={`Code 39 barcode ${data.text}`} viewBox={`0 0 ${data.width} 110`} className="h-28 w-full" preserveAspectRatio="xMidYMid meet">
        <rect width={data.width} height="110" fill="white" />
        {data.bars.map(({ x, width }, index) => <rect key={index} x={x} y="10" width={width} height="70" fill="black" />)}
        <text x={data.width / 2} y="101" fill="black" fontSize="15" textAnchor="middle" fontFamily="Arial, sans-serif">{data.text}</text>
      </svg>
      <button type="button" onClick={download} className="mt-3 inline-flex items-center gap-2 rounded-md border border-slate-200 px-3 py-2 text-sm font-medium text-slate-800 hover:bg-slate-50">
        <Download className="h-4 w-4" /> Download Barcode (SVG)
      </button>
      <button type="button" onClick={printLabel} className="mt-3 ml-2 inline-flex items-center gap-2 rounded-md border border-slate-200 px-3 py-2 text-sm font-medium text-slate-800 hover:bg-slate-50">
        <Printer className="h-4 w-4" /> Print Label (50 × 30 mm)
      </button>
    </div>
  );
}
