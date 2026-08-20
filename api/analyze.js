export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    const { imageBase64, lang } = req.body || {};

    if (!imageBase64) {
      return res.status(400).json({ error: 'Зображення відсутнє' });
    }

    // Отримуємо ключ Google Gemini з змінних оточення
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return res.status(500).json({ error: 'GEMINI_API_KEY не налаштовано в Environment Variables на Vercel' });
    }

    // Видаляємо префікс data:image/...;base64, якщо він є
    const base64Data = imageBase64.includes(',') 
      ? imageBase64.split(',')[1] 
      : imageBase64;

    // Визначаємо тип зображення (png / jpeg)
    let mimeType = 'image/jpeg';
    if (imageBase64.startsWith('data:image/png')) {
      mimeType = 'image/png';
    } else if (imageBase64.startsWith('data:image/webp')) {
      mimeType = 'image/webp';
    }

    // Формуємо промпт
    const promptText = lang === 'en'
      ? `Analyze this face image for a fun entertainment profile. Return ONLY a JSON object without markdown formatting or backticks with this exact structure:
         {"profileType": "Type Name", "shortDescription": "Description", "scores": {"aura": 85, "confidence": 90, "style": 75, "mystery": 80, "chaos": 60}}`
      : `Проаналізуй це зображення обличчя для розважального профілю. Поверни ВИКЛЮЧНО JSON об'єкт без розмітки markdown чи лапок ``` з такою структурою:
         {"profileType": "Назва типу", "shortDescription": "Опис", "scores": {"aura": 85, "confidence": 90, "style": 75, "mystery": 80, "chaos": 60}}`;

    // Запит до безкоштовної моделі Gemini 1.5 Flash
    const response = await fetch(`[https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=$](https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=$){apiKey}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        contents: [
          {
            parts: [
              { text: promptText },
              {
                inline_data: {
                  mime_type: mimeType,
                  data: base64Data
                }
              }
            ]
          }
        ],
        generationConfig: {
          response_mime_type: "application/json"
        }
      })
    });

    const responseData = await response.json();

    if (!response.ok) {
      console.error('Gemini API Error:', responseData);
      return res.status(500).json({ error: responseData?.error?.message || 'Помилка Gemini API' });
    }

    let textResult = responseData.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!textResult) {
      return res.status(500).json({ error: 'Не вдалося отримати відповідь від AI' });
    }

    // Очищення від можливої маркдаун розмітки
    textResult = textResult.replace(/^```json\s*/, '').replace(/\s*```$/, '').trim();

    const parsedResult = JSON.parse(textResult);
    return res.status(200).json(parsedResult);

  } catch (error) {
    console.error('Server Error:', error);
    return res.status(500).json({ error: error.message || 'Внутрішня помилка сервера' });
  }
}
