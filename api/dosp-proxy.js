import { URLSearchParams } from "url";

export default async function handler(req, res) {
    // URL real do DOSP
    const targetUrl = "https://diariooficial.prefeitura.sp.gov.br/md_epubli_controlador.php?acao=materias_pesquisar";

    // transforma o body em x-www-form-urlencoded
    const formBody = new URLSearchParams(req.body).toString();

    const r = await fetch(targetUrl, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: formBody
    });

    const text = await r.text();

    // adiciona os cabeçalhos de CORS
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "GET,POST,OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type");
    res.setHeader("Content-Type", "text/html; charset=utf-8");

    // retorna o HTML do DOSP para o navegador
    res.status(200).send(text);
}
