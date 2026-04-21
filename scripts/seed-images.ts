/**
 * Uploads a small demo image to R2 for each training + age category
 * that currently has no imageUrl/iconUrl, so the admin panel shows
 * real thumbnails right away.
 */
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { PrismaClient } from "@prisma/client";
import * as dotenv from "dotenv";
import * as path from "path";
import { randomUUID } from "crypto";

dotenv.config({ path: path.resolve(__dirname, "..", ".env") });

const endpoint = process.env.R2_ENDPOINT!;
const bucket = process.env.R2_BUCKET_NAME!;
const publicUrl = (process.env.R2_PUBLIC_URL || "").replace(/\/+$/, "");

const s3 = new S3Client({
  region: process.env.R2_REGION || "auto",
  endpoint,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID!,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
  },
});

const prisma = new PrismaClient();

// Tiny 1200×675 SVG football-themed placeholder generator (no external deps)
function makeSvg(title: string, accent: string) {
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 675">
  <defs>
    <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="${accent}"/>
      <stop offset="100%" stop-color="#0a3d1a"/>
    </linearGradient>
    <pattern id="p" width="60" height="60" patternUnits="userSpaceOnUse">
      <path d="M0 60 L60 0" stroke="rgba(255,255,255,0.06)" stroke-width="1.5"/>
    </pattern>
  </defs>
  <rect width="1200" height="675" fill="url(#g)"/>
  <rect width="1200" height="675" fill="url(#p)"/>
  <circle cx="600" cy="337" r="180" fill="rgba(255,255,255,0.08)"/>
  <circle cx="600" cy="337" r="80" fill="rgba(255,255,255,0.12)"/>
  <text x="600" y="355" font-family="Arial, sans-serif" font-size="54" font-weight="700"
        fill="white" text-anchor="middle" dominant-baseline="middle">${escapeXml(
          title
        )}</text>
  <text x="600" y="420" font-family="Arial, sans-serif" font-size="22"
        fill="rgba(255,255,255,0.7)" text-anchor="middle">Football Coach</text>
</svg>`;
}

function escapeXml(s: string) {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

const palette = [
  "#22c55e", // green
  "#3b82f6", // blue
  "#f59e0b", // amber
  "#ef4444", // red
  "#8b5cf6", // violet
  "#14b8a6", // teal
  "#ec4899", // pink
];

async function uploadSvg(
  folder: string,
  title: string,
  accent: string
): Promise<string> {
  const key = `${folder}/seed/${randomUUID()}.svg`;
  const body = makeSvg(title, accent);
  await s3.send(
    new PutObjectCommand({
      Bucket: bucket,
      Key: key,
      Body: body,
      ContentType: "image/svg+xml",
      CacheControl: "public, max-age=31536000, immutable",
    })
  );
  return `${publicUrl}/${key}`;
}

async function main() {
  // Training categories
  const trainingCats = await prisma.trainingCategory.findMany({
    where: { OR: [{ imageUrl: null }, { imageUrl: "" }] },
    orderBy: { id: "asc" },
  });
  console.log(
    `[training] ${trainingCats.length} category(ies) without imageUrl`
  );
  for (let i = 0; i < trainingCats.length; i++) {
    const cat = trainingCats[i];
    const color = palette[i % palette.length];
    const url = await uploadSvg("images", cat.titleUz, color);
    await prisma.trainingCategory.update({
      where: { id: cat.id },
      data: { imageUrl: url },
    });
    console.log(`  #${cat.id} ${cat.titleUz} → ${url}`);
  }

  // Age categories
  const ageCats = await prisma.ageCategory.findMany({
    where: { OR: [{ iconUrl: null }, { iconUrl: "" }] },
    orderBy: { id: "asc" },
  });
  console.log(`[age] ${ageCats.length} category(ies) without iconUrl`);
  for (let i = 0; i < ageCats.length; i++) {
    const cat = ageCats[i];
    const color = palette[(i + 3) % palette.length];
    const label = `${cat.minAge}-${cat.maxAge}`;
    const url = await uploadSvg("images", label, color);
    await prisma.ageCategory.update({
      where: { id: cat.id },
      data: { iconUrl: url },
    });
    console.log(`  #${cat.id} ${cat.titleUz} → ${url}`);
  }

  // Books (cover + tactic hint) — replace fake /covers/ URLs
  const books = await prisma.book.findMany({ orderBy: { id: "asc" } });
  console.log(`[books] ${books.length} book(s)`);
  for (let i = 0; i < books.length; i++) {
    const book = books[i];
    const color = palette[(i + 1) % palette.length];
    const needsCover =
      !book.coverImageUrl || !book.coverImageUrl.startsWith("http");
    const needsHint =
      !book.tacticHintImg || !book.tacticHintImg.startsWith("http");
    const data: { coverImageUrl?: string; tacticHintImg?: string } = {};
    if (needsCover) {
      data.coverImageUrl = await uploadSvg("images", book.titleUz, color);
    }
    if (needsHint) {
      data.tacticHintImg = await uploadSvg(
        "images",
        "Taktik sxema",
        palette[(i + 4) % palette.length]
      );
    }
    if (Object.keys(data).length > 0) {
      await prisma.book.update({ where: { id: book.id }, data });
      console.log(
        `  #${book.id} ${book.titleUz} → ${Object.keys(data).join(", ")}`
      );
    }
  }

  console.log("\n✅ seed-images complete");
  await prisma.$disconnect();
}

main().catch(async (e) => {
  console.error(e);
  await prisma.$disconnect();
  process.exit(1);
});
