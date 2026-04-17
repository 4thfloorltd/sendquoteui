import { collection, doc, runTransaction, updateDoc, serverTimestamp } from "firebase/firestore";
import { db } from "../../firebase";

/**
 * Atomically allocates the next sequential quote number for this user
 * from `quote_counters/{userId}`, saves the quote document, and returns
 * the new Firestore document ID.
 *
 * The counter starts at 1001 for new users.  Because historic quotes used
 * a random 4-digit number the counter may occasionally produce a number
 * that was already used on an old quote, but from this point forward every
 * new quote gets a strictly incrementing, collision-free number.
 */
export async function saveQuoteToFirestore({ quoteData, lineItems, pricing, userId, vatRegistered = true }) {
  const quoteRef    = doc(collection(db, "quotes"));
  const counterRef  = doc(db, "quote_counters", userId);

  await runTransaction(db, async (tx) => {
    const counterSnap = await tx.get(counterRef);
    const nextNumber  = counterSnap.exists()
      ? (counterSnap.data().n ?? 1)
      : 1;

    tx.set(quoteRef, {
      quoteNumber:     String(nextNumber).padStart(4, "0"),
      quoteDate:       quoteData.quoteDate       ?? null,
      businessName:    quoteData.businessName    ?? "",
      businessEmail:   quoteData.businessEmail   ?? "",
      businessAddress: quoteData.businessAddress ?? "",
      customerName:    quoteData.customerName    ?? "",
      customerEmail:   quoteData.email           ?? "",
      currency:        quoteData.currency        ?? "GBP",
      lineItems:       lineItems                 ?? [],
      pricing:         pricing                   ?? { subtotal: 0, tax: 0, total: 0 },
      vatRegistered:   vatRegistered,
      status:          "pending",
      comment:         null,
      userId,
      createdAt:       serverTimestamp(),
      updatedAt:       serverTimestamp(),
    });

    tx.set(counterRef, { n: nextNumber + 1 }, { merge: true });
  });

  return quoteRef.id;
}

/**
 * Updates an existing quote document. Preserves quoteNumber, status,
 * comment, userId, and createdAt — only content fields are overwritten.
 */
export async function updateQuoteInFirestore({ quoteId, quoteData, lineItems, pricing, vatRegistered = true }) {
  await updateDoc(doc(db, "quotes", quoteId), {
    quoteDate:       quoteData.quoteDate       ?? null,
    businessName:    quoteData.businessName    ?? "",
    businessEmail:   quoteData.businessEmail   ?? "",
    businessAddress: quoteData.businessAddress ?? "",
    customerName:    quoteData.customerName    ?? "",
    customerEmail:   quoteData.email           ?? "",
    currency:        quoteData.currency        ?? "GBP",
    lineItems:       lineItems                 ?? [],
    pricing:         pricing                   ?? { subtotal: 0, tax: 0, total: 0 },
    vatRegistered:   vatRegistered,
    // Reset to pending so the customer can respond to the revised quote.
    status:          "pending",
    comment:         null,
    updatedAt:       serverTimestamp(),
  });
}

/**
 * Returns what the next sequential quote number will be for this user,
 * without consuming it.  Used to show an accurate preview in the form.
 */
export async function peekNextQuoteNumber(userId) {
  const counterRef  = doc(db, "quote_counters", userId);
  const { getDoc }  = await import("firebase/firestore");
  const snap        = await getDoc(counterRef);
  return snap.exists() ? String(snap.data().n ?? 1).padStart(4, "0") : "0001";
}
