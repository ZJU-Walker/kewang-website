(function () {
  const el = document.getElementById("tw-text");
  if (!el) return;

  // Lines you want to loop through
  const lines = [
    "I am building robots that can operate beyond the lab.",
    "I want them to learn from people and generalize safely.",
    "From simulation to reality, with structure and rigor.",
    "Data, learning, evaluation — repeated until it works."
  ];

  // Timing (tweak if you want)
  const TYPE_MS = 35;       // typing speed
  const DELETE_MS = 22;     // deleting speed
  const HOLD_MS = 1100;     // pause after a full line
  const BETWEEN_MS = 450;   // pause between lines

  function sleep(ms) {
    return new Promise((r) => setTimeout(r, ms));
  }

  async function typeLine(text) {
    el.textContent = "";
    for (let i = 0; i < text.length; i++) {
      el.textContent += text[i];
      await sleep(TYPE_MS);
    }
  }

  async function deleteLine() {
    while (el.textContent.length > 0) {
      el.textContent = el.textContent.slice(0, -1);
      await sleep(DELETE_MS);
    }
  }

  async function loop() {
    let idx = 0;
    while (true) {
      const line = lines[idx % lines.length];
      await typeLine(line);
      await sleep(HOLD_MS);
      await deleteLine();
      await sleep(BETWEEN_MS);
      idx++;
    }
  }

  loop();
})();
