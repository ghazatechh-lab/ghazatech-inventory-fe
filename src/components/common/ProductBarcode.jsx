import React from "react";
import { Download, Printer } from "lucide-react";

// Code 39 supports uppercase A-Z, 0-9 and - . space $ / + %.
// No separate barcode value is generated: the product SKU is encoded directly.
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
  "R": "wnnnnnwwn", "S": "nnwnnnwnn", "T": "nnnnnwwnw",
  "U": "wwnnnnnnw", "V": "nwwnnnnnw", "W": "wwwnnnnnn",
  "X": "nwnnwnnnw", "Y": "wwnnwnnnn", "Z": "nwwnwnnnn",
  "-": "nwnnnnwnw", ".": "wwnnnnwnn", " ": "nwwnnnwnn",
  "$": "nwnwnwnnn", "/": "nwnwnnnwn", "+": "nwnnnwnwn",
  "%": "nnnwnwnwn", "*": "nwnnwnwnn",
};

const SIZES = [
  { value: "50x30", label: "50 × 30 mm (Standard)", w: 50, h: 30 },
  { value: "40x30", label: "40 × 30 mm", w: 40, h: 30 },
  { value: "60x40", label: "60 × 40 mm", w: 60, h: 40 },
  { value: "70x40", label: "70 × 40 mm", w: 70, h: 40 },
  { value: "100x50", label: "100 × 50 mm", w: 100, h: 50 },
];
const escapeHtml = (value) => String(value ?? "").replace(/[&<>"']/g, (char) => ({
  "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
})[char]);

function encodeBarcode(value) {
  const text = String(value || "").trim().toUpperCase();
  if (!text || [...text].some((char) => !PATTERNS[char] || char === "*")) return null;
  const bars = [];
  let x = 12;
  for (const char of `*${text}*`) {
    const pattern = PATTERNS[char];
    for (let i = 0; i < pattern.length; i += 1) {
      const width = pattern[i] === "w" ? 6 : 2;
      if (i % 2 === 0) bars.push({ x, width });
      x += width;
    }
    x += 2;
  }
  return { text, bars, width: x + 10 };
}

function svgMarkup(data) {
  const bars = data.bars.map(({ x, width }) =>
    `<rect x="${x}" y="4" width="${width}" height="72" fill="#000"/>`
  ).join("");
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${data.width} 80" preserveAspectRatio="none" role="img" aria-label="Barcode ${escapeHtml(data.text)}"><rect width="${data.width}" height="80" fill="#fff"/>${bars}</svg>`;
}

export default function ProductBarcode({ value, productName = "", price = null }) {
  const [labelSize, setLabelSize] = React.useState("50x30");
  const [quantity, setQuantity] = React.useState("1");
  const data = encodeBarcode(value);
  const size = SIZES.find((item) => item.value === labelSize);
  const qty = Number(quantity);
  const qtyValid = Number.isInteger(qty) && qty >= 1 && qty <= 500 && String(quantity).trim() !== "";

  const download = () => {
    if (!data) return;
    const blob = new Blob([svgMarkup(data)], { type: "image/svg+xml;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${data.text.replace(/[^A-Z0-9._-]/g, "_")}-barcode.svg`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  };

  const printLabels = () => {
    if (!data || !size || !qtyValid) return;
    const printWindow = window.open("", "_blank", "width=720,height=680");
    if (!printWindow) {
      window.alert("Allow pop-ups for this site to print barcode labels.");
      return;
    }
    const priceNumber = Number(price);
    const priceLabel = price !== null && price !== undefined && String(price).trim() !== "" && Number.isFinite(priceNumber)
      ? `<div class="price">AED ${escapeHtml(priceNumber.toFixed(2))}</div>` : "";
    const skuLabel = escapeHtml(data.text);
    const company = "GHAZA COMPUTER TR LLC";
    const label = `<div class="label"><div class="company">${company}</div><div class="name">${escapeHtml(productName)}</div><div class="barcode">${svgMarkup(data)}</div><div class="sku">${skuLabel}</div>${priceLabel}</div>`;
    const html = `<!doctype html><html><head><meta charset="utf-8"><title>Print ${qty} barcode labels — ${skuLabel}</title>
      <style>
        @page { size: ${size.w}mm ${size.h}mm; margin: 0; }
        * { box-sizing: border-box; }
        html, body { margin: 0; padding: 0; font-family: Arial, sans-serif; color: #000; background: #fff; }
        .label { width: ${size.w}mm; height: ${size.h}mm; padding: 1.2mm 1.6mm; overflow: hidden; display: flex; flex-direction: column; align-items: center; justify-content: center; break-after: page; page-break-after: always; }
        .label:last-child { break-after: auto; page-break-after: auto; }
        .company { font-size: 7pt; font-weight: 800; text-align: center; line-height: 1.05; white-space: nowrap; }
        .name { width: 100%; text-align: center; font-size: 6.5pt; line-height: 1.15; overflow: hidden; white-space: nowrap; text-overflow: ellipsis; margin-top: 0.5mm; }
        .barcode { width: 100%; height: ${Math.max(9, Math.min(18, size.h * 0.43))}mm; margin-top: 0.8mm; }
        .barcode svg { display: block; width: 100%; height: 100%; }
        .sku { font-size: 7pt; font-weight: 700; line-height: 1.1; margin-top: 0.5mm; }
        .price { font-size: 7pt; font-weight: 700; line-height: 1.1; }
        @media screen { body { background: #edf2f7; } .label { background: white; margin: 8px auto; outline: 1px solid #cbd5e1; } }
        @media print { .label { margin: 0; outline: none; } }
      </style></head><body>${Array.from({ length: qty }, () => label).join("")}
      <script>window.addEventListener('load', function () { window.focus(); window.print(); });<\/script>
      </body></html>`;
    printWindow.document.open();
    printWindow.document.write(html);
    printWindow.document.close();
  };

  if (!data) return (
    <p className="text-sm text-amber-700 dark:text-amber-300">
      Barcode cannot be printed: SKU must contain only letters A–Z, numbers, spaces, or Code 39 symbols (- . $ / + %).
    </p>
  );

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 text-slate-900 dark:border-white/10">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start">
        <div className="min-w-0 flex-1 rounded-lg border border-slate-200 bg-white p-3">
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">Barcode preview — {data.text}</p>
          <svg role="img" aria-label={`Code 39 barcode ${data.text}`} viewBox={`0 0 ${data.width} 110`} className="h-24 w-full" preserveAspectRatio="xMidYMid meet">
            <rect width={data.width} height="110" fill="white" />
            {data.bars.map(({ x, width }, index) => <rect key={index} x={x} y="10" width={width} height="70" fill="black" />)}
            <text x={data.width / 2} y="101" fill="black" fontSize="15" textAnchor="middle" fontFamily="Arial, sans-serif">{data.text}</text>
          </svg>
        </div>
        <div className="w-full space-y-3 lg:w-72">
          <div>
            <label htmlFor="barcode-label-size" className="mb-1 block text-xs font-semibold text-slate-700">Label size *</label>
            <select id="barcode-label-size" value={labelSize} onChange={(e) => setLabelSize(e.target.value)} required className="h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-900">
              {SIZES.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
            </select>
          </div>
          <div>
            <label htmlFor="barcode-label-qty" className="mb-1 block text-xs font-semibold text-slate-700">Number of labels *</label>
            <input id="barcode-label-qty" type="number" min="1" max="500" step="1" required value={quantity} onChange={(e) => setQuantity(e.target.value)} aria-invalid={!qtyValid} className="h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-900" />
            {!qtyValid && <p className="mt-1 text-xs text-red-600">Enter a whole number from 1 to 500.</p>}
          </div>
          <button type="button" disabled={!qtyValid} onClick={printLabels} className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-lg bg-[#eab62c] px-4 text-sm font-bold text-slate-950 hover:bg-[#dba620] disabled:cursor-not-allowed disabled:opacity-50">
            <Printer className="h-4 w-4" /> Print {qtyValid ? qty : ""} label{qty === 1 ? "" : "s"}
          </button>
          <button type="button" onClick={download} className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-lg border border-slate-300 bg-white px-4 text-sm font-medium text-slate-800 hover:bg-slate-50">
            <Download className="h-4 w-4" /> Download barcode SVG
          </button>
          <p className="text-xs text-slate-500">Choose the installed label printer in your browser's print dialog. Set paper size to match the selected label and disable browser headers/footers.</p>
        </div>
      </div>
    </div>
  );
}
