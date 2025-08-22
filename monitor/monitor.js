import puppeteer from "puppeteer";
import nodemailer from "nodemailer";

const URL = "https://consultar-diarios-oficiais.vercel.app";

async function run() {
    const browser = await puppeteer.launch({ headless: true });
    const page = await browser.newPage();

    console.log("Abrindo página...");
    await page.goto(URL, { waitUntil: "networkidle2" });

    console.log("Esperando 60s para carregar iframes...");
    await page.waitForTimeout(60_000);

    console.log("Tirando screenshot...");
    const screenshot = "screenshot.png";
    await page.screenshot({ path: screenshot, fullPage: true });

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
        text: "Segue em anexo o print automático da página.",
        attachments: [{ filename: "screenshot.png", path: file }],
    });

    console.log("Email enviado!");
}

run();