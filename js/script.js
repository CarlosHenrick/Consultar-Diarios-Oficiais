// script.js
document.addEventListener("DOMContentLoaded", () => {
    consultar();
    // setInterval(consultar, 60000);
});

async function consultar() {
    consultarDOU();
    consultarDOESP();
    consultarDOSP();
}

async function consultarDOU() {
    try {
        const boxTotal = document.getElementById("dou-total");
        const boxBtn = document.getElementById("dou-btn");
        const box = document.getElementById("dou");

        boxTotal.innerHTML = "";
        boxBtn.style.display = "none";
        box.innerHTML = "<p class='loading'>Consultando...</p>";

        const url = 'https://www.in.gov.br/consulta/-/buscar/dou?q=%22carlos+henrique+araujo+alves%22&s=todos&exactDate=all&sortType=0';
        const res = await fetch(url);
        const html = await res.text();

        const parser = new DOMParser();
        const doc = parser.parseFromString(html, "text/html");

        const scriptTag = doc.querySelector("#_br_com_seatecnologia_in_buscadou_BuscaDouPortlet_params");
        if (!scriptTag) {
            boxBtn.style.display = "inline-block";
            box.innerHTML = "<p>Não foi possível encontrar resultados.</p>";
            return;
        }

        const data = JSON.parse(scriptTag.textContent);
        const resultados = data.jsonArray || [];

        if (resultados.length === 0) {
            boxBtn.style.display = "inline-block";
            box.innerHTML = "<p>Nenhum resultado encontrado.</p>";
        } else {
            boxTotal.innerHTML = `(${resultados.length} resultados)`;
            boxBtn.style.display = "inline-block";
            box.innerHTML = "";
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
        const boxTotal = document.getElementById("doesp-total");
        const boxBtn = document.getElementById("doesp-btn");
        const box = document.getElementById("doesp");

        boxTotal.innerHTML = "";
        boxBtn.style.display = "none";
        box.innerHTML = "<p class='loading'>Consultando...</p>";

        const fromDate = formatDate(new Date(1890, 1, 1));
        const toDate = formatDate(new Date());
        const url = `https://do-api-web-search.doe.sp.gov.br/v2/advanced-search/publications?periodStartingDate=personalized&PageNumber=1&Terms%5B0%5D=carlos%20henrique%20ara%C3%BAjo%20alves&Terms%5B1%5D=carlos%20henrique%20araujo%20alves&FromDate=${fromDate}&ToDate=${toDate}&PageSize=10000&SortField=Date`;
        const res = await fetch(url);
        const data = await res.json();

        if (data.items.length === 0) {
            boxBtn.style.display = "inline-block";
            box.innerHTML = "<p>Nenhum resultado encontrado.</p>";
        } else {
            boxTotal.innerHTML = `(${data.items.length} resultados)`;
            boxBtn.style.display = "inline-block";
            box.innerHTML = "";
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
        const boxBtn = document.getElementById("dosp-btn");
        const box = document.getElementById("dosp");
        const boxInner = document.getElementById("inner-box");
        const iframe = document.getElementById("iframe1");

        boxInner.style.display = "none";
        boxBtn.style.display = "none";
        box.style.display = "flex";

        iframe.addEventListener("load", function onLoad() {
            boxInner.style.display = "flex";
            boxBtn.style.display = "inline-block";
            box.style.display = "none";
            iframe.removeEventListener("load", onLoad);
        });

        document.getElementById("formBusca").submit();
    } catch (e) {
        console.error(e);
    }
}

function formatDate(date) {
    const y = date.getFullYear();
    const m = date.getMonth() + 1;
    const d = date.getDate();
    return `${y}-${m}-${d}`;
}