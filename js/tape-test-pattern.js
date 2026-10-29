/* An original calibration card, drawn as vector graphics so it stays sharp on the CRT. */
(() => {
  let staticTexture;
  function noiseTexture() {
    if (staticTexture) return staticTexture;
    // A single generated tile keeps the noise monochrome and avoids continually
    // recalculating pixels or allocating a canvas on every animation frame.
    const canvas = document.createElement('canvas');
    canvas.width = canvas.height = 192;
    const ctx = canvas.getContext('2d');
    const pixels = ctx.createImageData(canvas.width, canvas.height);
    let random = 0x1948a27;
    for (let i = 0; i < pixels.data.length; i += 4) {
      random ^= random << 13; random ^= random >>> 17; random ^= random << 5;
      const shade = 45 + ((random >>> 0) % 187);
      pixels.data[i] = pixels.data[i + 1] = pixels.data[i + 2] = shade;
      pixels.data[i + 3] = 255;
    }
    ctx.putImageData(pixels, 0, 0);
    staticTexture = canvas.toDataURL();
    return staticTexture;
  }

  window.createTapeStatic = () => {
    const screen = document.createElement('div');
    screen.className = 'tape-static';
    screen.setAttribute('aria-hidden', 'true');
    const grain = document.createElement('div');
    grain.className = 'tape-static__grain';
    grain.style.setProperty('--tape-static-texture', `url("${noiseTexture()}")`);
    screen.append(grain);
    // The animation is paused when the TV is out of view. Removing the screen
    // also disconnects the observer, even if a different cassette is selected.
    if ('IntersectionObserver' in window) {
      const observer = new IntersectionObserver(entries => {
        if (!screen.isConnected) { observer.disconnect(); return; }
        screen.classList.toggle('is-suspended', !entries[0].isIntersecting);
      });
      observer.observe(screen);
      screen.dispose = () => observer.disconnect();
    }
    return screen;
  };

  window.createTapeTestPattern = () => {
    const card = document.createElement('div');
    card.className = 'tape-test-pattern';
    card.setAttribute('aria-hidden', 'true');
    card.innerHTML = `<svg viewBox="0 0 800 600" preserveAspectRatio="xMidYMid meet" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <clipPath id="tape-test-circle"><circle cx="400" cy="300" r="235"/></clipPath>
        <pattern id="tape-test-fine" width="12" height="12" patternUnits="userSpaceOnUse"><rect width="6" height="12" fill="#16151a"/><rect x="6" width="6" height="12" fill="#f3f0e9"/></pattern>
        <pattern id="tape-test-tight" width="5" height="8" patternUnits="userSpaceOnUse"><rect width="2.5" height="8" fill="#17161a"/><rect x="2.5" width="2.5" height="8" fill="#f1eee8"/></pattern>
      </defs>
      <!-- Alignment marks and level bars sit outside the circular calibration area. -->
      <g fill="none" stroke="#eeebe5" stroke-opacity=".85" stroke-width="2">
        <path d="M400 20v48M400 532v48M20 300h115M665 300h115"/>
        <path d="M47 73h34v454H47zM719 73h34v454h-34z"/>
      </g>
      <g>
        <path fill="#7770c8" d="M49 75h30v85H49z"/><path fill="#df5172" d="M49 160h30v85H49z"/>
        <path fill="#ee7848" d="M49 245h30v85H49z"/><path fill="#f4b72e" d="M49 330h30v85H49z"/><path fill="#9dc4c0" d="M49 415h30v110H49z"/>
        <path fill="#9dc4c0" d="M721 75h30v85h-30z"/><path fill="#f4b72e" d="M721 160h30v85h-30z"/>
        <path fill="#ee7848" d="M721 245h30v85h-30z"/><path fill="#df5172" d="M721 330h30v85h-30z"/><path fill="#7770c8" d="M721 415h30v110h-30z"/>
      </g>
      <g clip-path="url(#tape-test-circle)">
        <rect x="160" y="60" width="480" height="480" fill="#edeae4"/>
        <rect x="160" y="132" width="480" height="65" fill="#1b1a20"/>
        <path fill="#edeae4" d="M212 159h45v38h-45zM293 159h45v38h-45zM462 159h45v38h-45zM543 159h45v38h-45z"/>
        <path fill="#1b1a20" d="M340 90h120v22H340z"/>
        <g>
          <path fill="#f4bd38" d="M160 197h69v82h-69z"/><path fill="#9dc4c0" d="M229 197h69v82h-69z"/>
          <path fill="#91b36d" d="M298 197h69v82h-69z"/><path fill="#ba70b0" d="M367 197h66v82h-66z"/>
          <path fill="#e65d78" d="M433 197h69v82h-69z"/><path fill="#ed8550" d="M502 197h69v82h-69z"/>
          <path fill="#7373bf" d="M571 197h69v82h-69z"/>
        </g>
        <rect x="160" y="279" width="480" height="29" fill="#19181d"/>
        <rect x="160" y="308" width="480" height="100" fill="url(#tape-test-fine)"/>
        <rect x="310" y="308" width="180" height="100" fill="url(#tape-test-tight)"/>
        <path fill="#19181d" d="M160 408h480v27H160z"/>
        <path fill="#f0ede6" d="M211 408h75v27h-75zM362 408h76v27h-76zM514 408h75v27h-75z"/>
        <path fill="#19181d" d="M220 446h360v28H220z"/>
        <path fill="#68666b" d="M220 446h60v28h-60z"/><path fill="#a19fa1" d="M280 446h60v28h-60z"/>
        <path fill="#ddd9d3" d="M340 446h60v28h-60z"/><path fill="#f5f2ec" d="M400 446h60v28h-60z"/>
        <path fill="#7770c8" d="M190 486h84v54h-84z"/><path fill="#ba70b0" d="M274 486h84v54h-84z"/>
        <path fill="#e65d78" d="M358 486h84v54h-84z"/><path fill="#ed8550" d="M442 486h84v54h-84z"/><path fill="#f4bd38" d="M526 486h84v54h-84z"/>
      </g>
      <circle cx="400" cy="300" r="235" fill="none" stroke="#25232a" stroke-width="3"/>
      <path d="M400 267v65M368 300h64" stroke="#f7f4ec" stroke-width="1.5" opacity=".7"/>
      <rect x="367" y="116" width="66" height="24" rx="1" fill="#edeae4"/>
      <text x="400" y="133" text-anchor="middle" fill="#24212b" font-family="monospace" font-size="16" font-weight="bold" letter-spacing="2">TM 01</text>
      <g fill="#2d2a32" font-family="monospace" font-size="13" font-weight="bold" letter-spacing="2">
        <text x="105" y="37">VIDEO LIBRARY</text><text x="695" y="37" text-anchor="end">TEST SIGNAL / 01</text>
        <text x="105" y="580">CALIBRATION SIGNAL</text><text x="695" y="580" text-anchor="end">T-120 · VHS</text>
      </g>
    </svg>`;
    return card;
  };
})();
