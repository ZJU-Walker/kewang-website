(function () {
  const $ = (sel) => document.querySelector(sel);

  const terminal = $("#terminal");
  const output = $("#term-output");
  const input = $("#term-input");

  if (!terminal || !output || !input) return;

  // 🔑 Read baseurl from <html data-baseurl="...">
  const BASE = (document.documentElement.getAttribute("data-baseurl") || "")
    .replace(/\/$/, "");

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
    research:
      "Humanoids (VLA), Safe RL/MPC/CBF, Onboard drone navigation.",
    publications:
      "Ego-Pi (CVPR 2026 submission) + more papers/preprints.",
    cv: "Education, research, experience. (PDF coming soon.)",
  };

  function print(text, cls = "") {
    const div = document.createElement("div");
    div.className = `term-line ${cls}`.trim();
    div.textContent = text;
    output.appendChild(div);
    output.scrollTop = output.scrollHeight;
  }

  function printBlock(text, cls = "") {
    text.split("\n").forEach((line) => print(line, cls));
  }

  function banner() {
    printBlock("kewang.ai terminal", "term-muted");
    printBlock("Type 'help' to see commands.", "term-muted");
    print("");
  }

  function cmd_ls() {
    printBlock(Object.keys(pages).map((k) => `- ${k}`).join("\n"));
  }

  function cmd_open(arg) {
    const key = (arg || "").toLowerCase();
    if (!pages[key]) {
      print(`open: unknown page '${arg}'. Try: ls`, "term-muted");
      return;
    }
    print(`Opening ${key} ...`, "term-muted");
    window.location.href = `${BASE}${pages[key]}`;
  }

  function cmd_cat(arg) {
    const key = (arg || "").toLowerCase();
    if (!PREVIEWS[key]) {
      print(`cat: unknown page '${arg}'. Try: ls`, "term-muted");
      return;
    }
    printBlock(PREVIEWS[key]);
  }

  function cmd_whoami() {
    printBlock(
      [
        "Ke Wang",
        "MS @ Stanford | Robotics | RL | Safe Control",
        "",
        "Try: ls  | open research | cat publications",
      ].join("\n")
    );
  }

  function clear() {
    output.innerHTML = "";
  }

  function run(raw) {
    const line = raw.trim();
    if (!line) return;

    print(`$ ${line}`, "term-accent");

    const [cmd, ...rest] = line.split(/\s+/);
    const arg = rest.join(" ");

    switch (cmd.toLowerCase()) {
      case "help":
        printBlock(HELP);
        break;
      case "ls":
        cmd_ls();
        break;
      case "open":
        cmd_open(arg);
        break;
      case "cat":
        cmd_cat(arg);
        break;
      case "whoami":
        cmd_whoami();
        break;
      case "clear":
        clear();
        break;
      default:
        print(`command not found: ${cmd}`, "term-muted");
        print("Type 'help' to see available commands.", "term-muted");
    }

    print("");
  }

  banner();

  input.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      const v = input.value;
      input.value = "";
      run(v);
    } else if (e.key === "Escape") {
      input.value = "";
    }
  });

  terminal.addEventListener("click", () => input.focus());
  input.focus();
})();
