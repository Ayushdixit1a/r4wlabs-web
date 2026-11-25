#!/usr/bin/env node
/**
 * Turns the videos in ./videos into web-ready reels for the site.
 *
 *   videos/Top/            → the featured slider ("Top")
 *   videos/<Industry>/     → one slider per industry on the Video Editing page
 *
 * For every video it writes to public/media/<folder>/:
 *   <name>.mp4          the full reel, compressed for the web (plays with sound in the viewer)
 *   <name>-preview.mp4  a muted 6-second cut from the middle (what loops in the slider)
 *   <name>.jpg          a poster frame from the middle
 * and lists everything in public/media/manifest.json.
 *
 * Needs ffmpeg on the PATH. Run with: npm run videos
 */
import { execFileSync, spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SOURCE = path.join(root, 'videos');
const SAMPLES = path.join(root, '.cache', 'sample-videos');
const OUT = path.join(root, 'public', 'media');
const PREVIEW_SECONDS = 6;
const VIDEO = new Set(['.mp4', '.mov', '.m4v', '.webm', '.mkv', '.avi']);
const sort = new Intl.Collator('en', { numeric: true, sensitivity: 'base' });

// Folder names that mean the same category, in the order they appear on the site.
const INDUSTRIES = [
  { slug: 'cafes', name: 'Cafés', match: ['cafe', 'cafes', 'restaurant', 'restaurants', 'food', 'cafes-restaurants'] },
  { slug: 'hotels', name: 'Hotels', match: ['hotel', 'hotels', 'hospitality'] },
  { slug: 'real-estate', name: 'Real Estate', match: ['real-estate', 'realestate', 'real-state', 'realstate', 'property', 'properties'] },
  { slug: 'healthcare', name: 'Healthcare', match: ['healthcare', 'health', 'clinic', 'clinics', 'hospital', 'hospitals', 'doctor', 'doctors', 'dental'] },
  { slug: 'events-entertainment', name: 'Events & Entertainment', match: ['events-entertainment', 'events', 'event', 'entertainment', 'events-and-entertainment'] },
  { slug: 'automotive', name: 'Automotive', match: ['automotive', 'auto', 'workshop', 'workshops', 'cars', 'car'] },
  { slug: 'personal-branding', name: 'Personal Branding', match: ['personal-branding', 'personal-brending', 'personal-brand', 'creators'] },
  { slug: 'motion-graphics', name: 'Motion Graphics', match: ['motion-graphics', 'motion', 'animation'] },
  { slug: 'ai-videos', name: 'AI Videos For Brands', match: ['ai-videos-for-brands', 'ai-videos', 'ai', 'other', 'others', 'misc'] },
];
// The first five are always listed on the site, even before they have videos.
const ALWAYS_LISTED = 5;

const slugify = text => text.normalize('NFKD').replace(/[\u0300-\u036f]/g, '').toLowerCase()
  .replace(/&/g, ' and ').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || 'reel';

// Writes to a temporary name first, so an interrupted run never leaves a half-written file behind.
function ffmpeg(args) {
  const target = args.at(-1);
  const partial = path.join(path.dirname(target), `partial-${path.basename(target)}`);
  const result = spawnSync('ffmpeg', ['-hide_banner', '-loglevel', 'error', '-y', ...args.slice(0, -1), partial], { stdio: ['ignore', 'ignore', 'pipe'] });
  if (result.status !== 0) {
    fs.rmSync(partial, { force: true });
    throw new Error(result.stderr.toString().trim() || 'ffmpeg failed');
  }
  fs.renameSync(partial, target);
}
function probe(file) {
  const out = execFileSync('ffprobe', ['-v', 'error', '-select_streams', 'v:0', '-show_streams', '-show_format', '-of', 'json', file],
    { stdio: ['ignore', 'pipe', 'ignore'] }).toString();
  const info = JSON.parse(out);
  const stream = info.streams?.[0] ?? {};
  const rotation = Math.abs(Number(stream.side_data_list?.find(d => d.rotation !== undefined)?.rotation ?? stream.tags?.rotate ?? 0));
  const swap = rotation === 90 || rotation === 270;
  return {
    duration: Number(info.format?.duration) || 0,
    width: swap ? stream.height : stream.width,
    height: swap ? stream.width : stream.height,
  };
}

function videosIn(dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).filter(entry => !entry.name.startsWith('.') && !entry.name.startsWith('_'))
    .sort((x, y) => sort.compare(x.name, y.name))
    .flatMap(entry => entry.isDirectory() ? videosIn(path.join(dir, entry.name))
      : VIDEO.has(path.extname(entry.name).toLowerCase()) ? [path.join(dir, entry.name)] : []);
}
// One group per top-level folder; videos in nested folders belong to that group.
function folders(dir) {
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir, { withFileTypes: true })
    .filter(entry => entry.isDirectory() && !entry.name.startsWith('.') && !entry.name.startsWith('_'))
    .map(entry => ({ folder: entry.name, files: videosIn(path.join(dir, entry.name)) }));
}

// Until real videos are supplied, generate labelled sample clips so the sliders can be reviewed.
function makeSamples() {
  const palette = [['0xE4022F', '0x1a0208'], ['0x15171c', '0xE4022F'], ['0xff5a36', '0x2a0a12'], ['0x0b131c', '0xff1f4b'], ['0x7a0019', '0x050506'], ['0xE4022F', '0x0b131c']];
  const font = ['/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf', '/System/Library/Fonts/Supplemental/Arial Bold.ttf', 'C:/Windows/Fonts/arialbd.ttf'].find(f => fs.existsSync(f));
  const plan = [['Top', 6], ...INDUSTRIES.slice(0, ALWAYS_LISTED).map(i => [i.name, 4])];
  let n = 0;
  for (const [folder, count] of plan) {
    const dir = path.join(SAMPLES, folder);
    fs.mkdirSync(dir, { recursive: true });
    for (let i = 1; i <= count; i++) {
      const file = path.join(dir, `${String(i).padStart(2, '0')}-sample-reel.mp4`);
      const [c0, c1] = palette[n++ % palette.length];
      if (fs.existsSync(file)) continue;
      const text = font
        ? `,drawtext=fontfile='${font.replace(/:/g, '\\:')}':text='SAMPLE REEL':fontcolor=white:fontsize=40:x=(w-text_w)/2:y=h*0.44`
          + `,drawtext=fontfile='${font.replace(/:/g, '\\:')}':text='%{pts\\:hms}':fontcolor=white@0.75:fontsize=22:x=(w-text_w)/2:y=h*0.44+70`
        : '';
      ffmpeg(['-f', 'lavfi', '-i', `gradients=s=540x960:d=14:speed=0.03:c0=${c0}:c1=${c1}:c2=0x050506:nb_colors=3:seed=${n}`,
        '-f', 'lavfi', '-i', 'anullsrc=r=44100:cl=stereo', '-shortest', '-vf', `format=yuv420p${text}`,
        '-c:v', 'libx264', '-preset', 'veryfast', '-crf', '30', '-c:a', 'aac', '-b:a', '48k', file]);
    }
  }
}

function build(file, outDir, webDir) {
  // File names often carry client names, so outputs are named by hash only.
  const name = `reel-${createHash('sha1').update(path.relative(root, file)).digest('hex').slice(0, 10)}`;
  const full = path.join(outDir, `${name}.mp4`);
  const preview = path.join(outDir, `${name}-preview.mp4`);
  const poster = path.join(outDir, `${name}.jpg`);
  const info = probe(file);
  const length = Math.min(PREVIEW_SECONDS, info.duration || PREVIEW_SECONDS);
  const start = Math.max(0, (info.duration - length) / 2);
  // Scale so the shorter side is at most `side` px, whichever way the video is turned.
  const fit = side => `scale=w='if(gt(iw,ih),-2,min(${side},iw))':h='if(gt(iw,ih),min(${side},ih),-2)'`;
  const fresh = target => fs.existsSync(target) && fs.statSync(target).mtimeMs >= fs.statSync(file).mtimeMs;

  if (!fresh(full)) {
    ffmpeg(['-i', file, '-vf', fit(720), '-c:v', 'libx264', '-preset', 'medium', '-crf', '25',
      '-pix_fmt', 'yuv420p', '-c:a', 'aac', '-b:a', '128k', '-movflags', '+faststart', full]);
  }
  if (!fresh(preview)) {
    ffmpeg(['-ss', start.toFixed(2), '-t', length.toFixed(2), '-i', file, '-an', '-vf', `${fit(480)},fps=30`,
      '-c:v', 'libx264', '-preset', 'medium', '-crf', '29', '-pix_fmt', 'yuv420p', '-movflags', '+faststart', preview]);
  }
  if (!fresh(poster)) {
    ffmpeg(['-ss', (start + length / 2).toFixed(2), '-i', file, '-frames:v', '1', '-vf', fit(540), '-q:v', '4', poster]);
  }
  return {
    src: `${webDir}/${name}.mp4`,
    preview: `${webDir}/${name}-preview.mp4`,
    poster: `${webDir}/${name}.jpg`,
    duration: Math.round(info.duration),
    width: info.width,
    height: info.height,
  };
}

try {
  execFileSync('ffmpeg', ['-version'], { stdio: 'ignore' });
} catch {
  console.error('ffmpeg was not found. Install it (https://ffmpeg.org/download.html) and run this again.');
  process.exit(1);
}

let groups = folders(SOURCE);
const sample = !groups.some(group => group.files.length);
if (sample) {
  console.log('No videos found in ./videos yet. Building labelled sample clips instead.');
  makeSamples();
  groups = folders(SAMPLES);
}

const keep = new Set(['manifest.json']);
const byFile = new Map();
const isPick = file => /(^|[\\/])\d*\s*picks?[\\/]/i.test(file);
const manifest = { generatedAt: new Date().toISOString(), sample, previewSeconds: PREVIEW_SECONDS, top: [], bts: [], industries: [] };
const industryOf = folder => INDUSTRIES.find(i => i.match.includes(slugify(folder)) || i.slug === slugify(folder));

for (const { folder, files } of groups) {
  const isTop = slugify(folder) === 'top';
  const isBts = ['bts', 'behind-the-scenes'].includes(slugify(folder));
  const known = industryOf(folder);
  const slug = isTop ? 'top' : isBts ? 'bts' : known?.slug ?? slugify(folder);
  const name = isTop ? 'Top' : known?.name ?? folder.replace(/[_-]+/g, ' ').trim();
  const outDir = path.join(OUT, slug);
  fs.mkdirSync(outDir, { recursive: true });
  const items = [];
  for (const file of files) {
    process.stdout.write(`  ${folder}/${path.basename(file)} … `);
    try {
      const item = build(file, outDir, `media/${slug}`);
      if (sample) item.sample = true;
      if (isPick(path.relative(SOURCE, file))) item.pick = true;
      byFile.set(path.relative(SOURCE, file).split(path.sep).join('/').toLowerCase(), item);
      items.push(item);
      // Titles never come from file names: clients are not named on the site.
      item.title = `${isTop ? 'Top reel' : isBts ? 'Behind the scenes' : name} ${String(items.length).padStart(2, '0')}`;
      if (!isTop && !isBts) item.group = name;
      [item.src, item.preview, item.poster].forEach(p => keep.add(p.replace(/^media\//, '')));
      console.log('done');
    } catch (error) {
      console.log(`skipped (${error.message.split('\n')[0]})`);
    }
  }
  if (isTop) manifest.top.push(...items);
  else if (isBts) manifest.bts.push(...items);
  else {
    const existing = manifest.industries.find(i => i.slug === slug);
    if (existing) existing.items.push(...items);
    else manifest.industries.push({ slug, name, folder, items });
  }
}

// The core industries appear even before they have videos; known categories lead, in order.
if (!sample) {
  for (const industry of INDUSTRIES.slice(0, ALWAYS_LISTED)) {
    if (!manifest.industries.some(i => i.slug === industry.slug)) manifest.industries.push({ slug: industry.slug, name: industry.name, folder: industry.name, items: [] });
  }
}
const order = slug => { const i = INDUSTRIES.findIndex(x => x.slug === slug); return i < 0 ? 99 : i; };
manifest.industries.sort((a, b) => order(a.slug) - order(b.slug) || sort.compare(a.name, b.name));

// No Top folder yet: feature the first reel of every category until one is added.
manifest.topAuto = !manifest.top.length;
if (manifest.topAuto) {
  // Numbered videos in a "picks" folder lead their category; Top takes them in rounds (all the 1s, then the 2s).
  const picked = manifest.industries.map(i => i.items.filter(item => item.pick)).filter(list => list.length);
  if (picked.length) {
    for (let n = 0; manifest.top.length < 12 && picked.some(list => list[n]); n++) {
      picked.forEach(list => { if (list[n] && manifest.top.length < 12) manifest.top.push({ ...list[n] }); });
    }
  } else manifest.top = manifest.industries.filter(i => i.items.length).map(i => ({ ...i.items[0] }));
}

// videos/top.txt lists reels that lead the Top slider, in order, ahead of the picks.
const topList = path.join(SOURCE, 'top.txt');
const featured = !fs.existsSync(topList) ? [] : fs.readFileSync(topList, 'utf8').split(/\r?\n/).map(line => line.trim())
  .filter(line => line && !line.startsWith('#')).flatMap(line => {
    const item = byFile.get(line.replace(/\\/g, '/').toLowerCase());
    if (!item) console.log(`  top.txt: no video at "${line}"`);
    return item ? [{ ...item }] : [];
  });
if (featured.length) {
  const lead = new Set(featured.map(item => item.src));
  manifest.top = [...featured, ...manifest.top.filter(item => !lead.has(item.src))];
}

// videos/wild.txt lists the reels that are scattered at random in the "In the wild" section.
const wildList = path.join(SOURCE, "wild.txt");
manifest.wild = !fs.existsSync(wildList) ? [] : fs.readFileSync(wildList, 'utf8').split(/\r?\n/).map(line => line.trim())
  .filter(line => line && !line.startsWith('#')).flatMap(line => {
    const item = byFile.get(line.replace(/\\/g, '/').toLowerCase());
    if (!item) console.log(`  wild.txt: no video at "${line}"`);
    return item ? [{ ...item }] : [];
  });

// Remove outputs whose source video was deleted or renamed.
for (const dir of fs.existsSync(OUT) ? fs.readdirSync(OUT, { withFileTypes: true }).filter(e => e.isDirectory() && e.name !== 'explainers') : []) {
  for (const file of fs.readdirSync(path.join(OUT, dir.name))) {
    if (!keep.has(`${dir.name}/${file}`)) fs.rmSync(path.join(OUT, dir.name, file));
  }
  if (!fs.readdirSync(path.join(OUT, dir.name)).length) fs.rmdirSync(path.join(OUT, dir.name));
}

fs.writeFileSync(path.join(OUT, 'manifest.json'), JSON.stringify(manifest, null, 2));
const total = (manifest.topAuto ? 0 : manifest.top.length) + manifest.industries.reduce((sum, i) => sum + i.items.length, 0);
console.log(`\n${total} reels ready${sample ? ' (samples)' : ''}: ${manifest.top.length} in Top${manifest.topAuto ? ' (auto-picked, no Top folder)' : ''}, ${manifest.industries.length} categories.`);
