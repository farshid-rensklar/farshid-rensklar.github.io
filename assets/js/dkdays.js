/* JustDry – danske helligdage og lukkedage (samme regler som is_closed_day i databasen).
   Datoer er 'YYYY-MM-DD' i dansk tid. Ekstra lukkedage fra kontoret kan lægges til med JDDays.addClosed([...]). */
(function () {
  const pad = n => String(n).padStart(2, '0');
  const iso = d => d.getUTCFullYear() + '-' + pad(d.getUTCMonth() + 1) + '-' + pad(d.getUTCDate());
  const day = (y, m, d) => new Date(Date.UTC(y, m - 1, d, 12));
  const add = (d, n) => new Date(d.getTime() + n * 864e5);
  function easter(y) { // gregoriansk påskeregel
    const a = y % 19, b = Math.floor(y / 100), c = y % 100, d = Math.floor(b / 4), e = b % 4, f = Math.floor((b + 8) / 25),
      g = Math.floor((b - f + 1) / 3), h = (19 * a + b - d - g + 15) % 30, i = Math.floor(c / 4), k = c % 4,
      l = (32 + 2 * e + 2 * i - h - k) % 7, m = Math.floor((a + 11 * h + 22 * l) / 451), mo = Math.floor((h + l - 7 * m + 114) / 31);
    return day(y, mo, ((h + l - 7 * m + 114) % 31) + 1);
  }
  const cache = {};
  function holidays(y) {
    if (cache[y]) return cache[y];
    const e = easter(y);
    return (cache[y] = new Map([
      [iso(day(y, 1, 1)), 'Nytårsdag'], [iso(add(e, -3)), 'Skærtorsdag'], [iso(add(e, -2)), 'Langfredag'],
      [iso(e), 'Påskedag'], [iso(add(e, 1)), '2. påskedag'], [iso(add(e, 39)), 'Kristi himmelfartsdag'],
      [iso(add(e, 49)), 'Pinsedag'], [iso(add(e, 50)), '2. pinsedag'], [iso(day(y, 6, 5)), 'Grundlovsdag'],
      [iso(day(y, 12, 24)), 'Juleaftensdag'], [iso(day(y, 12, 25)), '1. juledag'], [iso(day(y, 12, 26)), '2. juledag'],
      [iso(day(y, 12, 31)), 'Nytårsaftensdag']]));
  }
  const extra = new Set();
  let openDays = [1, 2, 3, 4, 5];
  function isClosed(s) {
    const d = new Date(s + 'T12:00:00Z'), dow = ((d.getUTCDay() + 6) % 7) + 1;
    return !openDays.includes(dow) || holidays(d.getUTCFullYear()).has(s) || extra.has(s);
  }
  /* Dansk dato lige nu (år, måned, dag, time) */
  function now() {
    const p = Object.fromEntries(new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Copenhagen', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', hourCycle: 'h23' })
      .formatToParts(new Date()).map(x => [x.type, x.value]));
    return { iso: `${p.year}-${p.month}-${p.day}`, y: +p.year, hour: +p.hour };
  }
  /* Sidste afhentning, hvor tøjet er tilbage 23. december (4 hverdage før) */
  function lastBeforeXmas(y) {
    let d = day(y, 12, 23), n = 0;
    while (n < 4) { d = add(d, -1); if (!isClosed(iso(d))) n++; }
    return iso(d);
  }
  window.JDDays = {
    iso, easter: y => iso(easter(y)), holidays, isClosed, now, lastBeforeXmas,
    setOpenDays: a => { openDays = a.slice(); }, addClosed: a => (a || []).forEach(x => extra.add(String(x).slice(0, 10))),
    addDays: (s, n) => iso(add(new Date(s + 'T12:00:00Z'), n))
  };
})();
