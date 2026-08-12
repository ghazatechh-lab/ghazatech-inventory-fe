import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

export const GHAZA_COMPANY = {
  name: "Ghaza Computer Tr LLC",
  address:
    "Second Industrial St - Industrial Area 2 - Industrial Area - Sharjah - United Arab Emirates",
  country: "United Arab Emirates",
};

const num = (value) => {
  const parsed = Number(value || 0);
  return Number.isFinite(parsed) ? parsed : 0;
};

const money = (value, currency = "AED") =>
  `${currency} ${num(value).toLocaleString("en-AE", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;

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
        String(item.product || "") &&
      String(product.variant_id || "") === String(item.variant || ""),
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

const customerAddress = (customer) =>
  [
    customer?.address,
    customer?.billing_address,
    customer?.address_line1,
    customer?.address_line_1,
    customer?.city,
    customer?.emirate,
    customer?.country,
  ]
    .filter(Boolean)
    .join(", ");

const drawWrappedText = (
  doc,
  text,
  x,
  y,
  width,
  {
    fontSize = 9,
    lineHeight = 4.4,
    color = [71, 85, 105],
    fontStyle = "normal",
  } = {},
) => {
  doc.setFont("helvetica", fontStyle);
  doc.setFontSize(fontSize);
  doc.setTextColor(...color);

  const lines = doc.splitTextToSize(String(text || ""), width);
  doc.text(lines, x, y);

  return y + lines.length * lineHeight;
};

const drawDocumentHeader = (doc, documentType, number, date) => {
  const pageWidth = doc.internal.pageSize.getWidth();

  doc.setFillColor(8, 37, 73);
  doc.rect(0, 0, pageWidth, 42, "F");

  doc.setFillColor(15, 76, 129);
  doc.rect(0, 38, pageWidth, 4, "F");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(18);
  doc.setTextColor(255, 255, 255);
  doc.text(GHAZA_COMPANY.name.toUpperCase(), 15, 16);

  drawWrappedText(doc, GHAZA_COMPANY.address, 15, 23, 112, {
    fontSize: 8.2,
    lineHeight: 4,
    color: [219, 234, 254],
  });

  doc.setFont("helvetica", "bold");
  doc.setFontSize(21);
  doc.setTextColor(255, 255, 255);
  doc.text(documentType, pageWidth - 15, 16, {
    align: "right",
  });

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.5);
  doc.setTextColor(219, 234, 254);
  doc.text(`No: ${clean(number, "DRAFT")}`, pageWidth - 15, 25, {
    align: "right",
  });
  doc.text(`Date: ${clean(date)}`, pageWidth - 15, 31, {
    align: "right",
  });
};

const drawCustomerSection = (
  doc,
  { customer, secondaryLabel, secondaryValue, paymentTerms, customerPo },
) => {
  const pageWidth = doc.internal.pageSize.getWidth();
  const contentWidth = pageWidth - 30;
  const gap = 6;
  const leftWidth = contentWidth * 0.58;
  const rightWidth = contentWidth - leftWidth - gap;
  const top = 50;

  doc.setDrawColor(226, 232, 240);
  doc.setFillColor(248, 250, 252);
  doc.roundedRect(15, top, leftWidth, 39, 2, 2, "FD");
  doc.roundedRect(15 + leftWidth + gap, top, rightWidth, 39, 2, 2, "FD");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.setTextColor(71, 85, 105);
  doc.text("BILL TO", 20, top + 7);

  doc.setFontSize(11.5);
  doc.setTextColor(15, 23, 42);
  doc.text(
    clean(customer?.customer_name || customer?.name, "Customer"),
    20,
    top + 14,
  );

  let customerY = top + 20;

  const contactBits = [
    customer?.contact_person,
    customer?.phone || customer?.phone_number,
    customer?.email,
  ].filter(Boolean);

  if (contactBits.length) {
    customerY = drawWrappedText(
      doc,
      contactBits.join(" | "),
      20,
      customerY,
      leftWidth - 10,
      {
        fontSize: 8,
        lineHeight: 4,
      },
    );
  }

  const addr = customerAddress(customer);
  if (addr) {
    drawWrappedText(doc, addr, 20, customerY, leftWidth - 10, {
      fontSize: 8,
      lineHeight: 4,
    });
  }

  const trn =
    customer?.trn_number || customer?.trn || customer?.tax_registration_number;

  if (trn) {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(71, 85, 105);
    doc.text(`TRN: ${trn}`, 20, top + 34);
  }

  const rightX = 15 + leftWidth + gap + 5;
  const labelX = rightX;
  const valueX = pageWidth - 20;

  const details = [
    [secondaryLabel, secondaryValue],
    ["Payment Terms", paymentTerms],
  ];

  if (customerPo) {
    details.push(["Customer PO", customerPo]);
  }

  details.forEach(([label, value], index) => {
    const y = top + 9 + index * 9;

    doc.setFont("helvetica", "normal");
    doc.setFontSize(7.8);
    doc.setTextColor(100, 116, 139);
    doc.text(clean(label), labelX, y);

    doc.setFont("helvetica", "bold");
    doc.setTextColor(30, 41, 59);

    const valueLines = doc.splitTextToSize(clean(value), rightWidth - 29);

    doc.text(valueLines.slice(0, 2), valueX, y, {
      align: "right",
    });
  });

  return top + 47;
};

const drawTotals = (
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
  },
) => {
  const pageWidth = doc.internal.pageSize.getWidth();
  const boxWidth = 76;
  const x = pageWidth - 15 - boxWidth;
  const hasShipping = num(shippingAmount) !== 0;
  const hasPaid = isInvoice && num(paidAmount) !== 0;

  const rows = [
    ["Subtotal", subtotal],
    ["VAT", vatAmount],
  ];

  if (hasShipping) {
    rows.push(["Shipping", shippingAmount]);
  }

  if (num(discountAmount) !== 0) {
    rows.push(["Discount", -Math.abs(num(discountAmount))]);
  }

  rows.push(["Total", total]);

  if (hasPaid) {
    rows.push(["Paid", -Math.abs(num(paidAmount))]);
    rows.push(["Amount Due", Math.max(0, num(total) - num(paidAmount))]);
  }

  const rowHeight = 8;
  const height = rows.length * rowHeight + 4;

  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(226, 232, 240);
  doc.roundedRect(x, startY, boxWidth, height, 2, 2, "FD");

  rows.forEach(([label, value], index) => {
    const y = startY + 8 + index * rowHeight;
    const isPrimaryTotal = label === "Total" || label === "Amount Due";

    if (isPrimaryTotal) {
      doc.setFillColor(239, 246, 255);
      doc.rect(x + 0.5, y - 5.5, boxWidth - 1, rowHeight, "F");
    }

    doc.setFont("helvetica", isPrimaryTotal ? "bold" : "normal");
    doc.setFontSize(isPrimaryTotal ? 9.5 : 8.5);
    doc.setTextColor(...(isPrimaryTotal ? [8, 71, 132] : [71, 85, 105]));
    doc.text(label, x + 5, y);

    doc.setFont("helvetica", "bold");
    doc.setTextColor(...(isPrimaryTotal ? [8, 71, 132] : [30, 41, 59]));
    doc.text(money(value, currency), pageWidth - 20, y, {
      align: "right",
    });
  });

  return startY + height;
};

const addFooter = (doc) => {
  const pages = doc.getNumberOfPages();

  for (let page = 1; page <= pages; page += 1) {
    doc.setPage(page);

    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();

    doc.setDrawColor(226, 232, 240);
    doc.line(15, pageHeight - 15, pageWidth - 15, pageHeight - 15);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(7.5);
    doc.setTextColor(100, 116, 139);

    doc.text(
      `${GHAZA_COMPANY.name} | ${GHAZA_COMPANY.address}`,
      15,
      pageHeight - 9,
    );

    doc.text(`Page ${page} of ${pages}`, pageWidth - 15, pageHeight - 9, {
      align: "right",
    });
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
  const title = isInvoice ? "TAX INVOICE" : "QUOTATION";
  const doc = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: "a4",
    compress: true,
  });

  drawDocumentHeader(doc, title, documentNumber, date);

  const tableStartY = drawCustomerSection(doc, {
    customer,
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
      index + 1,
      description,
      quantity.toLocaleString("en-AE", {
        maximumFractionDigits: 2,
      }),
      money(price, currency),
      money(lineTotal, currency),
    ];
  });

  autoTable(doc, {
    startY: tableStartY,
    head: [["#", "Description", "Qty", "Unit Price", "Amount"]],
    body: rows.length ? rows : [["-", "No items", "-", "-", "-"]],
    margin: {
      left: 15,
      right: 15,
      bottom: 24,
    },
    styles: {
      font: "helvetica",
      fontSize: 8.3,
      cellPadding: 3,
      textColor: [51, 65, 85],
      lineColor: [226, 232, 240],
      lineWidth: 0.15,
      valign: "middle",
    },
    headStyles: {
      fillColor: [8, 71, 132],
      textColor: [255, 255, 255],
      fontStyle: "bold",
      fontSize: 8,
    },
    alternateRowStyles: {
      fillColor: [248, 250, 252],
    },
    columnStyles: {
      0: {
        cellWidth: 10,
        halign: "center",
      },
      1: {
        cellWidth: "auto",
      },
      2: {
        cellWidth: 20,
        halign: "right",
      },
      3: {
        cellWidth: 31,
        halign: "right",
      },
      4: {
        cellWidth: 34,
        halign: "right",
      },
    },
    didDrawPage: (data) => {
      if (data.pageNumber > 1) {
        doc.setFont("helvetica", "bold");
        doc.setFontSize(8);
        doc.setTextColor(71, 85, 105);
        doc.text(`${title} - ${clean(documentNumber, "DRAFT")}`, 15, 10);
      }
    },
  });

  let cursorY = doc.lastAutoTable.finalY + 7;

  const estimatedTotalHeight = 58 + (notes || deliveryTerms ? 25 : 0);

  const pageHeight = doc.internal.pageSize.getHeight();

  if (cursorY + estimatedTotalHeight > pageHeight - 24) {
    doc.addPage();
    cursorY = 20;
  }

  const totalsEndY = drawTotals(doc, {
    startY: cursorY,
    subtotal,
    vatAmount,
    discountAmount,
    shippingAmount,
    paidAmount,
    total,
    currency,
    isInvoice,
  });

  let noteY = Math.max(cursorY, totalsEndY) + 8;

  if (deliveryTerms) {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);
    doc.setTextColor(51, 65, 85);
    doc.text("DELIVERY TERMS", 15, noteY);

    noteY = drawWrappedText(doc, deliveryTerms, 15, noteY + 5, 100, {
      fontSize: 8,
      lineHeight: 4,
    });
  }

  if (notes) {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);
    doc.setTextColor(51, 65, 85);
    doc.text("NOTES", 15, noteY + 2);

    drawWrappedText(doc, notes, 15, noteY + 7, 100, {
      fontSize: 8,
      lineHeight: 4,
    });
  }

  if (status) {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7.5);
    doc.setTextColor(100, 116, 139);
    doc.text(
      `Document Status: ${String(status).replaceAll("_", " ")}`,
      15,
      pageHeight - 20,
    );
  }

  addFooter(doc);

  const prefix = isInvoice ? "Invoice" : "Quotation";
  const fileNumber = documentNumber || "Draft";
  doc.save(safeFileName(`${prefix}-${fileNumber}.pdf`));
}

export function findSalesCustomer(customers, customerValue) {
  const id = entityId(customerValue);

  return customers.find((customer) => String(customer.id || "") === id) || null;
}
