#!/usr/bin/env node
/**
 * Extract images from HTML IMGS array and save with correct 0-indexed filenames
 */
const fs = require('fs');
const path = require('path');

const htmlPath = '/Users/djmac/Downloads/02_customer_portal (2).html';
const outputDir = '/Users/djmac/drprepper-wholesale-portal/public/images/products';

console.log('📖 Reading HTML file...');
const html = fs.readFileSync(htmlPath, 'utf8');

// Find IMGS array
const imgsMatch = html.match(/const IMGS=\[([\s\S]*?)\];/);
if (!imgsMatch) throw new Error('IMGS array not found');

console.log('📊 Parsing IMGS array...');
// Extract image data URIs - they look like "data:image/png;base64,..."
const imgDataPattern = /"(data:image\/\w+;base64,[^"]+)"/g;
const matches = [];
let match;
while ((match = imgDataPattern.exec(imgsMatch[1])) !== null) {
  matches.push(match[1]);
}

console.log(`✅ Found ${matches.length} images in HTML`);

if (matches.length !== 205) {
  console.warn(`⚠️  Expected 205 images, got ${matches.length}`);
}

// Save each image
let saved = 0;
matches.forEach((dataUri, idx) => {
  // Parse data URI
  const [meta, base64] = dataUri.split(',');
  const isPng = meta.includes('png');
  const ext = isPng ? 'png' : 'jpg';
  
  // Decode base64
  const buffer = Buffer.from(base64, 'base64');
  
  // Generate filename with correct 0-indexed numbering
  const filename = `product-${String(idx).padStart(3, '0')}.${ext}`;
  const filepath = path.join(outputDir, filename);
  
  // Write file
  fs.writeFileSync(filepath, buffer);
  saved++;
  
  if (idx < 5 || idx >= matches.length - 2) {
    console.log(`  [${idx}] → ${filename} (${buffer.length} bytes)`);
  } else if (idx === 5) {
    console.log('  ...');
  }
});

console.log(`\n✅ Saved ${saved} images to ${outputDir}`);

// Verify
const files = fs.readdirSync(outputDir);
console.log(`🔍 Verification: ${files.length} files in directory`);
console.log(`   First: ${files[0]}`);
console.log(`   Last: ${files[files.length - 1]}`);
