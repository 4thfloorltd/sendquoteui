import { collection, getDocs, query, where } from "firebase/firestore";
import { FREE_QUOTE_LIMIT } from "../constants/plan";

async function countOpenQuotes(db, uid) {
  const snap = await getDocs(query(collection(db, "quotes"), where("userId", "==", uid)));
  return snap.docs.filter((d) => !d.data().deleted).length;
}

async function countOpenInvoices(db, uid) {
  const snap = await getDocs(query(collection(db, "invoices"), where("userId", "==", uid)));
  return snap.docs.filter((d) => !d.data().deleted).length;
}

/** Free tier: block new invoices when quotes + invoices reach the limit. */
export async function isCombinedFreeTierQuotaExceeded(db, uid) {
  const [q, inv] = await Promise.all([countOpenQuotes(db, uid), countOpenInvoices(db, uid)]);
  return q + inv >= FREE_QUOTE_LIMIT;
}

/** Free tier: block new quotes when quote count alone reaches the limit. */
export async function isQuoteFreeTierQuotaExceeded(db, uid) {
  const n = await countOpenQuotes(db, uid);
  return n >= FREE_QUOTE_LIMIT;
}
