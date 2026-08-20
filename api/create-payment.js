export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const { amount = "2.99" } = req.body;
  const token = process.env.CRYPTO_BOT_TOKEN;

  if (!token) {
    return res.status(500).json({ error: 'CRYPTO_BOT_TOKEN не налаштовано у Vercel' });
  }

  try {
    const response = await fetch('https://pay.crypt.bot/api/createInvoice', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Crypto-Pay-API-Token': token
      },
      body: JSON.stringify({
        asset: 'USDT',
        amount: amount,
        description: 'Розблокування повного звіту FaceCheck',
        paid_btn_name: 'callback',
        paid_btn_url: 'https://xcs-nine.vercel.app'
      })
    });

    const data = await response.json();

    if (data.ok && data.result?.pay_url) {
      return res.status(200).json({ url: data.result.pay_url });
    } else {
      throw new Error(data.error?.name || 'Помилка генерації рахунку');
    }
  } catch (error) {
    console.error("CryptoBot Error:", error);
    return res.status(500).json({ error: error.message });
  }
}
