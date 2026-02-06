(function () {
  const $ = (sel) => document.querySelector(sel);

  const terminal = $("#terminal");
  const output = $("#term-output");
  const input = $("#term-input");

  if (!terminal || !output || !input) return;

  const BASE = (document.documentElement.getAttribute("data-baseurl") || "").replace(/\/$/, "");

  // ====== EDIT THIS SECTION (your profile data) ======
  const PROFILE = {
    name: "Ke Wang",
    tagline: "MS @ Stanford | Robotics | RL | Safe Control",
    email: "ke@stanford.edu",
    github: "https://github.com/ZJU-Walker",
    scholar: "",     // put your Google Scholar link here
    website: "",     // optional: your personal site link
    linkedin: "",    // optional
    x: "",           // optional
  };

  // Publications / Preprints (edit freely)
  // key: used by `bib <key>`
  const PUBS = [
    {
      key: "egopi",
      title: "Ego-Pi",
      venue: "CVPR 2026 submission",
      year: "2026",
      authors: "Ke Wang*, ...",
      link: "", // arXiv / project page / pdf
      bibtex: `@inproceedings{egopi2026,
  title     = {Ego-Pi},
  author    = {Wang, Ke and ...},
  booktitle = {Conference on Computer Vision and Pattern Recognition (CVPR)},
  year      = {2026}
}`
    },
  ];

  // Updates / changelog style (edit freely)
  const NEWS = [
    { date: "2026-02-06", text: "Website launched (terminal academic panel)." },
  ];

  // ====== End editable section ======

  // ---- utilities ----
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

  function printLink(text, href) {
    const div = document.createElement("div");
    div.className = "term-line";
    const a = document.createElement("a");
    a.href = href;
    a.textContent = text;
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

  // ---- commands ----
  const HELP = [
    "Academic terminal panel — commands:",
    "  help                      show this help",
    "  whoami                    short bio",
    "  links                     important links (scholar/github/etc.)",
    "  pub                       list publications/preprints",
    "  bib <key>                 print BibTeX and copy to clipboard (e.g., bib egopi)",
    "  cv                        open CV page",
    "  email                     show email",
    "  copy email                copy email to clipboard",
    "  news                      recent updates",
    "  theme light|dark|auto      set theme",
    "  clear                     clear screen",
  ].join("\n");

  function cmd_whoami() {
    print(`${PROFILE.name}`);
    print(`${PROFILE.tagline}`, "term-muted");
    printBlank();
    print("Try: pub | bib egopi | links | theme dark", "term-muted");
  }

  function cmd_links() {
    if (PROFILE.github) printLink(`github: ${PROFILE.github}`, PROFILE.github);
    if (PROFILE.scholar) printLink(`scholar: ${PROFILE.scholar}`, PROFILE.scholar);
    if (PROFILE.linkedin) printLink(`linkedin: ${PROFILE.linkedin}`, PROFILE.linkedin);
    if (PROFILE.x) printLink(`x: ${PROFILE.x}`, PROFILE.x);
    if (PROFILE.website) printLink(`site: ${PROFILE.website}`, PROFILE.website);
    if (!PROFILE.github && !PROFILE.scholar && !PROFILE.linkedin && !PROFILE.x && !PROFILE.website) {
      print("No links configured yet. Edit PROFILE in assets/terminal.js", "term-muted");
    }
  }

  function cmd_pub() {
    if (!PUBS.length) {
      print("No publications configured yet. Edit PUBS in assets/terminal.js", "term-muted");
      return;
    }
    PUBS.forEach((p) => {
      print(`${p.key}  ${p.year}  ${p.venue}`, "term-muted");
      print(`${p.title}`);
      if (p.authors) print(`${p.authors}`, "term-muted");
      if (p.link) printLink(`open: ${p.link}`, p.link);
      printBlank();
    });
    print("Tip: use `bib <key>` to copy BibTeX.", "term-muted");
  }

  async function cmd_bib(arg) {
    const key = (arg || "").toLowerCase();
    const p = PUBS.find((x) => x.key.toLowerCase() === key);
    if (!p) {
      print(`bib: unknown key '${arg}'. Try: pub`, "term-muted");
      return;
    }
    if (!p.bibtex) {
      print(`bib: no bibtex for '${key}' yet. Edit PUBS in assets/terminal.js`, "term-muted");
      return;
    }
    printBlock(p.bibtex);
    const ok = await copyToClipboard(p.bibtex);
    print(ok ? "Copied BibTeX to clipboard." : "Could not copy automatically (browser blocked).", "term-muted");
  }

  function cmd_cv() {
    // opens your cv page (cv.md). If you later have a PDF, we can point to it.
    openPath("/cv");
  }

  function cmd_email() {
    print(PROFILE.email || "No email configured.", PROFILE.email ? "" : "term-muted");
  }

  async function cmd_copy_email() {
    if (!PROFILE.email) {
      print("No email configured.", "term-muted");
      return;
    }
    const ok = await copyToClipboard(PROFILE.email);
    print(ok ? "Copied email to clipboard." : "Could not copy automatically (browser blocked).", "term-muted");
  }

  function cmd_news() {
    if (!NEWS.length) {
      print("No updates yet.", "term-muted");
      return;
    }
    NEWS.forEach((n) => print(`${n.date}  ${n.text}`));
  }

  function clear() {
    output.innerHTML = "";
  }

  // ---- runner ----
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
        printBlock(HELP);
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
  print("Type 'help' for commands. Try: pub | bib egopi | theme dark", "term-muted");
  printBlank();

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
