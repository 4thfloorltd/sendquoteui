import { collection, doc, getDoc, runTransaction, updateDoc, serverTimestamp } from "firebase/firestore";
import { db } from "../../firebase";
import { getCustomerKeyFromQuoteData } from "./customerRecords";
import { unhideCustomerKey } from "./hiddenCustomers";

/**
 * Atomically allocates the next sequential invoice number from `invoice_counters/{userId}`,
 * saves the invoice document, and returns the new document id plus the allocated invoice number.
 */
export async function saveInvoiceToFirestore({ quoteData, lineItems, pricing, userId, vatRegistered = true }) {
  const invoiceRef = doc(collection(db, "invoices"));
  const counterRef = doc(db, "invoice_counters", userId);
  let invoiceNumber = "0001";

  await runTransaction(db, async (tx) => {
    const counterSnap = await tx.get(counterRef);
    const nextNumber = counterSnap.exists()
      ? (counterSnap.data().n ?? 1)
      : 1;

    invoiceNumber = String(nextNumber).padStart(4, "0");

    tx.set(invoiceRef, {
      invoiceNumber,
      invoiceDate:     quoteData.quoteDate       ?? null,
      businessName:    quoteData.businessName    ?? "",
      businessPhone:   quoteData.businessPhone   ?? "",
      businessEmail:   quoteData.businessEmail   ?? "",
      businessAddress: quoteData.businessAddress ?? "",
      businessLogoUrl: quoteData.businessLogoUrl  ?? "",
      businessLogoPath: quoteData.businessLogoPath ?? "",
      bankName:            quoteData.bankName            ?? "",
      bankAccountNumber:  quoteData.bankAccountNumber   ?? "",
      bankSortCode:       quoteData.bankSortCode        ?? "",
      customerName:    quoteData.customerName    ?? "",
      customerEmail:   quoteData.email           ?? "",
      customerPhone:   quoteData.phone           ?? "",
      currency:        quoteData.currency        ?? "GBP",
      lineItems:       lineItems                 ?? [],
      pricing:         pricing                   ?? { subtotal: 0, tax: 0, total: 0 },
      vatRegistered:   vatRegistered,
      status:          "unpaid",
      userId,
      createdAt:       serverTimestamp(),
      updatedAt:       serverTimestamp(),
    });

    tx.set(counterRef, { n: nextNumber + 1 }, { merge: true });
  });

  await unhideCustomerKey(userId, getCustomerKeyFromQuoteData(quoteData));

  return { id: invoiceRef.id, invoiceNumber };
}

/**
 * Updates an existing invoice. Preserves invoiceNumber, status, userId, sourceQuoteId, and createdAt.
 */
export async function updateInvoiceInFirestore({ invoiceId, quoteData, lineItems, pricing, vatRegistered = true }) {
  await updateDoc(doc(db, "invoices", invoiceId), {
    invoiceDate:     quoteData.quoteDate       ?? null,
    businessName:    quoteData.businessName    ?? "",
    businessPhone:   quoteData.businessPhone   ?? "",
    businessEmail:   quoteData.businessEmail   ?? "",
    businessAddress: quoteData.businessAddress ?? "",
    businessLogoUrl: quoteData.businessLogoUrl  ?? "",
    businessLogoPath: quoteData.businessLogoPath ?? "",
    bankName:            quoteData.bankName            ?? "",
    bankAccountNumber:  quoteData.bankAccountNumber   ?? "",
    bankSortCode:       quoteData.bankSortCode        ?? "",
    customerName:    quoteData.customerName    ?? "",
    customerEmail:   quoteData.email           ?? "",
    customerPhone:   quoteData.phone           ?? "",
    currency:        quoteData.currency        ?? "GBP",
    lineItems:       lineItems                 ?? [],
    pricing:         pricing                   ?? { subtotal: 0, tax: 0, total: 0 },
    vatRegistered:   vatRegistered,
    updatedAt:       serverTimestamp(),
  });
}

export async function peekNextInvoiceNumber(userId) {
  try {
    const snap = await getDoc(doc(db, "invoice_counters", userId));
    return snap.exists() ? String(snap.data().n ?? 1).padStart(4, "0") : "0001";
  } catch (e) {
    console.warn("peekNextInvoiceNumber: could not read invoice_counters (deploy rules for invoice_counters?)", e);
    return "0001";
  }
}
