import { fetchSignInMethodsForEmail } from "firebase/auth";
import { getFunctions, httpsCallable } from "firebase/functions";
import { collection, getDocs, query, where } from "firebase/firestore";

/**
 * Returns true if `normalizedEmail` is already claimed by a *different* user.
 *
 * Primary path  — calls the `checkEmailAvailability` Cloud Function which uses
 *   the Admin SDK and is immune to client-side email enumeration protection and
 *   Firestore security rules that block cross-user reads.
 *
 * Fallback path — if the Cloud Function call fails for any reason, falls back to
 *   the client-side checks (fetchSignInMethodsForEmail + Firestore queries).
 *   Both client-side checks silently return false on error so a transient failure
 *   never blocks a legitimate save; Firebase will surface a genuine duplicate as
 *   auth/email-already-in-use during the verifyBeforeUpdateEmail step.
 */
export async function isEmailClaimedByAnotherUser(auth, db, normalizedEmail, currentUid) {
  const e = normalizedEmail.trim().toLowerCase();
  if (!e) return false;

  // The user's own Firebase Auth email is never a conflict.
  if (auth.currentUser?.email?.toLowerCase() === e) return false;

  // Primary: Cloud Function (Admin SDK — bypasses enumeration protection & rules).
  try {
    const functions = getFunctions();
    const check = httpsCallable(functions, "checkEmailAvailability");
    const result = await check({ email: e });
    return Boolean(result.data?.claimed);
  } catch (e) {
    console.warn("checkEmailAvailability Cloud Function failed, falling back to client checks", e);
  }

  // Fallback: client-side Firestore query (may be blocked by security rules).
  const firestoreCheck = Promise.all([
    getDocs(query(collection(db, "users"), where("businessEmail", "==", e))),
    getDocs(query(collection(db, "users"), where("loginEmail",    "==", e))),
  ]).then(([snapBiz, snapLogin]) => {
    const ids = new Set();
    snapBiz.forEach((d)  => ids.add(d.id));
    snapLogin.forEach((d) => ids.add(d.id));
    return [...ids].some((id) => id !== currentUid);
  }).catch(() => false);

  // Fallback: Firebase Auth check (returns [] when enumeration protection is ON).
  const authCheck = fetchSignInMethodsForEmail(auth, e)
    .then((methods) => Boolean(methods?.length))
    .catch(() => false);

  const [firestoreClaimed, authClaimed] = await Promise.all([firestoreCheck, authCheck]);
  return firestoreClaimed || authClaimed;
}

/**
 * True if `normalizedEmail` is already used by *any* active Firebase Auth
 * account (used for the guest quote flow where there is no currentUid).
 *
 * Uses the Admin SDK Cloud Function as primary check so that Firebase's
 * email-enumeration protection doesn't cause false negatives.
 */
export async function emailHasRegisteredAccount(auth, db, normalizedEmail) {
  const e = normalizedEmail.trim().toLowerCase();
  if (!e) return false;

  // Signed-in user's own email is never treated as "another account".
  if (auth.currentUser?.email?.toLowerCase() === e) return false;

  // Primary: guest-safe Cloud Function (Admin SDK — bypasses enumeration protection,
  // no auth required so works in the unauthenticated quote flow).
  try {
    const fns = getFunctions();
    const check = httpsCallable(fns, "checkEmailRegistered");
    const result = await check({ email: e });
    if (result.data?.registered) return true;
    // Cloud Function says not registered — trust it.
    return false;
  } catch {
    // Function unavailable — fall through to client-side checks.
  }

  // Fallback: fetchSignInMethodsForEmail (may return [] when enumeration protection is on).
  try {
    const methods = await fetchSignInMethodsForEmail(auth, e);
    if (methods?.length > 0) return true;
  } catch {
    // Enumeration protection active — fall back to Firestore.
  }

  return isEmailClaimedByAnotherUser(auth, db, e, "");
}
