(function () {
  const $ = (sel) => document.querySelector(sel);

  const terminal = $("#terminal");
  const output = $("#term-output");
  const input = $("#term-input");

  if (!terminal || !output || !input) return;

  const BASE = (document.documentElement.getAttribute("data-baseurl") || "").replace(/\/$/, "");

  // Data file path (project-site safe)
  const DATA_URL = `${BASE}/assets/panel.json`;

  // Runtime state (loaded from panel.json)
  let DATA = null;

  // ---- helpers ----
  const HISTORY = [];
  let histIdx = -1;

  function makeLine(cls = "") {
    const div = document.createElement("div");
    div.className = `term-line ${cls}`.trim();
    div.textContent = "";
    output.appendChild(div);
    output.scrollTop = output.scrollHeight;
    return div;
  }

  function print(text, cls = "") {
    const el = makeLine(cls);
    el.textContent = text;
  }

  function printBlank() {
    print("");
  }

  function printBlock(text, cls = "") {
    text.split("\n").forEach((line) => print(line, cls));
  }

  function printLink(label, href) {
    const div = document.createElement("div");
    div.className = "term-line";
    const a = document.createElement("a");
    a.href = href;
    a.textContent = label;
    a.className = "term-link";
    a.rel = "noopener noreferrer";
    div.appendChild(a);
    output.appendChild(div);
    output.scrollTop = output.scrollHeight;
  }

  async function copyToClipboard(text) {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch {
      return false;
    }
  }

  function setTheme(mode) {
    // mode: light | dark | auto
    const html = document.documentElement;
    if (mode === "auto") {
      html.removeAttribute("data-theme");
      localStorage.removeItem("theme");
      return;
    }
    html.setAttribute("data-theme", mode);
    localStorage.setItem("theme", mode);
  }

  function applySavedTheme() {
    const saved = localStorage.getItem("theme");
    if (saved === "light" || saved === "dark") setTheme(saved);
  }

  function openPath(path) {
    window.location.href = `${BASE}${path}`;
  }

  async function loadData() {
    const res = await fetch(DATA_URL, { cache: "no-store" });
    if (!res.ok) throw new Error(`Failed to load ${DATA_URL}: ${res.status}`);
    return await res.json();
  }

  // ---- commands ----
  function helpText() {
    return [
      "Academic terminal panel — commands:",
      "  help                      show this help",
      "  whoami                    short bio",
      "  links                     important links (scholar/github/etc.)",
      "  pub                       list publications/preprints",
      "  bib <key>                 print BibTeX and copy to clipboard",
      "  cv                        open CV page",
      "  email                     show email",
      "  copy email                copy email to clipboard",
      "  news                      recent updates",
      "  theme light|dark|auto      set theme",
      "  clear                     clear screen",
    ].join("\n");
  }

  function requireData() {
    if (DATA) return true;
    print("Data not loaded yet. Try again in a moment.", "term-muted");
    return false;
  }

  function cmd_whoami() {
    if (!requireData()) return;
    const p = DATA.profile || {};
    print(p.name || "Ke Wang");
    print(p.tagline || "", "term-muted");
    printBlank();
    print("Try: pub | bib <key> | links | theme dark", "term-muted");
  }

  function cmd_links() {
    if (!requireData()) return;
    const links = (DATA.profile && DATA.profile.links) || {};
    const entries = Object.entries(links).filter(([, v]) => (v || "").trim().length > 0);
    if (!entries.length) {
      print("No links configured in assets/panel.json", "term-muted");
      return;
    }
    for (const [k, v] of entries) {
      printLink(`${k}: ${v}`, v);
    }
  }

  function cmd_pub() {
    if (!requireData()) return;
    const pubs = DATA.publications || [];
    if (!pubs.length) {
      print("No publications configured in assets/panel.json", "term-muted");
      return;
    }
    pubs.forEach((p) => {
      print(`${p.key}  ${p.year}  ${p.venue}`, "term-muted");
      print(`${p.title}`);
      if (p.authors) print(`${p.authors}`, "term-muted");
      if (p.link) printLink(`open: ${p.link}`, p.link);
      printBlank();
    });
    print("Tip: use `bib <key>` to copy BibTeX.", "term-muted");
  }

  async function cmd_bib(arg) {
    if (!requireData()) return;
    const key = (arg || "").toLowerCase();
    const pubs = DATA.publications || [];
    const p = pubs.find((x) => (x.key || "").toLowerCase() === key);
    if (!p) {
      print(`bib: unknown key '${arg}'. Try: pub`, "term-muted");
      return;
    }
    if (!p.bibtex) {
      print(`bib: no bibtex for '${key}' yet (set it in assets/panel.json)`, "term-muted");
      return;
    }
    printBlock(p.bibtex);
    const ok = await copyToClipboard(p.bibtex);
    print(ok ? "Copied BibTeX to clipboard." : "Could not copy automatically (browser blocked).", "term-muted");
  }

  function cmd_cv() {
    openPath("/cv");
  }

  function cmd_email() {
    if (!requireData()) return;
    const email = (DATA.profile && DATA.profile.email) || "";
    if (!email) return print("No email configured in assets/panel.json", "term-muted");
    print(email);
  }

  async function cmd_copy_email() {
    if (!requireData()) return;
    const email = (DATA.profile && DATA.profile.email) || "";
    if (!email) return print("No email configured in assets/panel.json", "term-muted");
    const ok = await copyToClipboard(email);
    print(ok ? "Copied email to clipboard." : "Could not copy automatically (browser blocked).", "term-muted");
  }

  function cmd_news() {
    if (!requireData()) return;
    const news = DATA.news || [];
    if (!news.length) return print("No updates yet (assets/panel.json).", "term-muted");
    news.forEach((n) => print(`${n.date}  ${n.text}`));
  }

  function clear() {
    output.innerHTML = "";
  }

  function echoCmd(line) {
    print(`$ ${line}`, "term-accent");
  }

  async function run(raw) {
    const line = raw.trim();
    if (!line) return;

    HISTORY.push(line);
    histIdx = HISTORY.length;

    echoCmd(line);

    const [cmd, ...rest] = line.split(/\s+/);
    const arg = rest.join(" ");

    switch ((cmd || "").toLowerCase()) {
      case "help":
        printBlock(helpText());
        break;
      case "whoami":
        cmd_whoami();
        break;
      case "links":
        cmd_links();
        break;
      case "pub":
        cmd_pub();
        break;
      case "bib":
        await cmd_bib(arg);
        break;
      case "cv":
        cmd_cv();
        break;
      case "email":
        cmd_email();
        break;
      case "copy":
        if (arg.toLowerCase() === "email") await cmd_copy_email();
        else print("Usage: copy email", "term-muted");
        break;
      case "news":
        cmd_news();
        break;
      case "theme": {
        const m = arg.toLowerCase();
        if (m === "light" || m === "dark" || m === "auto") {
          setTheme(m);
          print(`theme set to ${m}`, "term-muted");
        } else {
          print("Usage: theme light | dark | auto", "term-muted");
        }
        break;
      }
      case "clear":
        clear();
        break;
      default:
        print(`command not found: ${cmd}`, "term-muted");
        print("Type 'help' to see commands.", "term-muted");
    }

    printBlank();
  }

  // init
  applySavedTheme();
  print("Academic terminal panel", "term-muted");
  print(`Loading data: ${DATA_URL}`, "term-muted");
  printBlank();

  loadData()
    .then((json) => {
      DATA = json;
      print("Data loaded. Try: whoami | pub | bib <key> | news", "term-muted");
      printBlank();
    })
    .catch((err) => {
      print(`Failed to load data: ${err.message}`, "term-muted");
      print("Check that assets/panel.json exists and is reachable.", "term-muted");
      printBlank();
    });

  input.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      const v = input.value;
      input.value = "";
      run(v);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      if (!HISTORY.length) return;
      histIdx = Math.max(0, histIdx - 1);
      input.value = HISTORY[histIdx] || "";
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      if (!HISTORY.length) return;
      histIdx = Math.min(HISTORY.length, histIdx + 1);
      input.value = HISTORY[histIdx] || "";
    } else if (e.key === "Escape") {
      input.value = "";
    }
  });

  terminal.addEventListener("click", () => input.focus());
})();
