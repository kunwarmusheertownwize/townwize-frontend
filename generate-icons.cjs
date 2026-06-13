// generate-icons.cjs
const sharp = require("sharp");
const fs = require("fs");
const path = require("path");

const outputDir = path.join(__dirname, "public");

// sources
const iconSource = path.join(outputDir, "logo-icon-transparent-bg.png"); // orbit O icon
const wordmarkSource = path.join(outputDir, "logo.png"); // full wordmark (light mode)

if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}

// helper: rounded corner mask
function roundedMask(size, radius = size * 0.25) {
  return Buffer.from(`
    <svg width="${size}" height="${size}">
      <rect x="0" y="0" width="${size}" height="${size}" rx="${radius}" ry="${radius}" />
    </svg>
  `);
}

// --------------------
// Favicons / App Icons
// --------------------
const icons = [
  { name: "favicon-16x16.png", size: 16 },
  { name: "favicon-32x32.png", size: 32 },
  { name: "favicon-48x48.png", size: 48 },
  { name: "favicon-96x96.png", size: 96 },
  { name: "android-chrome-192x192.png", size: 192 },
  { name: "android-chrome-512x512.png", size: 512 },
  { name: "apple-touch-icon.png", size: 180 },
  { name: "apple-touch-icon-120x120.png", size: 120 },
  { name: "apple-touch-icon-152x152.png", size: 152 },
  { name: "apple-touch-icon-167x167.png", size: 167 },
  { name: "apple-touch-icon-180x180.png", size: 180 },
  { name: "mstile-150x150.png", size: 150 }
];

async function generateIcons() {
  for (const icon of icons) {
    const size = icon.size;
    await sharp(iconSource)
      .resize(size, size)
      .png() // ✅ keep transparency
      .toFile(path.join(outputDir, icon.name));
    console.log(`✅ Generated ${icon.name}`);
  }

  // favicon.ico (multi-size, transparent)
  await sharp(iconSource)
    .resize(48, 48)
    .png()
    .toFile(path.join(outputDir, "favicon.ico"));
  console.log("✅ Generated favicon.ico");
}

// --------------------
// Splash Screens (solid bg)
// --------------------
const splashScreens = [
  { name: "splash-640x1136.png", w: 640, h: 1136 },
  { name: "splash-750x1334.png", w: 750, h: 1334 },
  { name: "splash-1125x2436.png", w: 1125, h: 2436 },
  { name: "splash-1242x2208.png", w: 1242, h: 2208 },
  { name: "splash-1536x2048.png", w: 1536, h: 2048 },
  { name: "splash-1668x2224.png", w: 1668, h: 2224 },
  { name: "splash-2048x2732.png", w: 2048, h: 2732 }
];

async function generateSplash() {
  for (const splash of splashScreens) {
    const logoSize = Math.floor(splash.w * 0.85);

    const resizedLogo = await sharp(iconSource)
      .resize(logoSize, logoSize, { fit: "contain" })
      .flatten({ background: "#FFFFFF" }) // ✅ splash must be solid
      .png()
      .toBuffer();

    await sharp({
      create: {
        width: splash.w,
        height: splash.h,
        channels: 4,
        background: "#FFFFFF"
      }
    })
      .composite([
        {
          input: resizedLogo,
          top: Math.floor((splash.h - logoSize) / 2),
          left: Math.floor((splash.w - logoSize) / 2)
        }
      ])
      .png()
      .toFile(path.join(outputDir, splash.name));

    console.log(`✅ Generated ${splash.name}`);
  }
}

// --------------------
// og-image (Social)
// --------------------
async function generateOgImage() {
  const width = 1200;
  const height = 630;

  await sharp({
    create: {
      width,
      height,
      channels: 4,
      background: "#FFFFFF"
    }
  })
    .composite([
      {
        input: await sharp(wordmarkSource)
          .resize(800, 200, { fit: "contain" })
          .png()
          .toBuffer(),
        top: 215,
        left: 200
      }
    ])
    .png()
    .toFile(path.join(outputDir, "og-image.png"));

  console.log("✅ Generated og-image.png");
}

// --------------------
// Safari Pinned Tab (Orbit O Icon)
// --------------------
async function generateSafariPinned() {
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="512" height="512" viewBox="0 0 512 512">
      <!-- Outer ring -->
      <circle cx="256" cy="256" r="200" fill="currentColor"/>
      <!-- Inner cutout (ring effect) -->
      <circle cx="256" cy="256" r="140" fill="black"/>
      <!-- Orbit dot -->
      <circle cx="316" cy="256" r="50" fill="currentColor"/>
    </svg>
  `;
  fs.writeFileSync(path.join(outputDir, "safari-pinned-tab.svg"), svg.trim());
  console.log("✅ Generated safari-pinned-tab.svg");
}

// --------------------
// Run All
// --------------------
(async () => {
  try {
    await generateIcons();
    await generateSplash();
    await generateOgImage();
    await generateSafariPinned();
    console.log("🎉 All brand assets generated successfully!");
  } catch (err) {
    console.error("❌ Error generating assets:", err);
  }
})();
