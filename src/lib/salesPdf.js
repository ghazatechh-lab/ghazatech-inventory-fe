import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

export const GHAZA_COMPANY = {
  name: "GHAZA COMPUTER TR LLC",
  address:
    "Second Industrial St - Industrial Area 2 - Sharjah - United Arab Emirates",
  country: "United Arab Emirates",
};

const BRAND_RED = [218, 18, 33];
const BRAND_DARK = [18, 18, 18];
const BRAND_GRAY = [188, 190, 193];
const LIGHT_GRAY = [246, 246, 246];

const num = (value) => {
  const parsed = Number(value || 0);
  return Number.isFinite(parsed) ? parsed : 0;
};

const formatAmount = (value) =>
  num(value).toLocaleString("en-AE", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

let aedSymbolDataUrl = null;

const getAedSymbolDataUrl = () => {
  if (aedSymbolDataUrl) return aedSymbolDataUrl;
  if (typeof document === "undefined") return null;

  const canvas = document.createElement("canvas");
  canvas.width = 120;
  canvas.height = 48;

  const context = canvas.getContext("2d");
  if (!context) return null;

  context.clearRect(0, 0, canvas.width, canvas.height);
  context.fillStyle = "#121212";
  context.font = "700 28px Arial, sans-serif";
  context.textAlign = "left";
  context.textBaseline = "middle";
  context.direction = "rtl";
  context.fillText("د.إ", 88, 24);

  aedSymbolDataUrl = canvas.toDataURL("image/png");
  return aedSymbolDataUrl;
};

const drawCurrencyAmount = (
  doc,
  value,
  currency,
  rightX,
  baselineY,
  { fontSize = 7.7, bold = true, symbolGap = 1.2 } = {},
) => {
  const code = String(currency || "AED").toUpperCase();
  const amount = formatAmount(value);

  doc.setFont("helvetica", bold ? "bold" : "normal");
  doc.setFontSize(fontSize);
  doc.setTextColor(...BRAND_DARK);
  doc.text(amount, rightX, baselineY, { align: "right" });

  const amountWidth = doc.getTextWidth(amount);
  const symbolRight = rightX - amountWidth - symbolGap;

  if (code === "AED") {
    const symbol = getAedSymbolDataUrl();

    if (symbol) {
      const symbolW = 5.7;
      const symbolH = 2.7;
      doc.addImage(
        symbol,
        "PNG",
        symbolRight - symbolW,
        baselineY - 2.35,
        symbolW,
        symbolH,
      );
    }

    return;
  }

  doc.setFont("helvetica", "normal");
  doc.setFontSize(Math.max(6.2, fontSize - 0.8));
  doc.text(code, symbolRight, baselineY, { align: "right" });
};

const clean = (value, fallback = "-") => {
  const text = String(value ?? "").trim();
  return text || fallback;
};

const safeFileName = (value) =>
  String(value || "document")
    .trim()
    .replace(/[^\w.-]+/g, "_")
    .replace(/_+/g, "_");

const entityId = (value) => {
  if (value === null || value === undefined || value === "") return "";
  if (typeof value === "object") return String(value.id || "");
  return String(value);
};

const findProduct = (item, products = []) =>
  products.find(
    (product) =>
      String(product.product_id || product.id || "") ===
        entityId(item.product) &&
      String(product.variant_id || "") === entityId(item.variant),
  );

const productLabel = (item, products = []) => {
  const product = findProduct(item, products);

  const productName =
    item.product_name ||
    product?.product_name ||
    product?.name ||
    item.description ||
    "Product";

  const variantName =
    item.variant_name ||
    product?.variant_name ||
    product?.variant?.display_name ||
    "";

  return variantName ? `${productName} - ${variantName}` : productName;
};

const productCode = (item, products = []) => {
  const product = findProduct(item, products);

  return clean(
    item.product_sku ||
      item.product_code ||
      item.sku ||
      item.variant_sku ||
      product?.sku ||
      product?.product_code ||
      product?.variant_sku,
    "-",
  );
};

const customerAddress = (customer) =>
  [
    customer?.billing_address,
    customer?.address,
    customer?.address_line1,
    customer?.address_line_1,
    customer?.city,
    customer?.emirate,
    customer?.country,
  ]
    .filter(Boolean)
    .join(", ");

const customerTrn = (customer) =>
  customer?.trn_number ||
  customer?.trn ||
  customer?.tax_registration_number ||
  "";

const drawWrappedText = (
  doc,
  text,
  x,
  y,
  width,
  {
    fontSize = 8,
    lineHeight = 3.8,
    color = BRAND_DARK,
    fontStyle = "normal",
    align = "left",
  } = {},
) => {
  doc.setFont("helvetica", fontStyle);
  doc.setFontSize(fontSize);
  doc.setTextColor(...color);

  const lines = doc.splitTextToSize(String(text || ""), width);
  doc.text(lines, x, y, { align });
  return y + lines.length * lineHeight;
};

const drawBrandMark = (doc, x, y) => {
  doc.setFont("helvetica", "bolditalic");
  doc.setFontSize(31);
  doc.setTextColor(...BRAND_DARK);
  doc.text("GC", x, y);

  doc.setFillColor(...BRAND_RED);
  doc.triangle(x + 6, y - 4, x + 23, y - 9, x + 19, y - 5, "F");
};

const drawCompanyHeader = (doc) => {
  const pageWidth = doc.internal.pageSize.getWidth();

  doc.setFillColor(...LIGHT_GRAY);
  doc.rect(10, 8, pageWidth - 20, 38, "F");

  drawBrandMark(doc, 17, 31);

  doc.setDrawColor(...BRAND_RED);
  doc.setLineWidth(0.4);
  doc.line(51, 13, 51, 41);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);
  doc.setTextColor(...BRAND_DARK);
  doc.text("GHAZA", 57, 20);
  doc.setTextColor(...BRAND_RED);
  doc.text("COMPUTER TR LLC", 57, 26);

  doc.setDrawColor(...BRAND_DARK);
  doc.setLineWidth(0.55);
  doc.line(57, 29, 109, 29);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(6.7);
  doc.setTextColor(...BRAND_RED);
  doc.text("LAPTOPS  •  SPARE PARTS  •  ACCESSORIES", 57, 34);

  drawWrappedText(doc, GHAZA_COMPANY.address, 57, 38.2, 62, {
    fontSize: 5.6,
    lineHeight: 2.7,
    color: [55, 55, 55],
  });

  doc.setDrawColor(...BRAND_RED);
  doc.line(124, 13, 124, 41);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(10.5);
  doc.setTextColor(...BRAND_RED);
  doc.text("LAPTOP", 144, 21, { align: "center" });
  doc.text("SPARE PARTS", 144, 27, { align: "center" });

  doc.setDrawColor(...BRAND_RED);
  doc.line(129, 31, 159, 31);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(5.8);
  doc.setTextColor(...BRAND_DARK);
  doc.text("QUALITY PARTS • PROFESSIONAL SERVICE", 144, 35.5, {
    align: "center",
  });

  doc.setDrawColor(120, 120, 120);
  doc.line(164, 13, 164, 41);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(7);
  doc.setTextColor(...BRAND_DARK);
  doc.text("Sharjah, UAE", 170, 19);
  doc.text("Sales & Support", 170, 25);
  doc.text("Ghaza Computer TR LLC", 170, 31);
  doc.text("Enterprise ERP Invoice", 170, 37);

  const stripeY = 48;
  doc.setFillColor(...BRAND_DARK);
  doc.rect(10, stripeY, 38, 5, "F");

  doc.setFillColor(...BRAND_GRAY);
  doc.rect(48, stripeY, 37, 5, "F");

  doc.setFillColor(...BRAND_RED);
  doc.rect(85, stripeY, pageWidth - 95, 5, "F");
};

const drawDocumentTitle = (doc, title) => {
  const pageWidth = doc.internal.pageSize.getWidth();

  doc.setFont("helvetica", "bold");
  doc.setFontSize(21);
  doc.setTextColor(...BRAND_DARK);
  doc.text(title, pageWidth / 2, 67, { align: "center" });
};

const drawInfoBoxes = (
  doc,
  {
    customer,
    documentNumber,
    date,
    secondaryLabel,
    secondaryValue,
    paymentTerms,
    customerPo,
  },
) => {
  const pageWidth = doc.internal.pageSize.getWidth();
  const leftX = 14;
  const rightX = 121;
  const top = 75;
  const leftW = 82;
  const rightW = pageWidth - rightX - 14;
  const rowH = 8;

  doc.setDrawColor(0, 0, 0);
  doc.setLineWidth(0.25);

  const drawKeyValue = (x, y, w, label, value, height = rowH) => {
    const labelW = 31;
    doc.rect(x, y, w, height);
    doc.line(x + labelW, y, x + labelW, y + height);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(7.2);
    doc.setTextColor(...BRAND_DARK);
    doc.text(label, x + 3, y + 5.2);

    doc.setFont("helvetica", "bold");
    doc.setFontSize(7.5);
    const valueLines = doc.splitTextToSize(clean(value), w - labelW - 5);
    doc.text(
      valueLines.slice(0, Math.max(1, Math.floor(height / 4))),
      x + labelW + 3,
      y + 5.2,
    );
  };

  drawKeyValue(
    leftX,
    top,
    leftW,
    "Customer",
    customer?.customer_name || customer?.name || "Customer",
  );

  const addressHeight = 20;
  doc.rect(leftX, top + rowH, leftW, addressHeight);
  doc.line(leftX + 31, top + rowH, leftX + 31, top + rowH + addressHeight);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.2);
  doc.text("Address", leftX + 3, top + rowH + 5.2);
  drawWrappedText(
    doc,
    customerAddress(customer) || "-",
    leftX + 34,
    top + rowH + 5,
    leftW - 38,
    {
      fontSize: 7.2,
      lineHeight: 3.4,
    },
  );

  drawKeyValue(
    leftX,
    top + rowH + addressHeight,
    leftW,
    "TRN",
    customerTrn(customer) || "-",
  );

  drawKeyValue(rightX, top, rightW, "Invoice No.", documentNumber || "DRAFT");
  drawKeyValue(rightX, top + rowH, rightW, "Invoice Date", date);
  drawKeyValue(
    rightX,
    top + rowH * 2,
    rightW,
    clean(secondaryLabel, "Due Date"),
    secondaryValue,
  );
  drawKeyValue(rightX, top + rowH * 3, rightW, "Payment Terms", paymentTerms);

  if (customerPo) {
    drawKeyValue(rightX, top + rowH * 4, rightW, "Customer PO", customerPo);
  }

  return (
    Math.max(
      top + rowH + addressHeight + rowH,
      top + rowH * (customerPo ? 5 : 4),
    ) + 7
  );
};

const drawSummary = (
  doc,
  {
    startY,
    subtotal,
    vatAmount,
    discountAmount,
    shippingAmount,
    paidAmount,
    total,
    currency,
    isInvoice,
    notes,
    deliveryTerms,
  },
) => {
  const pageWidth = doc.internal.pageSize.getWidth();
  const left = 14;
  const right = pageWidth - 14;
  const totalsW = 76;
  const notesW = right - left - totalsW;

  const rows = [
    ["SUB TOTAL", subtotal],
    ["VAT", vatAmount],
  ];

  if (num(shippingAmount) !== 0) {
    rows.push(["SHIPPING", shippingAmount]);
  }

  if (num(discountAmount) !== 0) {
    rows.push(["DISCOUNT", -Math.abs(num(discountAmount))]);
  }

  rows.push(["TOTAL", total]);

  if (isInvoice && num(paidAmount) !== 0) {
    rows.push(["PAID", -Math.abs(num(paidAmount))]);
    rows.push(["AMOUNT DUE", Math.max(0, num(total) - num(paidAmount))]);
  }

  const rowH = 8.7;
  const summaryHeight = Math.max(42, rows.length * rowH);

  doc.setDrawColor(0, 0, 0);
  doc.setLineWidth(0.25);
  doc.rect(left, startY, notesW, summaryHeight);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(7.5);
  doc.setTextColor(...BRAND_DARK);
  doc.text("NOTES / TERMS", left + 4, startY + 6);

  let textY = startY + 12;

  if (deliveryTerms) {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(7);
    doc.text("Delivery Terms:", left + 4, textY);
    textY += 4;
    textY = drawWrappedText(doc, deliveryTerms, left + 4, textY, notesW - 8, {
      fontSize: 6.8,
      lineHeight: 3.2,
    });
  }

  if (notes) {
    if (deliveryTerms) textY += 2;
    doc.setFont("helvetica", "bold");
    doc.setFontSize(7);
    doc.text("Notes:", left + 4, textY);
    textY += 4;
    drawWrappedText(doc, notes, left + 4, textY, notesW - 8, {
      fontSize: 6.8,
      lineHeight: 3.2,
    });
  }

  rows.forEach(([label, value], index) => {
    const y = startY + index * rowH;
    const isTotal = label === "TOTAL" || label === "AMOUNT DUE";

    if (isTotal) {
      doc.setFillColor(245, 245, 245);
      doc.rect(left + notesW, y, totalsW, rowH, "F");
    }

    doc.rect(left + notesW, y, totalsW, rowH);
    doc.line(left + notesW + 38, y, left + notesW + 38, y + rowH);

    doc.setFont("helvetica", isTotal ? "bold" : "normal");
    doc.setFontSize(isTotal ? 9.2 : 7.7);
    doc.setTextColor(...BRAND_DARK);
    doc.text(label, left + notesW + 4, y + 5.7);

    drawCurrencyAmount(doc, value, currency, right - 4, y + 5.7, {
      fontSize: isTotal ? 9.2 : 7.7,
      bold: true,
    });
  });

  return startY + summaryHeight;
};

const drawSignatures = (doc, startY) => {
  const pageWidth = doc.internal.pageSize.getWidth();
  const leftX = 26;
  const rightX = pageWidth - 26;
  const lineW = 62;
  const y = startY + 18;

  doc.setDrawColor(0, 0, 0);
  doc.setLineWidth(0.25);
  doc.line(leftX, y, leftX + lineW, y);
  doc.line(rightX - lineW, y, rightX, y);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.4);
  doc.setTextColor(...BRAND_DARK);
  doc.text("Customer Signature", leftX + lineW / 2, y + 5, { align: "center" });
  doc.text("Authorized Signature", rightX - lineW / 2, y + 5, {
    align: "center",
  });
};

const addFooter = (doc, status) => {
  const pages = doc.getNumberOfPages();

  for (let page = 1; page <= pages; page += 1) {
    doc.setPage(page);

    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();

    doc.setDrawColor(...BRAND_RED);
    doc.setLineWidth(0.5);
    doc.line(14, pageHeight - 15, pageWidth - 14, pageHeight - 15);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(6.8);
    doc.setTextColor(70, 70, 70);
    doc.text(
      `${GHAZA_COMPANY.name} | ${GHAZA_COMPANY.address}`,
      14,
      pageHeight - 9,
    );

    const statusText = status
      ? `Status: ${String(status).replaceAll("_", " ")}  |  `
      : "";

    doc.text(
      `${statusText}Page ${page} of ${pages}`,
      pageWidth - 14,
      pageHeight - 9,
      {
        align: "right",
      },
    );
  }
};

export function downloadSalesPdf({
  type,
  number: documentNumber,
  date,
  secondaryLabel,
  secondaryValue,
  paymentTerms,
  customerPo,
  customer,
  items = [],
  products = [],
  subtotal = 0,
  vatAmount = 0,
  discountAmount = 0,
  shippingAmount = 0,
  paidAmount = 0,
  total = 0,
  currency = "AED",
  notes = "",
  deliveryTerms = "",
  status = "",
}) {
  const isInvoice = type === "INVOICE";
  const title = isInvoice ? "SALES INVOICE" : "QUOTATION";

  const doc = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: "a4",
    compress: true,
  });

  drawCompanyHeader(doc);
  drawDocumentTitle(doc, title);

  const tableStartY = drawInfoBoxes(doc, {
    customer,
    documentNumber,
    date,
    secondaryLabel,
    secondaryValue,
    paymentTerms,
    customerPo,
  });

  const rows = items.map((item, index) => {
    const quantity = num(item.quantity);
    const price = num(item.unit_price);
    const lineTotal =
      item.line_total !== undefined ? num(item.line_total) : quantity * price;

    const label = productLabel(item, products);
    const description =
      item.description &&
      item.description.trim() &&
      item.description.trim() !== label.trim()
        ? `${label}\n${item.description.trim()}`
        : label;

    return [
      productCode(item, products),
      description,
      quantity.toLocaleString("en-AE", { maximumFractionDigits: 2 }),
      formatAmount(price),
      formatAmount(lineTotal),
    ];
  });

  autoTable(doc, {
    startY: tableStartY,
    head: [["ITEM CODE", "DESCRIPTION", "QTY", "RATE", "AMOUNT"]],
    body: rows.length ? rows : [["-", "No items", "-", "-", "-"]],
    margin: {
      left: 14,
      right: 14,
      bottom: 26,
    },
    styles: {
      font: "helvetica",
      fontSize: 7.5,
      cellPadding: 2.7,
      textColor: BRAND_DARK,
      lineColor: [0, 0, 0],
      lineWidth: 0.2,
      valign: "top",
      fillColor: [255, 255, 255],
      minCellHeight: 8,
    },
    headStyles: {
      fillColor: [255, 255, 255],
      textColor: BRAND_DARK,
      fontStyle: "normal",
      fontSize: 7.3,
      halign: "center",
      valign: "middle",
      lineColor: [0, 0, 0],
      lineWidth: 0.25,
    },
    alternateRowStyles: {
      fillColor: [255, 255, 255],
    },
    columnStyles: {
      0: { cellWidth: 31 },
      1: { cellWidth: "auto" },
      2: { cellWidth: 21, halign: "center" },
      3: { cellWidth: 29, halign: "right" },
      4: { cellWidth: 31, halign: "right" },
    },
    didParseCell: (data) => {
      if (data.section === "body" && [3, 4].includes(data.column.index)) {
        data.cell.text = [""];
      }
    },
    didDrawCell: (data) => {
      if (data.section !== "body" || ![3, 4].includes(data.column.index)) {
        return;
      }

      const rawValue = Array.isArray(data.row.raw)
        ? data.row.raw[data.column.index]
        : "0.00";

      if (rawValue === "-") {
        doc.setFont("helvetica", "normal");
        doc.setFontSize(7.3);
        doc.setTextColor(...BRAND_DARK);
        doc.text("-", data.cell.x + data.cell.width - 2.5, data.cell.y + 5.4, {
          align: "right",
        });
        return;
      }

      drawCurrencyAmount(
        doc,
        rawValue,
        currency,
        data.cell.x + data.cell.width - 2.5,
        data.cell.y + 5.4,
        { fontSize: 7.3, bold: false },
      );
    },
    didDrawPage: (data) => {
      if (data.pageNumber > 1) {
        doc.setFont("helvetica", "bold");
        doc.setFontSize(7.5);
        doc.setTextColor(...BRAND_DARK);
        doc.text(`${title} - ${clean(documentNumber, "DRAFT")}`, 14, 10);
      }
    },
  });

  let cursorY = doc.lastAutoTable.finalY;
  const pageHeight = doc.internal.pageSize.getHeight();

  const projectedSummaryHeight = 80;
  if (cursorY + projectedSummaryHeight > pageHeight - 25) {
    doc.addPage();
    cursorY = 18;
  }

  const summaryEndY = drawSummary(doc, {
    startY: cursorY,
    subtotal,
    vatAmount,
    discountAmount,
    shippingAmount,
    paidAmount,
    total,
    currency,
    isInvoice,
    notes,
    deliveryTerms,
  });

  if (summaryEndY + 34 < pageHeight - 18) {
    drawSignatures(doc, summaryEndY + 5);
  }

  addFooter(doc, status);

  const prefix = isInvoice ? "Invoice" : "Quotation";
  const fileNumber = documentNumber || "Draft";
  doc.save(safeFileName(`${prefix}-${fileNumber}.pdf`));
}

export function findSalesCustomer(customers, customerValue) {
  const id = entityId(customerValue);
  return customers.find((customer) => String(customer.id || "") === id) || null;
}
