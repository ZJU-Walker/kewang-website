(function () {
  const el = document.getElementById("tw-text");
  if (!el) return;

  // Lines you want to loop through
  const linesDesktop = [
    "I am building robots that work in the real world.",
    "I want them to learn from humans and act safely.",
    "Simulation first, deployment next — with guarantees.",
    "Collect data. Learn policies. Validate in reality."
  ];

  const linesMobile = [
    "Building real-world robots.",
    "Learning from humans — safely.",
    "Sim → real, with rigor.",
    "Data → policy → deploy."
  ];

  const isMobile = window.matchMedia("(max-width: 700px)").matches;
  const lines = isMobile ? linesMobile : linesDesktop;

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
