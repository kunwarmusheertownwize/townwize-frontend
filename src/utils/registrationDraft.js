/**
 * Registration draft persistence.
 *
 * The old draft dropped every uploaded file before saving
 * (`FILE_FIELDS.forEach(f => delete clean[f])`), so closing the app restored the
 * text but silently lost all 16 uploads — with no warning until submit. It also
 * stored the step as a numeric index, which strands anyone mid-registration the
 * moment the step order changes, and it never persisted the phone verification
 * token, so reopening produced "Phone verification is required" with no way back
 * to the phone step.
 *
 * Text and metadata go to localStorage. Files go to IndexedDB, which stores Blob
 * and File natively and has room for them — a Wizer uploads 16 images, which
 * would blow the ~5 MB localStorage budget many times over.
 */

const META_KEY = "tw_reg_draft";
const DB_NAME = "townwize-registration";
const DB_VERSION = 1;
const STORE = "files";

// ── IndexedDB helpers ─────────────────────────────────────────────────────

const openDb = () =>
  new Promise((resolve, reject) => {
    if (!("indexedDB" in window)) return reject(new Error("no indexedDB"));
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE)) db.createObjectStore(STORE);
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });

const withStore = async (mode, fn) => {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, mode);
    const store = tx.objectStore(STORE);
    const out = fn(store);
    tx.oncomplete = () => { db.close(); resolve(out?.result ?? out); };
    tx.onerror = () => { db.close(); reject(tx.error); };
  });
};

// ── Public API ────────────────────────────────────────────────────────────

/**
 * @param {string} role
 * @param {string} stepKey  Stored as a KEY, not an index, so reordering steps
 *                          cannot strand a user on the wrong screen.
 * @param {object} values   Full form values; File entries are split out.
 * @param {string[]} fileFields
 * @param {string} phoneVerificationToken
 */
export const saveDraft = async (role, stepKey, values, fileFields, phoneVerificationToken) => {
  const text = { ...values };
  const files = {};

  for (const field of fileFields) {
    const v = values[field];
    if (v instanceof File || v instanceof Blob) {
      files[field] = v;
      delete text[field];
    } else if (typeof v === "string" && v.startsWith("data:")) {
      // The selfie is a data URL rather than a File — small enough to keep inline.
      text[field] = v;
    } else {
      delete text[field];
    }
  }

  // The five liveness frames are ~650 KB of base64. localStorage is a shared
  // 5 MB origin budget and setItem throws all-or-nothing, so putting them there
  // risks losing the ENTIRE draft — step position and phone token included — to
  // a quota error. IndexedDB stores any structured-cloneable value, and
  // loadDraft spreads this store straight into the form, so it restores itself.
  if (text.selfieAngles && typeof text.selfieAngles === "object") {
    files.selfieAngles = text.selfieAngles;
  }
  delete text.selfieAngles;

  // Never persist the password. localStorage is plain text that outlives the
  // tab, is readable by any script on the origin, and on a shared or family
  // phone hands the next person to open registration someone else's password
  // pre-filled. Register.jsx asks for it again when a draft is resumed.
  delete text.password;

  try {
    localStorage.setItem(
      META_KEY,
      JSON.stringify({ role, stepKey, data: text, phoneVerificationToken: phoneVerificationToken || "" })
    );
  } catch { /* quota — the files are the big things and they are not here */ }

  try {
    await withStore("readwrite", (store) => {
      store.clear();
      for (const [field, file] of Object.entries(files)) store.put(file, field);
    });
  } catch { /* IndexedDB unavailable — text still persists */ }
};

/** @returns {{role, stepKey, data, phoneVerificationToken, files}|null} */
export const loadDraft = async () => {
  let meta = null;
  try {
    meta = JSON.parse(localStorage.getItem(META_KEY) || "null");
  } catch { return null; }
  if (!meta) return null;

  // Drafts saved before passwords were excluded still hold one. Strip it and
  // write the draft back, so the stored copy is cleaned the first time it is
  // read rather than lingering until the registration finishes.
  if (meta.data && "password" in meta.data) {
    delete meta.data.password;
    try { localStorage.setItem(META_KEY, JSON.stringify(meta)); } catch { /* ignore */ }
  }

  const files = {};
  try {
    const db = await openDb();
    await new Promise((resolve) => {
      const tx = db.transaction(STORE, "readonly");
      const store = tx.objectStore(STORE);
      const keysReq = store.getAllKeys();
      const valsReq = store.getAll();
      tx.oncomplete = () => {
        (keysReq.result || []).forEach((k, i) => { files[k] = valsReq.result[i]; });
        db.close();
        resolve();
      };
      tx.onerror = () => { db.close(); resolve(); };
    });
  } catch { /* text-only restore */ }

  return { ...meta, files };
};

export const clearDraft = async () => {
  try { localStorage.removeItem(META_KEY); } catch { /* ignore */ }
  try { await withStore("readwrite", (store) => store.clear()); } catch { /* ignore */ }
};

/**
 * The phone verification token is a short-lived JWT. Decode its expiry without
 * verifying — the server is the authority; this only lets the UI send the user
 * back to the phone step *before* they reach submit, instead of dead-ending
 * there with an error and no route back.
 */
export const isTokenExpired = (token) => {
  if (!token) return true;
  try {
    const [, payload] = token.split(".");
    const { exp } = JSON.parse(atob(payload.replace(/-/g, "+").replace(/_/g, "/")));
    if (!exp) return false;
    return Date.now() >= exp * 1000;
  } catch {
    return false; // unreadable — let the server decide
  }
};
