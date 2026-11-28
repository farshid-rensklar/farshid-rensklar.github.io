/* JustDry scanner – one input that works with:
   1) a handheld/Bluetooth barcode scanner (it "types" the code and presses Enter),
   2) the phone camera (BarcodeDetector where the browser has it, otherwise jsQR loaded on demand),
   3) typing the code by hand.
   Usage: JDScan.attach(element, code => { ... }) */
(function () {
  var JSQR = 'https://cdn.jsdelivr.net/npm/jsqr@1.4.0/dist/jsQR.min.js';
  var RX = /JD-\d{5}-[0-9A-F]{6}/;
  function norm(v) { v = String(v || '').toUpperCase().trim(); var m = RX.exec(v); return m ? m[0] : v; }
  function loadJsQR() {
    if (window.jsQR) return Promise.resolve(window.jsQR);
    return new Promise(function (res, rej) {
      var s = document.createElement('script'); s.src = JSQR; s.async = true;
      s.onload = function () { window.jsQR ? res(window.jsQR) : rej(new Error('jsQR')); };
      s.onerror = function () { rej(new Error('jsQR')); }; document.head.appendChild(s);
    });
  }
  function attach(root, onCode, opts) {
    opts = opts || {};
    root.innerHTML = '<form class="jds" novalidate><label class="jds-l">' + (opts.label || 'Scan eller skriv koden på mærket') +
      '<input class="jds-in" autocomplete="off" autocapitalize="characters" spellcheck="false" inputmode="text" placeholder="JD-00012-A1B2C3"></label>' +
      '<div class="jds-row"><button class="jds-ok" type="submit">OK</button><button class="jds-cam" type="button">📷 Kamera</button></div>' +
      '<div class="jds-video" hidden><video playsinline muted></video><button type="button" class="jds-stop">Luk kamera</button></div></form>';
    var f = root.querySelector('form'), inp = root.querySelector('.jds-in'), box = root.querySelector('.jds-video'),
        video = root.querySelector('video'), stream = null, timer = 0, last = '', lastAt = 0, busy = false;
    function fire(v, fromCamera) {
      v = norm(v); if (!v) return;
      var now = Date.now(); if (fromCamera && v === last && now - lastAt < 2500) return; // the camera sees the same label many times a second
      last = v; lastAt = now; inp.value = '';
      if (busy) return; busy = true; Promise.resolve(onCode(v)).finally(function () { busy = false; if (!stream) inp.focus(); });
    }
    f.addEventListener('submit', function (e) { e.preventDefault(); fire(inp.value); });
    function stop() { clearInterval(timer); if (stream) stream.getTracks().forEach(function (t) { t.stop(); }); stream = null; box.hidden = true; }
    root.querySelector('.jds-stop').addEventListener('click', stop);
    root.querySelector('.jds-cam').addEventListener('click', async function () {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) { alertMsg('Kameraet er ikke tilgængeligt i denne browser. Skriv koden i stedet.'); return; }
      try {
        stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' }, audio: false });
        video.srcObject = stream; await video.play(); box.hidden = false;
        var detector = ('BarcodeDetector' in window) ? new window.BarcodeDetector({ formats: ['qr_code'] }) : null, decode = null, canvas = document.createElement('canvas');
        if (!detector) decode = await loadJsQR();
        timer = setInterval(async function () {
          if (!video.videoWidth) return;
          try {
            if (detector) { var r = await detector.detect(video); if (r && r[0]) fire(r[0].rawValue, true); }
            else {
              var w = Math.min(640, video.videoWidth), h = Math.round(video.videoHeight * w / video.videoWidth);
              canvas.width = w; canvas.height = h; var cx = canvas.getContext('2d', { willReadFrequently: true });
              cx.drawImage(video, 0, 0, w, h); var img = cx.getImageData(0, 0, w, h), code = decode(img.data, w, h, { inversionAttempts: 'dontInvert' });
              if (code && code.data) fire(code.data, true);
            }
          } catch (_) { /* keep trying */ }
        }, 250);
      } catch (e) { stop(); alertMsg('Kameraet kunne ikke startes. Giv adgang til kameraet, eller skriv koden.'); }
    });
    function alertMsg(m) { var p = root.querySelector('.jds-msg') || document.createElement('p'); p.className = 'jds-msg'; p.setAttribute('role', 'alert'); p.textContent = m; f.appendChild(p); }
    if (opts.autofocus !== false) setTimeout(function () { inp.focus(); }, 50);
    return { stop: stop, focus: function () { inp.focus(); } };
  }
  window.JDScan = { attach: attach, normalize: norm };
})();
