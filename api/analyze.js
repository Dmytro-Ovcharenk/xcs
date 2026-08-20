export default async function handler(req, res) {
  // Приймаємо лише POST-запити
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    const { imageBase64, lang } = req.body || {};

    if (!imageBase64) {
      return res.status(400).json({ error: 'Завантажте фото для аналізу.' });
    }

    // Отримуємо ключ OpenRouter зі змінної GEMINI_API_KEY
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return res.status(500).json({ error: 'Змінну GEMINI_API_KEY не налаштовано в Environment Variables на Vercel.' });
    }

    // Текст промпту залежно від мови
    const promptText = lang === 'en'
      ? `Analyze this face image for a fun entertainment profile. Return ONLY a valid JSON object without markdown formatting or backticks:
{"profileType": "Type Name", "shortDescription": "Description", "scores": {"aura": 85, "confidence": 90, "style": 75, "mystery": 80, "chaos": 60}}`
      : `Проаналізуй це обличчя для розважального профілю. Поверни ВИКЛЮЧНО валідний JSON об'єкт без маркдауну та без символів \`\`\`json:
{"profileType": "Назва типу", "shortDescription": "Опис", "scores": {"aura": 85, "confidence": 90, "style": 75, "mystery": 80, "chaos": 60}}`;

    // Запит до безкоштовної моделі Gemini 2.5 Flash через OpenRouter
    const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        "model": "google/gemini-2.5-flash:free",
        "messages": [
          {
            "role": "user",
            "content": [
              { "type": "text", "text": promptText },
              {
                "type": "image_url",
                "image_url": { "url": imageBase64 }
              }
            ]
          }
        ]
      })
    });

    const data = await response.json();

    if (!response.ok) {
      console.error("OpenRouter Error:", data);
      return res.status(response.status).json({ 
        error: data?.error?.message || 'Помилка запиту до OpenRouter API' 
      });
    }

    let rawText = data.choices?.[0]?.message?.content;
    if (!rawText) {
      return res.status(500).json({ error: 'Отримано порожню відповідь від AI' });
    }

    // Очищення відповіді від можливої маркдаун-розмітки ```json ... ```
    const jsonText = rawText.replace(/```json/gi, '').replace(/```/g, '').trim();
    const parsed = JSON.parse(jsonText);

    return res.status(200).json(parsed);

  } catch (err) {
    console.error("Critical Server Error:", err);
    return res.status(500).json({ error: err.message || 'Критична помилка сервера' });
  }
}
