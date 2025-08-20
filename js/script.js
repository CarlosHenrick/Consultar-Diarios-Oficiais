// script.js
document.addEventListener("DOMContentLoaded", () => {
    consultar();
});

async function consultar() {
    document.getElementById("dou").innerHTML = "<p class='loading'>Consultando...</p>";
    document.getElementById("doesp").innerHTML = "<p class='loading'>Consultando...</p>";
    document.getElementById("dosp").innerHTML = "<p class='loading'>Consultando...</p>";

    consultarDOU();
    consultarDOESP();
    consultarDOSP();
}

async function consultarDOU() {
    try {
        const url = 'https://www.in.gov.br/consulta/-/buscar/dou?q=%22carlos+henrique+araujo+alves%22&s=todos&exactDate=all&sortType=0';
        const res = await fetch(url);
        const html = await res.text();

        const parser = new DOMParser();
        const doc = parser.parseFromString(html, "text/html");

        // pega o conteúdo JSON que está dentro do script
        const scriptTag = doc.querySelector("#_br_com_seatecnologia_in_buscadou_BuscaDouPortlet_params");
        const box = document.getElementById("dou");
        box.innerHTML = "";
        const boxTotal = document.getElementById("dou-total");
        boxTotal.innerHTML = "";

        if (!scriptTag) {
            box.innerHTML = "<p>Não foi possível encontrar resultados.</p>";
            return;
        }

        const data = JSON.parse(scriptTag.textContent);
        const resultados = data.jsonArray || [];

        if (resultados.length === 0) {
            box.innerHTML = "<p>Nenhum resultado encontrado.</p>";
        } else {
            boxTotal.innerHTML = `(${resultados.length} resultados)`;
            resultados.forEach(item => {
                box.innerHTML += `
          <div class="item">
            <b>${item.title}</b> (${item.pubDate})<br>
            <i>${item.artType}</i><br>
            <small>${item.hierarchyStr}</small><br>
            <a href="https://www.in.gov.br/en/web/dou/-/${item.urlTitle}" target="_blank">Acessar publicação</a>
            <hr>
          </div>
        `;
            });
        }

    } catch (e) {
        console.error(e);
        document.getElementById("dou").innerHTML = "<p>Erro na consulta.</p>";
    }
}

async function consultarDOESP() {
    try {
        const fromDate = formatDate(new Date(2023, 10, 1));
        const toDate = formatDate(new Date());
        const url = `https://do-api-web-search.doe.sp.gov.br/v2/advanced-search/publications?periodStartingDate=personalized&PageNumber=1&Terms%5B0%5D=carlos%20henrique%20ara%C3%BAjo%20alves&Terms%5B1%5D=carlos%20henrique%20araujo%20alves&FromDate=${fromDate}&ToDate=${toDate}&PageSize=10000&SortField=Date`;
        const res = await fetch(url);
        const data = await res.json();
        const box = document.getElementById("doesp");
        box.innerHTML = "";
        const boxTotal = document.getElementById("doesp-total");
        boxTotal.innerHTML = "";
        if (data.items.length === 0) {
            box.innerHTML = "<p>Nenhum resultado encontrado.</p>";
        } else {
            boxTotal.innerHTML = `(${data.items.length} resultados)`;
            const resultados = data.items.sort((a, b) => new Date(b.date) - new Date(a.date));
            resultados.forEach(item => {
                box.innerHTML += `
            <div class="item">
                <b>${item.title}</b> (${new Date(item.date).toLocaleDateString("pt-BR")})<br>
                <i>${item.publicationTypeId === "53af8d5d-53db-490b-974e-0a0b20a96dde" ? "Edital" : "Publicação"}</i><br>
                <small>${item.hierarchy}</small><br>
                <a href="https://www.doe.sp.gov.br/${item.slug}" target="_blank">Acessar publicação</a>
                <hr>
            </div>
            `;
            });
        }
    } catch (e) {
        console.log(e);
        document.getElementById("doesp").innerHTML = "<p>Erro na consulta.</p>";
    }
}

async function consultarDOSP() {
    try {
        const urlencoded = new URLSearchParams();
        urlencoded.append("hdnTermoPesquisa", "carlos henrique araujo alves");
        urlencoded.append("hdnTipoPesquisa", "E");
        urlencoded.append("hdnVersaoDiario", "A");
        urlencoded.append("hdnInicio", "0");
        urlencoded.append("hdnVisualizacao", "S");
        urlencoded.append("hdnModoPesquisa", "RAPIDA");
        const res = await fetch("https://diariooficial.prefeitura.sp.gov.br/md_epubli_controlador.php?acao=materias_pesquisar", {
            method: "POST",
            headers: { "Content-Type": "application/x-www-form-urlencoded" },
            body: urlencoded
        });
        const html = await res.text();
        const parser = new DOMParser();
        const doc = parser.parseFromString(html, "text/html");
        const resultados = doc.querySelectorAll(".resultadoItem");
        const box = document.getElementById("dosp");
        box.innerHTML = "";
        const boxTotal = document.getElementById("dosp-total");
        boxTotal.innerHTML = "";
        if (resultados.length === 0) {
            box.innerHTML = "<p>Nenhum resultado encontrado.</p>";
        } else {
            boxTotal.innerHTML = `(${resultados.length} resultados)`;
            resultados.forEach(r => {
                box.innerHTML += `<div class='item'>${r.innerText}</div>`;
            });
        }
    } catch (e) {
        console.log(e);
        document.getElementById("dosp").innerHTML = "<p>Erro na consulta.</p>";
    }
}

function formatDate(date) {
    const y = date.getFullYear();
    const m = date.getMonth() + 1;
    const d = date.getDate();
    return `${y}-${m}-${d}`;
}