// API route para fazer fetch do JusBrasil (sem restrição de CORS)
export default async function handler(req, res) {
    try {
        const myHeaders = new Headers();
        myHeaders.append("User-Agent", "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36");

        const requestOptions = {
            method: "GET",
            headers: myHeaders,
            redirect: "follow"
        };

        const response = await fetch(
            "https://www.jusbrasil.com.br/diarios/busca?o=data&p=1&q=%22Carlos+Henrique+Araujo+Alves%22",
            requestOptions
        );

        if (!response.ok) {
            return res.status(response.status).json({ error: "Erro ao consultar JusBrasil" });
        }

        const html = await response.text();
        res.status(200).json({ html });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: error.message });
    }
}
