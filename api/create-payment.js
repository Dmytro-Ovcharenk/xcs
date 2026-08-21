const crypto = require('crypto');

export default async function handler(req, res) {
  // Дозволяємо лише POST запити
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    const {
      merchantAccount,
      orderDomainName,
      orderReference,
      orderDate,
      amount,
      currency,
      productName,
      productCount,
      productPrice
    } = req.body;

    // Секретний ключ WayForPay (Secret Key)
    const secretKey = process.env.WFP_SECRET_KEY || "0a398a826e9cd8d7b372b3597b87175f6f3c454e";

    // Перетворюємо масиви товарів у строки через ";" згідно з документацією WayForPay
    const pName = Array.isArray(productName) ? productName.join(';') : productName;
    const pCount = Array.isArray(productCount) ? productCount.join(';') : productCount;
    const pPrice = Array.isArray(productPrice) ? productPrice.join(';') : productPrice;

    // Сувора послідовність полів для формування HMAC-SHA256 підпису
    const signString = [
      merchantAccount,
      orderDomainName,
      orderReference,
      orderDate,
      amount,
      currency,
      pName,
      pCount,
      pPrice
    ].join(';');

    // Генерація підпису
    const merchantSignature = crypto
      .createHmac('sha256', secretKey)
      .update(signString)
      .digest('hex');

    // Повертаємо згенерований підпис клієнту
    return res.status(200).json({ merchantSignature });

  } catch (error) {
    console.error("WayForPay Signature Error:", error);
    return res.status(500).json({ error: error.message || 'Помилка генерації підпису' });
  }
}
