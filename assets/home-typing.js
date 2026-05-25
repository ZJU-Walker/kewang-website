(function () {
  const el = document.getElementById("deco-term");
  if (!el) return;

  const lines = [
    "$ git status",
    "On branch master",
    "nothing to commit, working tree clean",
    "",
    "$ ./build_robot.sh --target=humanoid --mode=sim",
    "[1/7] configure ... ok",
    "[2/7] compile controllers ... ok",
    "[3/7] build perception stack ... ok",
    "[4/7] link policies ... ok",
    "[5/7] run unit tests ... ok",
    "[6/7] package artifacts ... ok",
    "[7/7] done ✅",
    "",
    "$ python run_eval.py --task=pick_place --seed=0",
    "success_rate: 0.87",
    "avg_time:  3.2s",
    "",
    "$ echo \"ship it\"",
    "ship it"
  ];

  const TYPE_MS = 12;      // per character
  const LINE_PAUSE_MS = 160;

  function sleep(ms) {
    return new Promise((r) => setTimeout(r, ms));
  }

  async function typeLine(text) {
    for (let i = 0; i < text.length; i++) {
      el.textContent += text[i];
      await sleep(TYPE_MS);
    }
    el.textContent += "\n";
  }

  async function run() {
    el.textContent = "";
    for (const line of lines) {
      if (line === "") {
        el.textContent += "\n";
        await sleep(LINE_PAUSE_MS);
      } else {
        await typeLine(line);
        await sleep(LINE_PAUSE_MS);
      }
    }
  }

  // start once on load
  run();
})();
