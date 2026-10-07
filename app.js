(function () {
  const $ = (s, el = document) => el.querySelector(s);
  const $$ = (s, el = document) => [...el.querySelectorAll(s)];
  const ASSETS = window.REFRIO_ASSETS;
  const PADRAO = JSON.parse(JSON.stringify(window.REFRIO_CONFIG));

  // ---------- armazenamento local (tolerante a falhas) ----------
  const store = {
    get(k, def) { try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : def; } catch { return def; } },
    set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); return true; } catch { return false; } },
    del(k) { try { localStorage.removeItem(k); } catch {} },
  };

  const mesclar = (base, extra) => {
    const out = JSON.parse(JSON.stringify(base));
    for (const [k, v] of Object.entries(extra || {})) {
      out[k] = v && typeof v === "object" && !Array.isArray(v) ? mesclar(out[k] || {}, v) : v;
    }
    return out;
  };

  let cfg = mesclar(PADRAO, store.get("refrio-cfg", {}));
  let imgs = store.get("refrio-imgs", {}); // uploads: logo, logoBranco, banner (data URI)
  let pessoa = store.get("refrio-pessoa", { whatsapp: true });
  let lote = [];
  let selecionado = null; // índice no lote, ou null = formulário individual

  const atual = () => (selecionado !== null && lote[selecionado]) || pessoa;
  const caminho = (obj, path) => path.split(".").reduce((o, k) => o?.[k], obj);
  const definir = (obj, path, val) => { const ks = path.split("."); const last = ks.pop(); ks.reduce((o, k) => (o[k] ??= {}), obj)[last] = val; };

  // ---------- imagens ----------
  // embutir=true → sempre data URI (prévia e PNG); false → URL pública quando configurada.
  function resolver(embutir) {
    return (key) => {
      if (key === "banner") return imgs.banner || cfg.banner || "";
      if (imgs[key]) return imgs[key];
      const a = ASSETS[key];
      if (!a) return "";
      if (!embutir && cfg.baseUrl) return cfg.baseUrl.replace(/\/*$/, "/") + a.path;
      return a.data;
    };
  }
  const gerar = (p, embutir) => Assinatura.html(p, cfg, resolver(embutir));

  function avisoImagens() {
    const el = $("#aviso-img");
    const msgs = [];
    if (!cfg.baseUrl) msgs.push("Sem <b>URL pública</b> configurada (aba Empresa): as imagens vão embutidas. Funciona no Outlook desktop e Apple Mail, mas o <b>Gmail remove imagens embutidas</b>.");
    else if (imgs.logo || imgs.logoBranco || imgs.banner) msgs.push("Imagens enviadas manualmente vão embutidas. Para o Gmail, publique-as e use a versão por URL.");
    el.innerHTML = msgs.join("<br>");
    el.hidden = !msgs.length;
  }

  // ---------- prévia ----------
  function render() {
    $("#preview").innerHTML = gerar(atual(), true);
    avisoImagens();
  }

  // ---------- formulário individual ----------
  const camposPessoa = ["nome", "cargo", "departamento", "email", "telefone", "ramal", "celular"];
  function carregarPessoa() {
    camposPessoa.forEach((c) => ($("#p-" + c).value = pessoa[c] || ""));
    $("#p-whatsapp").checked = !!pessoa.whatsapp;
  }
  camposPessoa.forEach((c) =>
    $("#p-" + c).addEventListener("input", (e) => { pessoa[c] = e.target.value.trim(); store.set("refrio-pessoa", pessoa); selecionado = null; marcarLote(); render(); })
  );
  $("#p-whatsapp").addEventListener("change", (e) => { pessoa.whatsapp = e.target.checked; store.set("refrio-pessoa", pessoa); render(); });

  // ---------- configuração da empresa ----------
  function carregarCfg() {
    $$("[id^='c-']").forEach((el) => { el.value = caminho(cfg, el.id.slice(2)) ?? ""; });
    $$("input[name=modelo]").forEach((r) => (r.checked = r.value === cfg.modelo));
  }
  function salvarCfg() { store.set("refrio-cfg", cfg); render(); }
  $$("[id^='c-']").forEach((el) =>
    el.addEventListener("input", () => { definir(cfg, el.id.slice(2), el.type === "color" ? el.value : el.value.trim()); salvarCfg(); })
  );
  $$("input[name=modelo]").forEach((r) => r.addEventListener("change", () => { cfg.modelo = r.value; salvarCfg(); }));

  $$("input[data-img]").forEach((inp) =>
    inp.addEventListener("change", () => {
      const f = inp.files[0];
      if (!f) return;
      const rd = new FileReader();
      rd.onload = () => {
        imgs[inp.dataset.img] = rd.result;
        if (!store.set("refrio-imgs", imgs)) toast("Imagem grande demais para salvar no navegador — vale só nesta sessão.");
        render();
      };
      rd.readAsDataURL(f);
      inp.value = "";
    })
  );
  $$("[data-reset]").forEach((b) =>
    b.addEventListener("click", () => {
      delete imgs[b.dataset.reset];
      if (b.dataset.reset === "banner") { cfg.banner = ""; $("#c-banner").value = ""; store.set("refrio-cfg", cfg); }
      store.set("refrio-imgs", imgs);
      render();
    })
  );

  $("#cfg-reset").addEventListener("click", () => {
    if (!confirm("Restaurar as configurações padrão do config.js? (imagens enviadas também serão removidas)")) return;
    cfg = JSON.parse(JSON.stringify(PADRAO)); imgs = {};
    store.del("refrio-cfg"); store.del("refrio-imgs");
    carregarCfg(); render(); toast("Configurações restauradas");
  });

  $("#cfg-exportar").addEventListener("click", () => {
    const js = "// Configuração padrão da empresa — vale para TODAS as assinaturas.\n" +
      "// Gerado pelo painel \"Empresa\" do gerador de assinaturas.\n" +
      "window.REFRIO_CONFIG = " + JSON.stringify(cfg, null, 2) + ";\n";
    baixar("config.js", js, "text/javascript");
    if (imgs.logo || imgs.logoBranco || imgs.banner) toast("Imagens enviadas não vão no config.js — salve-as em assets/ e publique.");
  });

  // ---------- abas e fundo ----------
  $$(".tab").forEach((t) =>
    t.addEventListener("click", () => {
      $$(".tab").forEach((x) => x.classList.toggle("active", x === t));
      $$(".tabpane").forEach((p) => p.classList.toggle("active", p.id === "tab-" + t.dataset.tab));
      if (t.dataset.tab === "individual" && selecionado !== null) { selecionado = null; marcarLote(); render(); }
    })
  );
  $$("#bg-toggle button").forEach((b) =>
    b.addEventListener("click", () => {
      $$("#bg-toggle button").forEach((x) => x.classList.toggle("active", x === b));
      $("#mail").classList.toggle("dark", b.dataset.bg === "dark");
    })
  );

  // ---------- utilidades ----------
  let toastTimer;
  function toast(msg) {
    const el = $("#toast");
    el.textContent = msg; el.classList.add("show");
    clearTimeout(toastTimer); toastTimer = setTimeout(() => el.classList.remove("show"), 2600);
  }
  function baixar(nome, conteudo, tipo) {
    const blob = conteudo instanceof Blob ? conteudo : new Blob([conteudo], { type: tipo + ";charset=utf-8" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob); a.download = nome;
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 1500);
  }
  const slug = (s) => (s || "assinatura").normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^\w]+/g, "-").replace(/^-|-$/g, "").toLowerCase() || "assinatura";
  const documento = (p) => `<!DOCTYPE html>\n<html lang="pt-BR"><head><meta charset="utf-8"><title>Assinatura — ${p.nome || ""}</title></head>\n<body style="margin:0;padding:0">\n${gerar(p, false)}\n</body></html>\n`;

  async function copiarRico(p) {
    const html = gerar(p, false);
    const txt = Assinatura.texto(p, cfg);
    try {
      await navigator.clipboard.write([new ClipboardItem({
        "text/html": new Blob([html], { type: "text/html" }),
        "text/plain": new Blob([txt], { type: "text/plain" }),
      })]);
    } catch {
      // Fallback: seleciona um bloco renderizado e usa o copiar nativo
      const tmp = document.createElement("div");
      tmp.style.cssText = "position:fixed;left:-9999px;top:0;background:#fff";
      tmp.innerHTML = html; document.body.appendChild(tmp);
      const r = document.createRange(); r.selectNodeContents(tmp);
      const sel = getSelection(); sel.removeAllRanges(); sel.addRange(r);
      document.execCommand("copy"); sel.removeAllRanges(); tmp.remove();
    }
    toast("Assinatura copiada — cole no seu e-mail");
  }

  async function png(p) {
    const box = document.createElement("div");
    box.style.cssText = "position:fixed;left:-10000px;top:0;background:#fff;padding:20px;display:inline-block";
    box.innerHTML = gerar(p, true);
    document.body.appendChild(box);
    try {
      const canvas = await html2canvas(box, { scale: 2, backgroundColor: "#ffffff", useCORS: true, logging: false });
      return await new Promise((res) => canvas.toBlob(res, "image/png"));
    } finally { box.remove(); }
  }

  // ---------- ações ----------
  $("#copiar").addEventListener("click", () => copiarRico(atual()));
  $("#copiar-html").addEventListener("click", async () => {
    const html = gerar(atual(), false);
    try { await navigator.clipboard.writeText(html); toast("Código HTML copiado"); }
    catch { baixar(slug(atual().nome) + ".html", html, "text/html"); }
  });
  $("#baixar-htm").addEventListener("click", () => baixar(slug(atual().nome) + ".htm", documento(atual()), "text/html"));
  $("#baixar-png").addEventListener("click", async () => {
    if (!window.html2canvas) return toast("Não foi possível carregar o gerador de PNG (sem internet?)");
    toast("Gerando PNG…");
    baixar(slug(atual().nome) + ".png", await png(atual()));
  });

  // ---------- lote / CSV ----------
  const norm = (s) => String(s || "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().trim();
  const ALIAS = {
    nome: ["nome", "nome completo", "name"], cargo: ["cargo", "funcao", "função", "title"], departamento: ["departamento", "setor", "area"],
    email: ["email", "e-mail"], telefone: ["telefone", "fone", "tel", "fixo"], ramal: ["ramal"], celular: ["celular", "cel", "mobile"],
    whatsapp: ["whatsapp", "whats", "zap"],
  };
  const ORDEM = ["nome", "cargo", "departamento", "email", "telefone", "ramal", "celular", "whatsapp"];

  function parseLinha(linha, sep) {
    const out = []; let cur = ""; let q = false;
    for (let i = 0; i < linha.length; i++) {
      const c = linha[i];
      if (q) { if (c === '"') { if (linha[i + 1] === '"') { cur += '"'; i++; } else q = false; } else cur += c; }
      else if (c === '"') q = true;
      else if (c === sep) { out.push(cur); cur = ""; }
      else cur += c;
    }
    out.push(cur);
    return out.map((s) => s.trim());
  }

  function parseCSV(texto) {
    const linhas = texto.replace(/\r/g, "").split("\n").filter((l) => l.trim());
    if (!linhas.length) return [];
    const primeira = linhas[0];
    const sep = primeira.includes("\t") ? "\t" : primeira.split(";").length >= primeira.split(",").length ? ";" : ",";
    let cab = parseLinha(primeira, sep).map(norm);
    let mapa;
    if (cab.some((h) => ALIAS.nome.includes(h))) {
      mapa = cab.map((h) => Object.keys(ALIAS).find((k) => ALIAS[k].map(norm).includes(h)) || null);
      linhas.shift();
    } else mapa = ORDEM;
    return linhas.map((l) => {
      const cols = parseLinha(l, sep); const p = {};
      mapa.forEach((k, i) => { if (k) p[k] = cols[i] || ""; });
      p.whatsapp = /^(s|sim|y|yes|x|1|true|verdadeiro)$/i.test(norm(p.whatsapp));
      return p;
    }).filter((p) => p.nome);
  }

  function marcarLote() { $$(".lote-item").forEach((el, i) => el.classList.toggle("sel", i === selecionado)); }

  function listarLote() {
    const box = $("#lote-lista");
    box.innerHTML = "";
    lote.forEach((p, i) => {
      const el = document.createElement("div");
      el.className = "lote-item";
      el.innerHTML = `<div class="who"><b></b><span></span></div>
        <button class="btn ghost small" data-a="copiar">Copiar</button>
        <button class="btn ghost small" data-a="htm">.htm</button>`;
      el.querySelector("b").textContent = p.nome;
      el.querySelector("span").textContent = [p.cargo, p.email].filter(Boolean).join(" · ");
      el.addEventListener("click", (e) => {
        selecionado = i; marcarLote(); render();
        const a = e.target.dataset.a;
        if (a === "copiar") copiarRico(p);
        if (a === "htm") baixar(slug(p.nome) + ".htm", documento(p), "text/html");
      });
      box.appendChild(el);
    });
    $("#zip-baixar").disabled = !lote.length;
  }

  $("#csv-gerar").addEventListener("click", () => {
    lote = parseCSV($("#csv-text").value);
    selecionado = lote.length ? 0 : null;
    listarLote(); marcarLote(); render();
    toast(lote.length ? `${lote.length} assinatura(s) gerada(s)` : "Nenhuma linha válida encontrada");
  });
  $("#csv-file").addEventListener("change", (e) => {
    const f = e.target.files[0]; if (!f) return;
    const rd = new FileReader();
    rd.onload = () => { $("#csv-text").value = rd.result; $("#csv-gerar").click(); };
    rd.readAsText(f, "utf-8");
    e.target.value = "";
  });
  $("#csv-modelo").addEventListener("click", () =>
    baixar("modelo-assinaturas.csv", "﻿nome;cargo;departamento;email;telefone;ramal;celular;whatsapp\nAna Souza;Gerente Comercial;Vendas;ana.souza@refrio.com;+55 19 3333-0000;210;+55 19 99999-0000;sim\n", "text/csv")
  );
  $("#zip-baixar").addEventListener("click", async () => {
    if (!window.JSZip) return toast("Não foi possível carregar o compactador (sem internet?)");
    const btn = $("#zip-baixar"); btn.disabled = true;
    const zip = new JSZip(); const usados = {};
    for (let i = 0; i < lote.length; i++) {
      const p = lote[i];
      btn.textContent = `Gerando ${i + 1}/${lote.length}…`;
      let base = slug(p.nome); if (usados[base]) base += "-" + ++usados[base]; else usados[base] = 1;
      zip.file(`htm/${base}.htm`, documento(p));
      if (window.html2canvas) zip.file(`png/${base}.png`, await png(p));
    }
    baixar("assinaturas-refrio.zip", await zip.generateAsync({ type: "blob" }));
    btn.textContent = "Baixar todas (.zip)"; btn.disabled = false;
  });

  // ---------- início ----------
  carregarPessoa();
  carregarCfg();
  render();
})();
