(function () {
  function sleep(ms) {
    return new Promise((r) => setTimeout(r, ms));
  }

  // ========== Home page: loops with delete ==========
  const homeEl = document.getElementById("tw-text");
  if (homeEl) {
    const lines = [
      "I am building robots that can operate beyond the lab.",
      "I want them to learn from people and generalize safely.",
      "From simulation to reality, with structure and rigor.",
      "Data, learning, evaluation — repeated until it works."
    ];

    const TYPE_MS = 35;
    const DELETE_MS = 22;
    const HOLD_MS = 1100;
    const BETWEEN_MS = 450;

    async function typeLine(text) {
      homeEl.textContent = "";
      for (let i = 0; i < text.length; i++) {
        homeEl.textContent += text[i];
        await sleep(TYPE_MS);
      }
    }

    async function deleteLine() {
      while (homeEl.textContent.length > 0) {
        homeEl.textContent = homeEl.textContent.slice(0, -1);
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
  }

  // ========== Home page: the name types itself once, then stays ==========
  const nameEl = document.getElementById("home-name");
  if (nameEl) {
    const typed = nameEl.querySelector(".name-typed");
    const full = (nameEl.getAttribute("aria-label") || nameEl.textContent).trim();
    const reduce = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const NAME_START_MS = 350;
    const NAME_TYPE_MS = 130;
    const NAME_CURSOR_HOLD_MS = 1400;

    if (typed) {
      nameEl.classList.add("is-typing");
      if (reduce) {
        typed.textContent = full;
        nameEl.classList.add("is-done");
      } else {
        (async () => {
          typed.textContent = "";
          await sleep(NAME_START_MS);
          for (let i = 0; i < full.length; i++) {
            typed.textContent += full[i];
            await sleep(NAME_TYPE_MS);
          }
          await sleep(NAME_CURSOR_HOLD_MS);
          nameEl.classList.add("is-done");
        })();
      }
    }
  }

  // ========== Research page: types once, cursor stays ==========
  const researchEl = document.getElementById("tw-research");
  if (researchEl) {
    const text = researchEl.dataset.text || "I am building something interesting...";
    const TYPE_MS = 40;

    async function typeOnce() {
      researchEl.textContent = "";
      for (let i = 0; i < text.length; i++) {
        researchEl.textContent += text[i];
        await sleep(TYPE_MS);
      }
    }

    typeOnce();
  }
})();
