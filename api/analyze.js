export default async function handler(req, res) {
  // Дозволяємо лише POST
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    const { imageBase64, lang } = req.body || {};

    if (!imageBase64) {
      return res.status(400).json({ error: 'Завантажте фото для аналізу.' });
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return res.status(500).json({ error: 'Змінну GEMINI_API_KEY не знайдено в Environment Variables.' });
    }

    // Підготовка base64 зображення та MIME-типу
    let mimeType = 'image/jpeg';
    let cleanBase64 = imageBase64;

    if (imageBase64.includes(';base64,')) {
      const parts = imageBase64.split(';base64,');
      mimeType = parts[0].replace('data:', '');
      cleanBase64 = parts[1];
    }

    const promptText = lang === 'en'
      ? `Analyze this face image for a fun entertainment profile. Return ONLY a valid JSON object without markdown or backticks:
{"profileType": "Type Name", "shortDescription": "Description", "scores": {"aura": 85, "confidence": 90, "style": 75, "mystery": 80, "chaos": 60}}`
      : `Проаналізуй це обличчя для розважального профілю. Поверни ВИКЛЮЧНО валідний JSON об'єкт без маркдауну та без символів \`\`\`json:
{"profileType": "Назва типу", "shortDescription": "Опис", "scores": {"aura": 85, "confidence": 90, "style": 75, "mystery": 80, "chaos": 60}}`;

    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`;

    const apiRes = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{
          parts: [
            { text: promptText },
            {
              inline_data: {
                mime_type: mimeType,
                data: cleanBase64
              }
            }
          ]
        }],
        generationConfig: {
          response_mime_type: "application/json"
        }
      })
    });

    const data = await apiRes.json();

    if (!apiRes.ok) {
      console.error("Gemini Error:", data);
      return res.status(apiRes.status).json({
        error: data?.error?.message || 'Помилка при запиті до Gemini API'
      });
    }

    const rawText = data?.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!rawText) {
      return res.status(500).json({ error: 'Отримано порожню відповідь від AI' });
    }

    // Чистимо текст перед парсингом JSON
    const jsonText = rawText.replace(/```json/gi, '').replace(/```/g, '').trim();
    const parsed = JSON.parse(jsonText);

    return res.status(200).json(parsed);

  } catch (err) {
    console.error("Critical Server Error:", err);
    return res.status(500).json({ error: err.message || 'Критична помилка виконання функції' });
  }
}
