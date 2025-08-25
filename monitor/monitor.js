import puppeteer from "puppeteer";
import nodemailer from "nodemailer";

const URL = "https://consultar-diarios-oficiais.vercel.app";

async function run() {
    const browser = await puppeteer.launch({
        headless: true,
        args: [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--proxy-server=http://179.42.6.24:3128',
            // '--proxy-server=socks4://186.224.225.82:42648',
            // '--proxy-server=socks5://45.146.130.15:7566',
        ]
    });
    const page = await browser.newPage();

    console.log("Configurando viewport...");
    await page.setViewport({ width: 1366, height: 768 });

    console.log("Abrindo página...");
    await page.goto(URL, { waitUntil: "networkidle2", timeout: 60_000 });

    console.log("Esperando 60s para carregar página completamente...");
    await new Promise(resolve => setTimeout(resolve, 60_000));

    console.log("Tirando screenshot...");
    const screenshot = "screenshot.png";
    await page.screenshot({ path: screenshot });

    await browser.close();

    console.log("Enviando email...");
    await sendEmail(screenshot);
}

async function sendEmail(file) {
    let transporter = nodemailer.createTransport({
        service: "gmail",
        auth: {
            user: process.env.MAIL_USER,
            pass: process.env.MAIL_PASS,
        },
    });

    await transporter.sendMail({
        from: `"Monitor Página" <${process.env.MAIL_USER}>`,
        to: process.env.MAIL_TO,
        subject: "📸 Screenshot da página monitorada",
        html: `Segue em anexo o print automático da página.<br><br>
           <a href="https://consultar-diarios-oficiais.vercel.app/">Acesse a página de consulta aqui</a>`,
        attachments: [{ filename: "screenshot.png", path: file }],
    });

    console.log("Email enviado!");
}

run();