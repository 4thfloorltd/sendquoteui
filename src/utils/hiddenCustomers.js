import { arrayRemove, arrayUnion, doc, setDoc, serverTimestamp } from "firebase/firestore";
import { db } from "../../firebase";

/**
 * Hide a customer key from Customers list and quote autocomplete.
 * Quotes/invoices are left unchanged.
 */
export async function hideCustomerKey(userId, customerKey) {
  const key = String(customerKey ?? "").trim();
  if (!userId || !key) return;
  await setDoc(
    doc(db, "users", userId),
    {
      hiddenCustomerKeys: arrayUnion(key),
      updatedAt: serverTimestamp(),
    },
    { merge: true },
  );
}

/**
 * Unhide a customer key (e.g. after creating a new quote/invoice with the same details).
 * No-op if the key is not hidden.
 */
export async function unhideCustomerKey(userId, customerKey) {
  const key = String(customerKey ?? "").trim();
  if (!userId || !key) return;
  try {
    await setDoc(
      doc(db, "users", userId),
      {
        hiddenCustomerKeys: arrayRemove(key),
        updatedAt: serverTimestamp(),
      },
      { merge: true },
    );
  } catch (e) {
    console.warn("unhideCustomerKey failed (non-critical)", e);
  }
}
