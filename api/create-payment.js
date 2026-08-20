import crypto from 'crypto';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const merchantId = process.env.CRYPTOMUS_MERCHANT_ID;
    const apiKey = process.env.CRYPTOMUS_PAYMENT_KEY;

    if (!merchantId || !apiKey) {
      return res.status(500).json({ error: 'Ключі Cryptomus не налаштовані у Vercel' });
    }

    // ТУТ ВКАЗУЄТЬСЯ ЦІНА
    const amount = req.body.amount || "2.99";
    const orderId = `order_${Date.now()}`;

    const payload = {
      amount: amount,
      currency: "USD",
      order_id: orderId,
      url_return: `${req.headers.origin || 'https://facecheck.app'}?paid=true`,
      lifetime: 3600
    };

    const jsonPayload = JSON.stringify(payload);
    const sign = crypto
      .createHash('md5')
      .update(Buffer.from(jsonPayload).toString('base64') + apiKey)
      .digest('hex');

    const response = await fetch('https://api.cryptomus.com/v1/payment', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'merchant': merchantId,
        'sign': sign
      },
      body: jsonPayload
    });

    const data = await response.json();

    if (data.state === 0 && data.result?.url) {
      return res.status(200).json({ url: data.result.url });
    } else {
      throw new Error(data.message || 'Помилка генерації рахунку');
    }
  } catch (error) {
    console.error("Cryptomus Error:", error);
    return res.status(500).json({ error: error.message });
  }
}
