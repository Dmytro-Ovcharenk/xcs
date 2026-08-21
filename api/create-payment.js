import crypto from 'crypto';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    const {
      merchantAccount,
      merchantDomainName,
      orderReference,
      orderDate,
      amount,
      currency,
      productName,
      productCount,
      productPrice
    } = req.body;

    const secretKey = process.env.WAYFORPAY_SECRET_KEY;
    if (!secretKey) {
      return res.status(500).json({ error: 'WAYFORPAY_SECRET_KEY не налаштовано в оточенні' });
    }

    // Перетворюємо масиви товарів у рядки, розділені крапкою з комою (стандарт WayForPay)
    const nameStr = Array.isArray(productName) ? productName.join(';') : productName;
    const countStr = Array.isArray(productCount) ? productCount.join(';') : productCount;
    const priceStr = Array.isArray(productPrice) ? productPrice.join(';') : productPrice;

    // Рядок для розрахунку HMAC у суворому порядку WayForPay
    const signatureString = [
      merchantAccount,
      merchantDomainName,
      orderReference,
      orderDate,
      amount,
      currency,
      nameStr,
      countStr,
      priceStr
    ].join(';');

    const merchantSignature = crypto
      .createHmac('md5', secretKey)
      .update(signatureString, 'utf8')
      .digest('hex');

    return res.status(200).json({ merchantSignature });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}
