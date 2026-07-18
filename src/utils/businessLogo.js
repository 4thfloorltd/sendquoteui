import { deleteObject, getBytes, getDownloadURL, ref, uploadBytes } from "firebase/storage";
import { storage } from "../../firebase";

export const BUSINESS_LOGO_MAX_MB = 2;
export const BUSINESS_LOGO_TYPES = ["image/png", "image/jpeg", "image/webp"];

/**
 * Upload a business logo for the signed-in user.
 * @returns {{ businessLogoUrl: string, businessLogoPath: string }}
 */
export async function uploadBusinessLogo(userId, file) {
  if (!userId || !file) throw new Error("Missing user or file");
  const ext = (file.name.split(".").pop() || "png").toLowerCase().replace(/[^a-z0-9]/g, "") || "png";
  const path = `business_logos/${userId}/logo.${ext}`;
  const storageRef = ref(storage, path);
  await uploadBytes(storageRef, file, { contentType: file.type || "image/png" });
  const url = await getDownloadURL(storageRef);
  return { businessLogoUrl: url, businessLogoPath: path };
}

/** Remove a logo object from Storage (ignores not-found). */
export async function deleteBusinessLogo(path) {
  const p = String(path ?? "").trim();
  if (!p) return;
  try {
    await deleteObject(ref(storage, p));
  } catch (e) {
    if (e?.code !== "storage/object-not-found") throw e;
  }
}

function bytesToDataUrl(bytes, mime = "image/png") {
  const blob = new Blob([bytes], { type: mime });
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ""));
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

function mimeFromPathOrUrl(pathOrUrl) {
  const s = String(pathOrUrl ?? "").toLowerCase();
  if (s.includes(".jpg") || s.includes(".jpeg")) return "image/jpeg";
  if (s.includes(".webp")) return "image/webp";
  if (s.includes(".gif")) return "image/gif";
  return "image/png";
}

/**
 * Load a business logo as a data URL for jsPDF (auth getBytes, then URL fetch).
 * @param {{ businessLogoPath?: string, businessLogoUrl?: string }} source
 * @returns {Promise<string|null>}
 */
export async function loadBusinessLogoDataUrl(source) {
  const path = String(source?.businessLogoPath ?? "").trim();
  const url = String(source?.businessLogoUrl ?? "").trim();
  if (!path && !url) return null;

  if (path) {
    try {
      const bytes = await getBytes(ref(storage, path));
      return await bytesToDataUrl(bytes, mimeFromPathOrUrl(path));
    } catch (e) {
      console.warn("loadBusinessLogoDataUrl getBytes failed, trying URL", e);
    }
  }

  if (!url) return null;

  try {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const blob = await res.blob();
    return await new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result || ""));
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  } catch (e) {
    console.warn("loadBusinessLogoDataUrl fetch failed", e);
    return null;
  }
}

export function validateBusinessLogoFile(file) {
  if (!file) return "Please choose an image file.";
  if (!BUSINESS_LOGO_TYPES.includes(file.type)) {
    return "Only PNG, JPG or WebP logos are accepted.";
  }
  if (file.size > BUSINESS_LOGO_MAX_MB * 1024 * 1024) {
    return `Logo is too large. Maximum size is ${BUSINESS_LOGO_MAX_MB} MB.`;
  }
  return "";
}
