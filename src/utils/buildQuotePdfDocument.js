import { jsPDF } from "jspdf";
import { lineGross, lineQuantityDisplay } from "./quoteLineCalculations";

/** Strip characters unsafe in file names; collapse spaces to hyphens. */
function sanitizeFilenameSegment(value, fallback) {
  let s = String(value ?? "").trim();
  if (!s) return fallback;
  s = s
    .replace(/[\\/:*?"<>|]+/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
  const cut = s.slice(0, 96);
  return cut || fallback;
}

/**
 * Download filename: `{business}-QU-{quoteNumber}.pdf`, or `quote-QU-{quoteNumber}.pdf` if no business name.
 */
export function getQuotePdfFilename(quoteData) {
  const qnRaw =
    quoteData?.quoteNumber != null && String(quoteData.quoteNumber).trim() !== ""
      ? String(quoteData.quoteNumber).trim()
      : "preview";
  const qn = sanitizeFilenameSegment(qnRaw, "preview");
  const biz = sanitizeFilenameSegment(quoteData?.businessName, "");
  if (biz) {
    return `${biz}-QU-${qn}.pdf`;
  }
  return `quote-QU-${qn}.pdf`;
}

export function buildQuotePdfDocument({
  quoteData,
  lineItems,
  pricing,
  formatMoney,
  formatDateLong,
}) {
  const doc = new jsPDF({ unit: "mm", format: "a4", orientation: "portrait" });

  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();

  const M = { l: 17, r: 17, t: 15, b: 17 };
  const innerR = pageW - M.r;
  const innerW = innerR - M.l;

  // Increased base spacing for accessibility as well
  const space = {
    xs: 3,
    sm: 6,
    md: 9,
    lg: 15,
  };

  const colAmtR = innerR;
  const colVatR = innerR - 32;
  const colQtyR = innerR - 50;
  const colUnitR = innerR - 68;

  const descBulletX = M.l;
  const descTextX = M.l + 4.5;
  // 12 mm gap before the unit-price column prevents any overlap.
  const descW = Math.max(28, colUnitR - descTextX - 12);

  // Wraps text at word boundaries, then force-breaks any single token that
  // still exceeds maxW (e.g. long URLs or unbroken strings).
  const wrapText = (text, maxW) => {
    const wordWrapped = doc.splitTextToSize(text, maxW);
    const result = [];
    for (const line of wordWrapped) {
      if (doc.getTextWidth(line) <= maxW) {
        result.push(line);
      } else {
        let current = "";
        for (const char of line) {
          if (doc.getTextWidth(current + char) > maxW) {
            if (current) result.push(current);
            current = char;
          } else {
            current += char;
          }
        }
        if (current) result.push(current);
      }
    }
    return result;
  };

  const totalsMinH = 32;

  // Increased accessible line height
  const lineH = 5.5;

  let y = M.t;

  const newPage = () => {
    doc.addPage();
    y = M.t;
  };

  const ensureSpace = (h) => {
    if (y + h > pageH - M.b) newPage();
  };

  const drawRule = (yy = y) => {
    doc.setDrawColor(200);
    doc.setLineWidth(0.4);
    doc.line(M.l, yy, innerR, yy);
  };

  const rightColW = Math.min(95, Math.max(40, innerW * 0.5));

  // ---------------- HEADER ----------------

  const quoteMetaBlock = () => {
    const qn =
      quoteData.quoteNumber != null &&
      typeof quoteData.quoteNumber !== "undefined" &&
      String(quoteData.quoteNumber).trim() !== ""
        ? String(quoteData.quoteNumber).trim()
        : "—";

    const qd =
      quoteData.quoteDate && String(quoteData.quoteDate).trim() !== ""
        ? formatDateLong(quoteData.quoteDate)
        : "—";

    const startY = M.t;

    doc.setFont("helvetica", "bold");
    doc.setFontSize(15); // Increase for accessibility
    doc.setTextColor(8, 58, 107);
    doc.text("Quote summary", M.l, startY);

    doc.setFontSize(12);
    doc.setTextColor(55, 65, 81);
    doc.text(`Quote number: QU-${qn}`, M.l, startY + space.md);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(11);
    doc.setTextColor(100, 116, 139);
    doc.text(`Date: ${qd}`, M.l, startY + space.lg);

    return startY + space.lg + space.sm;
  };

  const issuerBlock = () => {
    // Use placeholder only if businessName is missing, empty, or made of only whitespace:
    let name =
      typeof quoteData.businessName === "string" && quoteData.businessName.trim() !== ""
        ? quoteData.businessName.trim()
        : "Your business name";

    let yIss = M.t;

    doc.setFont("helvetica", "bold");
    doc.setFontSize(16); // Increased
    doc.setTextColor(8, 58, 107);

    const nameLines = doc.splitTextToSize(name, rightColW);

    nameLines.forEach((ln) => {
      doc.text(ln, innerR, yIss, { align: "right" });
      yIss += lineH;
    });

    yIss += space.xs;

    doc.setFont("helvetica", "normal");
    doc.setFontSize(11.5); // Increased
    doc.setTextColor(33, 37, 41);

    const contact = [];

    // Business email placeholder
    if (
      typeof quoteData.businessEmail === "string" &&
      quoteData.businessEmail.trim() !== ""
    ) {
      contact.push(quoteData.businessEmail.trim());
    } else {
      contact.push("Your business email");
    }

    // Business phone placeholder
    // if (
    //   typeof quoteData.businessPhone === "string" &&
    //   quoteData.businessPhone.trim() !== ""
    // ) {
    //   contact.push(quoteData.businessPhone.trim());
    // } else {
    //   contact.push("Your business phone");
    // }

    // Business address placeholder
    const addressLines =
      typeof quoteData.businessAddress === "string" &&
      quoteData.businessAddress.trim() !== ""
        ? doc.splitTextToSize(quoteData.businessAddress.trim(), rightColW)
        : [];

    contact.push(...addressLines);

    contact.forEach((ln) => {
      doc.text(ln, innerR, yIss, { align: "right" });
      yIss += lineH;
    });

    return yIss;
  };

  const metaBottom = quoteMetaBlock();
  const issuerBottom = issuerBlock();

  y = Math.max(metaBottom, issuerBottom) + space.md;

  // ---------------- CUSTOMER ----------------

  drawRule();
  y += space.md;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(12); // Increased
  doc.setTextColor(75, 85, 99);
  doc.text("Prepared for", M.l, y);

  y += space.md;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(13); // Increased
  doc.setTextColor(33, 37, 41);

  // Customer name placeholder
  const cust =
    typeof quoteData.customerName === "string" &&
    quoteData.customerName.trim() !== ""
      ? quoteData.customerName.trim()
      : "Customer name";
  const custMail =
    typeof quoteData.email === "string" && quoteData.email.trim() !== ""
      ? quoteData.email.trim()
      : "";

  doc.text(cust, M.l, y);
  y += lineH;

  doc.setFontSize(11.5); // Increased
  doc.setTextColor(80, 80, 80);
  doc.text(custMail, M.l, y);

  y += lineH + space.md;

  // ---------------- TABLE ----------------

  drawRule();
  y += space.md;

  const printTableHeader = () => {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(14); // Increased
    doc.setTextColor(75, 85, 99);

    doc.text("Description", descTextX, y);
    doc.text("Unit price", colUnitR, y, { align: "right" });
    doc.text("Qty", colQtyR, y, { align: "right" });
    doc.text("VAT %", colVatR, y, { align: "right" });
    doc.text("Amount", colAmtR, y, { align: "right" });

    y += space.sm;
    drawRule();
    y += space.md;

    doc.setFont("helvetica", "normal");
    doc.setFontSize(11); // Increased
    doc.setTextColor(33, 37, 41);
  };

  printTableHeader();

  for (const item of lineItems) {
    // Description placeholder
    const desc =
      typeof item.description === "string" && item.description.trim() !== ""
        ? item.description.trim()
        : (typeof item.label === "string" && item.label.trim() !== "" ? item.label.trim() : "—");

    const wrapped = wrapText(desc, descW);
    const textBlockH = wrapped.length * lineH;

    if (y + textBlockH > pageH - M.b - totalsMinH) {
      newPage();
      printTableHeader();
    }

    const rowTop = y;

    doc.text(formatMoney(Number(item.unitPrice ?? item.amount) || 0), colUnitR, rowTop, { align: "right" });
    doc.text(String(lineQuantityDisplay(item)), colQtyR, rowTop, { align: "right" });
    doc.text(`${Number(item.vatPercent ?? 0)}%`, colVatR, rowTop, { align: "right" });
    doc.text(formatMoney(lineGross(item)), colAmtR, rowTop, { align: "right" });

    wrapped.forEach((ln, i) => {
      doc.text(ln, descTextX, rowTop + i * lineH);
    });

    y = rowTop + textBlockH + space.sm;
  }

  // ---------------- TOTALS ----------------

  y += space.xs;

  ensureSpace(totalsMinH);

  drawRule();
  y += space.md;

  const labelX = innerR - 52;
  const amtX = innerR;
  const totalsRowGap = lineH + space.sm;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(12);
  doc.setTextColor(75, 85, 99);
  doc.text("Subtotal (ex VAT)", labelX, y, { align: "right" });
  doc.text(formatMoney(pricing.subtotal), amtX, y, { align: "right" });

  y += totalsRowGap;

  doc.text("VAT", labelX, y, { align: "right" });
  doc.text(formatMoney(pricing.tax), amtX, y, { align: "right" });

  y += totalsRowGap;

  doc.setDrawColor(180);
  doc.setLineWidth(0.35);
  doc.line(labelX - 38, y - 1, innerR, y - 1);

  y += 6;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(15);
  doc.setTextColor(8, 58, 107);

  doc.text("Total (inc VAT)", labelX, y, { align: "right" });
  doc.text(formatMoney(pricing.total), amtX, y, { align: "right" });

  // ---------------- FOOTER ----------------

  const totalPages = doc.getNumberOfPages();

  for (let p = 1; p <= totalPages; p++) {
    doc.setPage(p);
    doc.setFontSize(10); // Increased
    doc.setTextColor(150, 150, 150);

    doc.text(
      `Page ${p} of ${totalPages} · sendquote.ai`,
      pageW / 2,
      pageH - 8,
      { align: "center" }
    );
  }

  return doc;
}