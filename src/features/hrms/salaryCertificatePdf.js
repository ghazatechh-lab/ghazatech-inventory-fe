import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

const n = (value) => Number(value || 0);
const money = (value) =>
  new Intl.NumberFormat("en-AE", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(n(value));

const dateText = (value) => {
  if (!value) return "—";
  const d = new Date(`${String(value).slice(0, 10)}T00:00:00`);
  return Number.isNaN(d.getTime())
    ? String(value)
    : d.toLocaleDateString("en-GB");
};

export function generateSalaryCertificatePdf(certificate, options = {}) {
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const width = doc.internal.pageSize.getWidth();
  const margin = 16;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(30);
  doc.setTextColor(25, 25, 28);
  doc.text("GC", width / 2, 22, { align: "center" });

  doc.setFontSize(11);
  doc.text("GHAZA COMPUTER TRADING LLC", width / 2, 31, { align: "center" });

  doc.setTextColor(204, 35, 40);
  doc.setFontSize(14);
  doc.text("SALARY CERTIFICATE", width / 2, 44, { align: "center" });

  doc.setTextColor(80, 80, 85);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.text(`Reference No.: ${certificate.reference_number || "—"}`, margin, 56);
  doc.text(
    `Date: ${dateText(certificate.certificate_date)}`,
    width - margin,
    56,
    {
      align: "right",
    },
  );

  doc.setTextColor(30, 30, 34);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.text("TO WHOM IT MAY CONCERN", margin, 70);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(10.5);
  const intro =
    "This is to certify that the following employee is currently employed with Ghaza Computer Trading LLC under the employment details stated below.";
  doc.text(doc.splitTextToSize(intro, width - margin * 2), margin, 79);

  autoTable(doc, {
    startY: 91,
    margin: { left: margin, right: margin },
    theme: "grid",
    body: [
      ["Employee Name", certificate.employee_name || "—"],
      ["Passport / Emirates ID No.", certificate.identity_number || "—"],
      ["Designation", certificate.designation_name || "—"],
      ["Date of Joining", dateText(certificate.joining_date)],
    ],
    styles: { fontSize: 9.5, cellPadding: 3 },
    columnStyles: {
      0: { fontStyle: "bold", fillColor: [246, 247, 249], cellWidth: 77 },
    },
  });

  let y = doc.lastAutoTable.finalY + 8;
  doc.text(
    "The employee’s current monthly salary is structured as follows:",
    margin,
    y,
  );

  autoTable(doc, {
    startY: y + 5,
    margin: { left: margin, right: margin },
    theme: "grid",
    head: [["Salary Component", "Amount (AED)"]],
    body: [
      ["Basic Salary", money(certificate.basic_salary)],
      [
        "Housing / Accommodation Allowance",
        money(certificate.housing_allowance),
      ],
      [
        "Transport / Other Allowance",
        money(certificate.transport_other_allowance),
      ],
      ["Total Monthly Salary", money(certificate.total_monthly_salary)],
    ],
    styles: { fontSize: 9.5, cellPadding: 3 },
    headStyles: {
      fillColor: [33, 33, 36],
      textColor: [255, 255, 255],
      fontStyle: "bold",
    },
    columnStyles: { 1: { halign: "right" } },
    didParseCell(data) {
      if (data.section === "body" && data.row.index === 3) {
        data.cell.styles.fontStyle = "bold";
        data.cell.styles.fillColor = [255, 247, 247];
      }
    },
  });

  y = doc.lastAutoTable.finalY + 8;
  const note =
    "This certificate is issued at the employee’s request for official purposes. The company assumes no responsibility beyond confirming the employment and salary information stated above.";
  doc.setTextColor(35, 35, 38);
  doc.text(doc.splitTextToSize(note, width - margin * 2), margin, y);

  y += 22;
  doc.setFont("helvetica", "bold");
  doc.text("For Ghaza Computer Trading LLC", margin, y);
  y += 12;

  const valueX = margin + 76;
  [
    ["Authorized Signatory", certificate.authorized_signatory || "—"],
    ["Designation", certificate.signatory_designation || "—"],
    ["Company Stamp", " "],
  ].forEach(([label, value], index) => {
    doc.setFont("helvetica", "bold");
    doc.text(label, margin, y + index * 10);
    doc.setFont("helvetica", "normal");
    doc.text(value, valueX, y + index * 10);
  });

  doc.setDrawColor(220, 220, 220);
  doc.line(margin, 282, width - margin, 282);
  doc.setFontSize(8.5);
  doc.setTextColor(105, 105, 110);
  doc.text(
    "Ghaza Computer Trading LLC  |  Salary Certificate",
    width / 2,
    288,
    {
      align: "center",
    },
  );

  if (options.returnDoc) return doc;
  doc.save(
    options.filename ||
      `${certificate.reference_number || "Salary-Certificate"}.pdf`,
  );
}
