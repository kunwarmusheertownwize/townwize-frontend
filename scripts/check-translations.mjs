/**
 * Do the two locale files still agree?
 *
 * A missing Urdu key does not crash and does not show a raw key name — the
 * i18next fallback quietly serves the English sentence instead. So an Urdu
 * screen can rot one string at a time with nothing to show for it, which is
 * exactly what happens while 62 screens are being translated.
 *
 * This compares the key sets and fails loudly. Run it before shipping any
 * translation work.
 *
 * Usage:  node scripts/check-translations.mjs
 */
import en from "../src/locales/en.js";
import ur from "../src/locales/ur.js";

const E = en.translation || {};
const U = ur.translation || {};

const enKeys = Object.keys(E);
const urKeys = Object.keys(U);

const missing = enKeys.filter((k) => !(k in U));
const extra = urKeys.filter((k) => !(k in E));

/* An Urdu value identical to the English one is almost always an untranslated
 * placeholder rather than a word that happens to be the same. Reported as a
 * warning, not a failure: a handful genuinely do match — brand names, "OK". */
const untranslated = enKeys.filter(
    (k) => k in U && String(U[k]).trim() === String(E[k]).trim() && String(E[k]).trim() !== ""
);

console.log(`\nTRANSLATION PARITY\n`);
console.log(`  en keys   ${enKeys.length}`);
console.log(`  ur keys   ${urKeys.length}`);

if (missing.length) {
    console.log(`\n🔴 MISSING FROM URDU (${missing.length}) — these silently show English:`);
    for (const k of missing) console.log(`     ${k.padEnd(28)} "${E[k]}"`);
}
if (extra.length) {
    console.log(`\n⚠️  IN URDU BUT NOT ENGLISH (${extra.length}) — dead keys, or a typo:`);
    for (const k of extra) console.log(`     ${k}`);
}
if (untranslated.length) {
    console.log(`\n⚠️  IDENTICAL IN BOTH (${untranslated.length}) — probably untranslated:`);
    for (const k of untranslated.slice(0, 20)) console.log(`     ${k.padEnd(28)} "${E[k]}"`);
}

if (!missing.length && !extra.length) {
    console.log(`\n  ✅ key sets match exactly\n`);
}

// Only a genuine gap fails. "Identical in both" is a hint, not an error.
process.exit(missing.length || extra.length ? 1 : 0);
