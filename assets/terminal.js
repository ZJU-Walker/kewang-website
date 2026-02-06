(function () {
  const $ = (sel) => document.querySelector(sel);

  const terminal = $("#terminal");
  const output = $("#term-output");
  const input = $("#term-input");

  if (!terminal || !output || !input) return;

  // Read baseurl from <html data-baseurl="...">
  const BASE = (document.documentElement.getAttribute("data-baseurl") || "")
    .replace(/\/$/, "");

  // ======== TYPING / SSH FEEL SETTINGS (tweak these) ========
  const TYPE_CHAR_MS = 12;        // per character typing speed
  const LINE_GAP_MS = 120;        // pause between lines
  const CMD_DELAY_MS = 180;       // delay before command output starts
  const SSH_CONNECT_MS = 220;     // "connecting..." delay for open
  const MAX_FAST_CHARS = 2000;    // avoid too-slow typing for huge text
  // ===========================================================

  const pages = {
    about: "/about",
    research: "/research",
    publications: "/publications",
    cv: "/cv",
  };

  const HELP = [
    "Available commands:",
    "  help                Show this help",
    "  ls                  List pages",
    "  open <page>         Open a page (about/research/publications/cv)",
    "  cat <page>          Print a short preview",
    "  clear               Clear screen",
    "  whoami              About me",
  ].join("\n");

  const PREVIEWS = {
    about: "Ke Wang — MS @ Stanford.\nRobotics, RL, safety-critical control.",
    research: "Humanoids (VLA), Safe RL/MPC/CBF, Onboard drone navigation.",
    publications: "Ego-Pi (CVPR 2026 submission) + more papers/preprints.",
    cv: "Education, research, experience. (PDF coming soon.)",
  };

  // --- printing helpers ---
  function makeLine(cls = "") {
    const div = document.createElement("div");
    div.className = `term-line ${cls}`.trim();
    div.textContent = "";
    output.appendChild(div);
    output.scrollTop = output.scrollHeight;
    return div;
  }

  function scrollToBottom() {
    output.scrollTop = output.scrollHeight;
  }

  function sleep(ms) {
    return new Promise((r) => setTimeout(r, ms));
  }

  // Typewriter printing: types a string into a line element
  async function typeIntoLine(el, text, charMs = TYPE_CHAR_MS) {
    // If text is huge, don't type every char forever
    const shouldFast = text.length > MAX_FAST_CHARS;
    const ms = shouldFast ? Math.max(1, Math.floor(charMs / 4)) : charMs;

    for (let i = 0; i < text.length; i++) {
      el.textContent += text[i];
      scrollToBottom();
      await sleep(ms);
    }
  }

  // Print one line instantly
  function print(text, cls = "") {
    const el = makeLine(cls);
    el.textContent = text;
    scrollToBottom();
  }

  // Print multiple lines with typewriter (each line typed)
  async function typeBlock(text, cls = "") {
    const lines = text.split("\n");
    for (const line of lines) {
      const el = makeLine(cls);
      await typeIntoLine(el, line);
      await sleep(LINE_GAP_MS);
    }
  }

  // Print multiple lines instantly
  function printBlock(text, cls = "") {
    text.split("\n").forEach((line) => print(line, cls));
  }

  // Command lock to avoid overlapping outputs if user spams Enter
  let busy = false;
  function setBusy(v) {
    busy = v;
    input.disabled = v;
    input.placeholder = v ? "running..." : "help / ls / open research";
    if (!v) input.focus();
  }

  // --- banner (typed) ---
  async function banner() {
    await typeBlock("kewang.ai terminal", "term-muted");
    await typeBlock("Type 'help' to see commands.", "term-muted");
    print("");
  }

  // --- commands (some typed) ---
  async function cmd_ls() {
    // small output can still be typed for feel
    const list = Object.keys(pages).map((k) => `- ${k}`).join("\n");
    await typeBlock(list);
  }

  async function cmd_help() {
    await typeBlock(HELP);
  }

  async function cmd_cat(arg) {
    const key = (arg || "").toLowerCase();
    if (!PREVIEWS[key]) {
      await typeBlock(`cat: unknown page '${arg}'. Try: ls`, "term-muted");
      return;
    }
    await typeBlock(PREVIEWS[key]);
  }

  async function cmd_whoami() {
    await typeBlock(
      [
        "Ke Wang",
        "MS @ Stanford | Robotics | RL | Safe Control",
        "",
        "Try: ls  | open research | cat publications",
      ].join("\n")
    );
  }

  async function cmd_open(arg) {
    const key = (arg || "").toLowerCase();
    if (!pages[key]) {
      await typeBlock(`open: unknown page '${arg}'. Try: ls`, "term-muted");
      return;
    }

    // SSH-ish connect sequence
    await typeBlock(`Connecting to ${key}...`, "term-muted");
    await sleep(SSH_CONNECT_MS);
    await typeBlock("Authenticated.", "term-muted");
    await sleep(120);
    await typeBlock(`Opening ${key} ...`, "term-muted");
    await sleep(120);

    window.location.href = `${BASE}${pages[key]}`;
  }

  function clear() {
    output.innerHTML = "";
  }

  // --- runner ---
  async function run(raw) {
    const line = raw.trim();
    if (!line) return;

    setBusy(true);

    // Echo prompt line (instant)
    print(`$ ${line}`, "term-accent");

    const [cmd, ...rest] = line.split(/\s+/);
    const arg = rest.join(" ");

    // Small delay before output starts (feels like network/processing)
    await sleep(CMD_DELAY_MS);

    switch (cmd.toLowerCase()) {
      case "help":
        await cmd_help();
        break;
      case "ls":
        await cmd_ls();
        break;
      case "open":
        await cmd_open(arg);
        break;
      case "cat":
        await cmd_cat(arg);
        break;
      case "whoami":
        await cmd_whoami();
        break;
      case "clear":
        clear();
        break;
      default:
        await typeBlock(`command not found: ${cmd}`, "term-muted");
        await typeBlock("Type 'help' to see available commands.", "term-muted");
    }

    print(""); // spacing
    setBusy(false);
  }

  // init typed banner
  (async () => {
    setBusy(true);
    await banner();
    setBusy(false);
  })();

  input.addEventListener("keydown", (e) => {
    if (e.key === "Enter" && !busy) {
      const v = input.value;
      input.value = "";
      run(v);
    } else if (e.key === "Escape") {
      input.value = "";
    }
  });

  terminal.addEventListener("click", () => input.focus());
})();
