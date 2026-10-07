// Monta o HTML da assinatura. Só tabelas e estilos inline — é o que Gmail e Outlook respeitam.
(function () {
  const FONT = "Arial,Helvetica,sans-serif";

  const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const digits = (s) => String(s || "").replace(/\D/g, "");
  const semProtocolo = (u) => String(u || "").replace(/^https?:\/\//, "").replace(/\/$/, "");

  function contatos(p, cfg) {
    const itens = [];
    if (p.telefone) {
      const ramal = p.ramal ? ` &nbsp;<span style="color:${cfg.cores.suave}">Ramal ${esc(p.ramal)}</span>` : "";
      itens.push({ icon: "phone", html: `<a href="tel:+${digits(p.telefone)}" style="color:${cfg.cores.texto};text-decoration:none">${esc(p.telefone)}</a>${ramal}` });
    } else if (cfg.telefoneEmpresa) {
      itens.push({ icon: "phone", html: `<a href="tel:+${digits(cfg.telefoneEmpresa)}" style="color:${cfg.cores.texto};text-decoration:none">${esc(cfg.telefoneEmpresa)}</a>` });
    }
    if (p.celular) {
      const href = p.whatsapp ? `https://wa.me/${digits(p.celular)}` : `tel:+${digits(p.celular)}`;
      itens.push({ icon: p.whatsapp ? "whatsapp" : "mobile", html: `<a href="${href}" style="color:${cfg.cores.texto};text-decoration:none">${esc(p.celular)}</a>` });
    }
    if (p.email) {
      itens.push({ icon: "email", html: `<a href="mailto:${esc(p.email)}" style="color:${cfg.cores.texto};text-decoration:none">${esc(p.email)}</a>` });
    }
    if (cfg.site) {
      itens.push({ icon: "web", html: `<a href="${esc(cfg.site)}" style="color:${cfg.cores.marinho};text-decoration:none;font-weight:bold">${esc(semProtocolo(cfg.site))}</a>` });
    }
    return itens;
  }

  function linhaContato(it, img) {
    return `<tr><td valign="middle" style="padding:0 8px 6px 0;vertical-align:middle;width:18px"><img src="${img(it.icon)}" width="18" height="18" alt="" style="display:block;border:0;width:18px;height:18px"></td>` +
      `<td valign="middle" style="padding:0 18px 6px 0;vertical-align:middle;font-family:${FONT};font-size:12.5px;line-height:18px;white-space:nowrap">${it.html}</td></tr>`;
  }

  function blocoContatos(itens, img) {
    if (!itens.length) return "";
    const meio = Math.ceil(itens.length / 2);
    const col = (arr) => `<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="border-collapse:collapse">${arr.map((it) => linhaContato(it, img)).join("")}</table>`;
    const segunda = itens.slice(meio);
    return `<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="border-collapse:collapse;margin-top:12px"><tr>` +
      `<td valign="top" style="vertical-align:top">${col(itens.slice(0, meio))}</td>` +
      (segunda.length ? `<td valign="top" style="vertical-align:top">${col(segunda)}</td>` : "") +
      `</tr></table>`;
  }

  function blocoRedes(cfg, img) {
    const ordem = [["linkedin", "LinkedIn"], ["instagram", "Instagram"], ["facebook", "Facebook"], ["youtube", "YouTube"]];
    const redes = ordem.filter(([k]) => cfg.redes[k]);
    const endereco = cfg.endereco
      ? `<td valign="middle" style="vertical-align:middle;padding-left:${redes.length ? 10 : 0}px;font-family:${FONT};font-size:11.5px;color:${cfg.cores.suave};white-space:nowrap">` +
        `<img src="${img("pin")}" width="14" height="14" alt="" style="vertical-align:-2px;border:0;width:14px;height:14px">&nbsp;${esc(cfg.endereco)}</td>`
      : "";
    if (!redes.length && !endereco) return "";
    const icones = redes.map(([k, nome]) =>
      `<td style="padding-right:6px"><a href="${esc(cfg.redes[k])}" style="text-decoration:none"><img src="${img(k)}" width="24" height="24" alt="${nome}" title="${nome}" style="display:block;border:0;width:24px;height:24px"></a></td>`
    ).join("");
    return `<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="border-collapse:collapse;margin-top:6px"><tr>${icones}${endereco}</tr></table>`;
  }

  function identidade(p, cfg) {
    const cargo = [p.cargo, p.departamento].filter(Boolean);
    return `<div style="font-family:${FONT};font-size:19px;line-height:24px;font-weight:bold;color:${cfg.cores.marinho};letter-spacing:.2px">${esc(p.nome || "Nome Sobrenome")}</div>` +
      `<div style="font-family:${FONT};font-size:13px;line-height:19px;color:${cfg.cores.azul};font-weight:bold;margin-top:2px">${esc(cargo[0] || "Cargo")}` +
      (cargo[1] ? `<span style="color:${cfg.cores.suave};font-weight:normal"> &nbsp;|&nbsp; ${esc(cargo[1])}</span>` : "") + `</div>`;
  }

  function rodape(cfg, img, colspan) {
    let out = "";
    const banner = img("banner");
    if (banner) {
      const tag = `<img src="${banner}" width="560" alt="${esc(cfg.empresa)}" style="display:block;border:0;width:560px;max-width:100%;height:auto;border-radius:6px">`;
      out += `<tr><td colspan="${colspan}" style="padding-top:14px">${cfg.bannerLink ? `<a href="${esc(cfg.bannerLink)}">${tag}</a>` : tag}</td></tr>`;
    }
    if (cfg.aviso) {
      out += `<tr><td colspan="${colspan}" style="padding-top:12px;font-family:${FONT};font-size:10px;line-height:14px;color:#9AA3B2;max-width:560px">${esc(cfg.aviso).replace(/\n/g, "<br>")}</td></tr>`;
    }
    return out;
  }

  function classica(p, cfg, img) {
    const site = esc(cfg.site || "#");
    return `<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="border-collapse:collapse;font-family:${FONT};color:${cfg.cores.texto}">` +
      `<tr>` +
      `<td valign="middle" style="padding:2px 22px 2px 0;vertical-align:middle"><a href="${site}"><img src="${img("logo")}" width="150" height="85" alt="${esc(cfg.empresa)}" style="display:block;border:0;width:150px;height:85px"></a></td>` +
      `<td width="2" style="width:2px;background-color:${cfg.cores.azul};font-size:0;line-height:0" bgcolor="${cfg.cores.azul}">&nbsp;</td>` +
      `<td valign="middle" style="padding:2px 0 2px 22px;vertical-align:middle">${identidade(p, cfg)}${blocoContatos(contatos(p, cfg), img)}${blocoRedes(cfg, img)}</td>` +
      `</tr>` +
      `<tr><td colspan="3" style="padding-top:16px"><table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="border-collapse:collapse"><tr>` +
      `<td height="4" style="height:4px;width:70%;background-color:${cfg.cores.marinho};font-size:0;line-height:0" bgcolor="${cfg.cores.marinho}">&nbsp;</td>` +
      `<td height="4" style="height:4px;width:12%;background-color:${cfg.cores.azul};font-size:0;line-height:0" bgcolor="${cfg.cores.azul}">&nbsp;</td>` +
      `<td height="4" style="height:4px;font-size:0;line-height:0">&nbsp;</td>` +
      `</tr></table></td></tr>` +
      rodape(cfg, img, 3) +
      `</table>`;
  }

  function faixa(p, cfg, img) {
    const site = esc(cfg.site || "#");
    return `<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="border-collapse:collapse;font-family:${FONT};color:${cfg.cores.texto}">` +
      `<tr>` +
      `<td valign="middle" bgcolor="${cfg.cores.marinho}" style="background-color:${cfg.cores.marinho};padding:22px 24px;vertical-align:middle;border-radius:10px 0 0 10px"><a href="${site}"><img src="${img("logoBranco")}" width="128" height="73" alt="${esc(cfg.empresa)}" style="display:block;border:0;width:128px;height:73px"></a></td>` +
      `<td width="5" bgcolor="${cfg.cores.azul}" style="width:5px;background-color:${cfg.cores.azul};font-size:0;line-height:0">&nbsp;</td>` +
      `<td valign="middle" style="padding:8px 0 8px 22px;vertical-align:middle">${identidade(p, cfg)}${blocoContatos(contatos(p, cfg), img)}${blocoRedes(cfg, img)}</td>` +
      `</tr>` +
      rodape(cfg, img, 3) +
      `</table>`;
  }

  function texto(p, cfg) {
    return [
      p.nome, [p.cargo, p.departamento].filter(Boolean).join(" | "), cfg.empresa,
      p.telefone && `Tel: ${p.telefone}${p.ramal ? " ramal " + p.ramal : ""}`,
      p.celular && `${p.whatsapp ? "WhatsApp" : "Cel"}: ${p.celular}`,
      p.email, semProtocolo(cfg.site), cfg.endereco,
    ].filter(Boolean).join("\n");
  }

  window.Assinatura = {
    html: (p, cfg, img) => (cfg.modelo === "faixa" ? faixa : classica)(p, cfg, img),
    texto,
  };
})();
