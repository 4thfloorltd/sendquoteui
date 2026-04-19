import { jsPDF } from "jspdf";
import { lineGross, lineQuantityDisplay } from "./quoteLineCalculations";

function sanitizeFilenameSegment(value, fallback) {
  let s = String(value ?? "").trim();
  if (!s) return fallback;
  s = s
    .replace(/[\\/:*?"<>|]+/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
  return s.slice(0, 96) || fallback;
}

export function getQuotePdfFilename(quoteData) {
  const qnRaw =
    quoteData?.quoteNumber != null && String(quoteData.quoteNumber).trim() !== ""
      ? String(quoteData.quoteNumber).trim()
      : "preview";
  const qn  = sanitizeFilenameSegment(qnRaw, "preview");
  const biz = sanitizeFilenameSegment(quoteData?.businessName, "");
  return biz ? `${biz}-QU-${qn}.pdf` : `quote-QU-${qn}.pdf`;
}

export function buildQuotePdfDocument({
  quoteData,
  lineItems,
  pricing,
  formatMoney,
  formatDateLong,
  vatRegistered = true,
}) {
  const doc   = new jsPDF({ unit: "mm", format: "a4", orientation: "portrait" });
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();

  // Page margins
  const M = { l: 17, r: 17, t: 15, b: 17 };

  const innerR = pageW - M.r;
  const innerW = innerR - M.l;

  const space = { xs: 3, sm: 6, md: 9, lg: 15 };
  const lineH = 5.5;

  // Table column right-edges.  When VAT is hidden the freed 18 mm shifts
  // Qty and Unit price rightward, giving Description more room.
  const colAmtR  = innerR;
  const colVatR  = vatRegistered ? innerR - 32 : null;
  const colQtyR  = vatRegistered ? innerR - 50 : innerR - 32;
  const colUnitR = vatRegistered ? innerR - 68 : innerR - 50;

  const descTextX = M.l + 4.5;
  const descW     = Math.max(28, colUnitR - descTextX - 12);

  // Totals section minimum height: total row only, or subtotal + VAT + divider + total.
  const totalsMinH = vatRegistered ? 32 : 12;

  let y = M.t;

  const newPage     = ()  => { doc.addPage(); y = M.t; };
  const ensureSpace = (h) => { if (y + h > pageH - M.b) newPage(); };

  const drawRule = (yy = y) => {
    doc.setDrawColor(200);
    doc.setLineWidth(0.4);
    doc.line(M.l, yy, innerR, yy);
  };

  // Wraps at word boundaries, then force-breaks any token that still overflows.
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

  // ── HEADER ──────────────────────────────────────────────────────────────────

  const quoteMetaBlock = () => {
    const qn = String(quoteData.quoteNumber ?? "").trim() || "-";
    const qd = String(quoteData.quoteDate   ?? "").trim()
      ? formatDateLong(quoteData.quoteDate)
      : "-";

    doc.setFont("helvetica", "bold");
    doc.setFontSize(15);
    doc.setTextColor(8, 58, 107);
    doc.text("Quote summary", M.l, M.t);

    doc.setFontSize(12);
    doc.setTextColor(55, 65, 81);
    doc.text(`Quote number: QU-${qn}`, M.l, M.t + space.md);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(11);
    doc.setTextColor(100, 116, 139);
    doc.text(`Date: ${qd}`, M.l, M.t + space.lg);

    return M.t + space.lg + space.sm;
  };

  const rightColW = Math.min(95, Math.max(40, innerW * 0.5));

  const issuerBlock = () => {
    const name = String(quoteData.businessName ?? "").trim() || "Your business name";

    let yIss = M.t;

    doc.setFont("helvetica", "bold");
    doc.setFontSize(16);
    doc.setTextColor(8, 58, 107);
    doc.splitTextToSize(name, rightColW).forEach((ln) => {
      doc.text(ln, innerR, yIss, { align: "right" });
      yIss += lineH;
    });

    yIss += space.xs;

    doc.setFont("helvetica", "normal");
    doc.setFontSize(11.5);
    doc.setTextColor(33, 37, 41);

    const email   = String(quoteData.businessEmail   ?? "").trim();
    const address = String(quoteData.businessAddress ?? "").trim();

    const contactLines = [
      email || "Your business email",
      ...( address ? doc.splitTextToSize(address, rightColW) : [] ),
    ];

    contactLines.forEach((ln) => {
      doc.text(ln, innerR, yIss, { align: "right" });
      yIss += lineH;
    });

    return yIss;
  };

  y = Math.max(quoteMetaBlock(), issuerBlock()) + space.md;

  // ── CUSTOMER ────────────────────────────────────────────────────────────────

  drawRule();
  y += space.md;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.setTextColor(75, 85, 99);
  doc.text("Prepared for", M.l, y);

  y += space.md;

  const custName = String(quoteData.customerName ?? "").trim() || "Customer name";
  const custMail = String(quoteData.email        ?? "").trim();

  doc.setFont("helvetica", "normal");
  doc.setFontSize(13);
  doc.setTextColor(33, 37, 41);
  doc.text(custName, M.l, y);
  y += lineH;

  if (custMail) {
    doc.setFontSize(11.5);
    doc.setTextColor(80, 80, 80);
    doc.text(custMail, M.l, y);
    y += lineH;
  }

  y += space.md;

  // ── TABLE ───────────────────────────────────────────────────────────────────

  drawRule();
  y += space.md;

  const printTableHeader = () => {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(14);
    doc.setTextColor(75, 85, 99);

    doc.text("Description",              descTextX, y);
    doc.text("Unit price", colUnitR,     y, { align: "right" });
    doc.text("Qty",        colQtyR,      y, { align: "right" });
    if (vatRegistered) doc.text("VAT %", colVatR, y, { align: "right" });
    doc.text("Amount",     colAmtR,      y, { align: "right" });

    y += space.sm;
    drawRule();
    y += space.md;

    doc.setFont("helvetica", "normal");
    doc.setFontSize(11);
    doc.setTextColor(33, 37, 41);
  };

  printTableHeader();

  for (const item of lineItems) {
    const desc = (
      String(item.description ?? "").trim() ||
      String(item.label       ?? "").trim() ||
      "-"
    );

    const wrapped    = wrapText(desc, descW);
    const textBlockH = wrapped.length * lineH;

    if (y + textBlockH > pageH - M.b - totalsMinH) {
      newPage();
      printTableHeader();
    }

    const rowTop = y;

    doc.text(formatMoney(Number(item.unitPrice ?? item.amount) || 0), colUnitR, rowTop, { align: "right" });
    doc.text(String(lineQuantityDisplay(item)),                        colQtyR,  rowTop, { align: "right" });
    if (vatRegistered) {
      doc.text(`${Number(item.vatPercent ?? 0)}%`, colVatR, rowTop, { align: "right" });
    }
    doc.text(formatMoney(lineGross(item)), colAmtR, rowTop, { align: "right" });

    wrapped.forEach((ln, i) => doc.text(ln, descTextX, rowTop + i * lineH));

    y = rowTop + textBlockH + space.sm;
  }

  // ── TOTALS ──────────────────────────────────────────────────────────────────

  y += space.xs;
  ensureSpace(totalsMinH);

  drawRule();
  y += space.md;

  const labelX      = innerR - 52;
  const totalsRowGap = lineH + space.sm;

  if (vatRegistered) {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(12);
    doc.setTextColor(75, 85, 99);

    doc.text("Subtotal (ex VAT)", labelX,  y, { align: "right" });
    doc.text(formatMoney(pricing.subtotal), innerR, y, { align: "right" });
    y += totalsRowGap;

    doc.text("VAT",               labelX,  y, { align: "right" });
    doc.text(formatMoney(pricing.tax),     innerR, y, { align: "right" });
    y += totalsRowGap;

    doc.setDrawColor(180);
    doc.setLineWidth(0.35);
    doc.line(labelX - 38, y - 1, innerR, y - 1);
    y += 6;
  }

  doc.setFont("helvetica", "bold");
  doc.setFontSize(15);
  doc.setTextColor(8, 58, 107);

  doc.text(vatRegistered ? "Total (inc VAT)" : "Total", labelX,  y, { align: "right" });
  doc.text(formatMoney(pricing.total),                   innerR, y, { align: "right" });

  // ── FOOTER ──────────────────────────────────────────────────────────────────

  const totalPages = doc.getNumberOfPages();
  for (let p = 1; p <= totalPages; p++) {
    doc.setPage(p);
    doc.setFontSize(10);
    doc.setTextColor(150, 150, 150);
    doc.text(`Page ${p} of ${totalPages} · sendquote.ai`, pageW / 2, pageH - 8, { align: "center" });
  }

  return doc;
}
