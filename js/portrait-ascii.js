// A still, optional character portrait. Generate it only on request and keep the
// original image in the accessibility tree; no animation or network request.
const button = document.querySelector('.about__ascii-toggle');
const canvas = document.querySelector('.about__ascii');
const photo = document.querySelector('.about__photo img');
let ready = false;

function label() {
  const on = button.getAttribute('aria-pressed') === 'true';
  const pl = document.documentElement.lang === 'pl';
  button.setAttribute('aria-label', pl
    ? (on ? 'Pokaż zwykły portret' : 'Pokaż portret jako grafikę ASCII')
    : (on ? 'Show original portrait' : 'Show portrait as ASCII art'));
}

function draw() {
  const sample = document.createElement('canvas');
  sample.width = sample.height = 64;
  const pixels = sample.getContext('2d', { willReadFrequently: true });
  const ctx = canvas.getContext('2d');
  if (!pixels || !ctx) return false;
  pixels.drawImage(photo, 0, 0, 64, 64);
  const data = pixels.getImageData(0, 0, 64, 64).data;
  const glyphs = ' .,:;irsXA253hMHGS#9B&@';
  ctx.fillStyle = '#0b0a1a';
  ctx.fillRect(0, 0, 640, 640);
  ctx.font = '10px monospace';
  ctx.textBaseline = 'top';
  for (let y = 0; y < 64; y++) for (let x = 0; x < 64; x++) {
    const i = (y * 64 + x) * 4;
    const light = (data[i] * .2126 + data[i + 1] * .7152 + data[i + 2] * .0722) / 255;
    ctx.fillStyle = `rgb(${Math.round(120 + light * 110)}, ${Math.round(120 + light * 95)}, ${Math.round(180 + light * 75)})`;
    ctx.fillText(glyphs[Math.min(glyphs.length - 1, Math.floor(light * glyphs.length))], x * 10, y * 10);
  }
  return true;
}

button.addEventListener('click', async () => {
  if (button.getAttribute('aria-pressed') === 'true') {
    canvas.hidden = true;
    button.setAttribute('aria-pressed', 'false');
  } else {
    try {
      if (!photo.complete || !photo.naturalWidth) await photo.decode();
      if (!ready) ready = draw();
      if (!ready) return;
      canvas.hidden = false;
      button.setAttribute('aria-pressed', 'true');
    } catch (_) { return; } // Keep the original portrait if drawing is unavailable.
  }
  label();
});
document.addEventListener('channelchange', label);
label();
button.hidden = false;
