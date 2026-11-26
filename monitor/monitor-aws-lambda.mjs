import chromium from "@sparticuz/chromium";
import puppeteer from "puppeteer-core";
import nodemailer from "nodemailer";
import { DynamoDBClient, GetItemCommand, PutItemCommand } from "@aws-sdk/client-dynamodb";

const URL = "https://consultar-diarios-oficiais.vercel.app/";
const client = new DynamoDBClient({ region: "sa-east-1" });
const TABLE_NAME = "DiariosTotais";

export const handler = async () => {
    let browser = null;

    try {
        console.log("Consultando totais anteriores no DynamoDB...");
        const { dou: douTotalEsperado, doesp: doespTotalEsperado, dosp: dospTotalEsperado, djb: djbTotalEsperado } = await getValoresEsperados();
        console.log("DOU Esperado:", douTotalEsperado, "DOESP Esperado:", doespTotalEsperado, "DOSP Esperado:", dospTotalEsperado, "DJB Esperado:", djbTotalEsperado);

        console.log("Iniciando Chromium...");
        browser = await puppeteer.launch({
            args: chromium.args,
            defaultViewport: { width: 1366, height: 768 },
            executablePath: await chromium.executablePath(),
            headless: chromium.headless,
        });

        const page = await browser.newPage();

        console.log("Configurando User‑Agent de navegador real...");
        await page.setUserAgent(
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) ' +
            'AppleWebKit/537.36 (KHTML, like Gecko) ' +
            'Chrome/120.0.0.0 Safari/537.36'
        );

        console.log("Configurando Headers básicos de navegação...");
        await page.setExtraHTTPHeaders({
            'accept-language': 'pt-BR,pt;q=0.9,en-US;q=0.8,en;q=0.7'
        });

        console.log("Abrindo página...");
        await page.goto(URL, { waitUntil: "networkidle2", timeout: 90_000 });

        console.log("Esperando 90s para carregar...");
        await new Promise((r) => setTimeout(r, 90_000));

        const douTotal = parseInt(
            await page.$eval("#dou-total", el => el.textContent.match(/\d+/)?.[0] || "0")
        );

        const doespTotal = parseInt(
            await page.$eval("#doesp-total", el => el.textContent.match(/\d+/)?.[0] || "0")
        );

        const dojbPage = await clicarEAguardarPopup(page, "#btnBuscaDOJB", "Jusbrasil");
        const dojbSelector = 'p[class*="result-count-subtitle_resultCountPhrase"]';
        await dojbPage.waitForFunction((selector) => {
            const countElement = document.querySelector(selector);
            return Boolean(
                countElement?.textContent?.trim() ||
                document.body.innerText.match(/\b[\d.,]+\s+resultados?\b/i)
            );
        }, { timeout: 90_000 }, dojbSelector);
        const dojbTotalText = await dojbPage.evaluate((selector) =>
            document.querySelector(selector)?.textContent?.trim() ||
            document.body.innerText.match(/\b[\d.,]+\s+resultados?\b/i)?.[0] ||
            "", dojbSelector);
        const dojbTotalMatch = dojbTotalText.match(/[\d.,]+/);
        const dojbTotal = dojbTotalMatch
            ? Number(dojbTotalMatch[0].replace(/\D/g, ""))
            : 0;

        const dospPage = await clicarEAguardarPopup(page, "#btnBuscaDOSP", "DOSP");
        await dospPage.waitForSelector(".nroResultados", { timeout: 90_000 });
        const dospTotal = parseInt(
            await dospPage.$eval(".nroResultados", el => el.textContent.trim())
        ) || 0;

        console.log("DOU:", douTotal, "DOESP:", doespTotal, "DOSP:", dospTotal, "DJB:", dojbTotal);

        const houveErro =
            !douTotal || !doespTotal || !dospTotal || !dojbTotal;
        const houveExcedente =
            douTotal > douTotalEsperado ||
            doespTotal > doespTotalEsperado ||
            dospTotal > dospTotalEsperado ||
            dojbTotal > djbTotalEsperado;

        let resultado = { douTotal, doespTotal, dospTotal, dojbTotal, douTotalEsperado, doespTotalEsperado, dospTotalEsperado, djbTotalEsperado };

        if (houveErro || houveExcedente) {
            console.log("Capturando screenshot...");
            const screenshot = await page.screenshot({ encoding: "base64" });

            await browser.close();

            console.log("Enviando email...");
            await sendEmail(screenshot, resultado, houveErro);

            if (houveExcedente) {
                console.log("Salvando novos totais no DynamoDB...");
                await salvarNovosValores({ dou: douTotal, doesp: doespTotal, dosp: dospTotal, djb: dojbTotal });
            }

            return {
                statusCode: 200,
                body: "Email enviado com sucesso (houve erro ou novos resultados)",
            };
        } else {
            console.log("Nenhum alerta detectado, não enviando email.");
            await browser.close();
            return { statusCode: 200, body: "Sem alterações relevantes" };
        }
    } catch (err) {
        console.error("Erro:", err);

        try {
            await sendErrorEmail(err);
        } catch (emailErr) {
            console.error("Falha ao enviar email de erro:", emailErr);
        }

        if (browser) await browser.close();
        return { statusCode: 500, body: "Erro no monitor" };
    }
};

function getMailTransporter() {
    const transporter = nodemailer.createTransport({
        service: "gmail",
        auth: {
            user: process.env.MAIL_USER,
            pass: process.env.MAIL_PASS,
        },
    });

    return transporter;
}

async function sendEmail(screenshotBase64, { douTotal, doespTotal, dospTotal, dojbTotal, douTotalEsperado, doespTotalEsperado, dospTotalEsperado, djbTotalEsperado }, houveErro) {
    const transporter = getMailTransporter();

    const subject = houveErro
        ? "⚠️ Erro na consulta dos Diários Oficiais"
        : "📈 Novos resultados detectados nos Diários Oficiais";

    const html = houveErro
        ? `<p>Houve um erro na consulta de resultados (algum valor veio <b>null</b> ou <b>0</b>).</p>
       <p><strong>Valores capturados:</strong></p>
       <ul>
         <li>DOU: ${douTotal} ${douTotal > douTotalEsperado ? `(+${douTotal - douTotalEsperado})` : ''}</li>
         <li>DOESP: ${doespTotal} ${doespTotal > doespTotalEsperado ? `(+${doespTotal - doespTotalEsperado})` : ''}</li>
         <li>DOSP: ${dospTotal} ${dospTotal > dospTotalEsperado ? `(+${dospTotal - dospTotalEsperado})` : ''}</li>
         <li>DOs Jusbrasil: ${dojbTotal} ${dojbTotal > djbTotalEsperado ? `(+${dojbTotal - djbTotalEsperado})` : ''}</li>
       </ul>`
        : `<p>Novos resultados foram detectados:</p>
       <ul>
         <li>DOU: ${douTotal} ${douTotal > douTotalEsperado ? `(+${douTotal - douTotalEsperado})` : ''}</li>
         <li>DOESP: ${doespTotal} ${doespTotal > doespTotalEsperado ? `(+${doespTotal - doespTotalEsperado})` : ''}</li>
         <li>DOSP: ${dospTotal} ${dospTotal > dospTotalEsperado ? `(+${dospTotal - dospTotalEsperado})` : ''}</li>
         <li>DOs Jusbrasil: ${dojbTotal} ${dojbTotal > djbTotalEsperado ? `(+${dojbTotal - djbTotalEsperado})` : ''}</li>
       </ul>`;

    await transporter.sendMail({
        from: `"Monitor de Diários Oficiais" <${process.env.MAIL_USER}>`,
        to: process.env.MAIL_TO,
        subject,
        html: `${html}<br><br><a href="${URL}">Acesse a página</a>`,
        attachments: [
            {
                filename: "screenshot.png",
                content: screenshotBase64,
                encoding: "base64",
            },
        ],
    });

    console.log("Email enviado!");
}

async function sendErrorEmail(error) {
    const transporter = getMailTransporter();

    const subject = "❌ Erro crítico na execução do Monitor de Diários Oficiais";

    const html = `
    <p>Ocorreu um erro durante a execução da função Lambda:</p>
    <pre style="background:#f4f4f4;padding:10px;border-radius:5px;">
${error?.stack || error?.message || error}
    </pre>
    <br>
    <p>Verifique os logs no CloudWatch para mais detalhes.</p>
  `;

    await transporter.sendMail({
        from: `"Monitor de Diários Oficiais" <${process.env.MAIL_USER}>`,
        to: process.env.MAIL_TO,
        subject,
        html,
    });

    console.log("Email de erro enviado!");
}

function clicarEAguardarPopup(page, buttonSelector, diario) {
    return new Promise((resolve, reject) => {
        const onPopup = popup => {
            clearTimeout(timeout);
            resolve(popup);
        };
        const timeout = setTimeout(() => {
            page.off("popup", onPopup);
            reject(new Error(`A página de resultados do ${diario} não foi aberta`));
        }, 90_000);

        page.once("popup", onPopup);
        page.click(buttonSelector).catch(error => {
            clearTimeout(timeout);
            page.off("popup", onPopup);
            reject(error);
        });
    });
}

async function getValoresEsperados() {
    const resp = await client.send(new GetItemCommand({
        TableName: TABLE_NAME,
        Key: { id: { S: "totais" } }
    }));

    return {
        dou: parseInt(resp.Item.douTotal.N),
        doesp: parseInt(resp.Item.doespTotal.N),
        dosp: parseInt(resp.Item.dospTotal.N),
        djb: parseInt(resp.Item.djbTotal?.N || "0"),
    };
}

async function salvarNovosValores({ dou, doesp, dosp, djb }) {
    const item = {
        id: { S: "totais" },
        lastUpdated: { S: new Date().toISOString() }
    };

    if (dou) item.douTotal = { N: String(dou) };
    if (doesp) item.doespTotal = { N: String(doesp) };
    if (dosp) item.dospTotal = { N: String(dosp) };
    if (djb !== undefined) item.djbTotal = { N: String(djb) };

    await client.send(new PutItemCommand({
        TableName: TABLE_NAME,
        Item: item
    }));
}
