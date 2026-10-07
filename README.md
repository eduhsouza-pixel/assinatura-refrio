# Gerador de Assinaturas — Refrio

Site estático para gerar assinaturas de e-mail padronizadas da Refrio by Elgin.

- **Individual:** cada colaborador preenche os dados e copia a assinatura.
- **Em lote:** cole/envie um CSV (`nome;cargo;departamento;email;telefone;ramal;celular;whatsapp`) e baixe todas em `.zip` (HTML + PNG).
- **Empresa:** modelo, logos, banner de campanha, redes sociais, cores e aviso legal. Use "Exportar config.js" e faça commit para virar padrão para todos.

Publicado via GitHub Pages em https://assinatura.tininja.net

## Arquivos
- `config.js` — dados padrão da empresa (edite aqui).
- `signature.js` — HTML da assinatura (tabelas + estilos inline, compatível com Gmail/Outlook).
- `assets/` — logos e ícones servidos por URL pública.
- `assets.js` — as mesmas imagens em base64 (gerado), usadas na prévia e no PNG.

Ícones: Font Awesome Free (CC BY 4.0).
