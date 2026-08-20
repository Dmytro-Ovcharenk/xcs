export default async function handler(req, res) {
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
      return res.status(500).json({ error: 'Змінну GEMINI_API_KEY не знайдено.' });
    }

    const promptText = lang === 'en'
      ? `Analyze this face image for a fun entertainment profile. Return ONLY a valid JSON object without markdown formatting or backticks:
{"profileType": "Type Name", "shortDescription": "Description", "scores": {"aura": 85, "confidence": 90, "style": 75, "mystery": 80, "chaos": 60}}`
      : `Проаналізуй це обличчя для розважального профілю. Поверни ВИКЛЮЧНО валідний JSON об'єкт без маркдауну та без символів \`\`\`json:
{"profileType": "Назва типу", "shortDescription": "Опис", "scores": {"aura": 85, "confidence": 90, "style": 75, "mystery": 80, "chaos": 60}}`;

    const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        "model": "meta-llama/llama-3.2-11b-vision-instruct:free",
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
      return res.status(response.status).json({ error: data?.error?.message || 'Помилка API' });
    }

    let rawText = data.choices?.[0]?.message?.content;
    if (!rawText) {
      return res.status(500).json({ error: 'Отримано порожню відповідь від AI' });
    }

    const jsonText = rawText.replace(/```json/gi, '').replace(/```/g, '').trim();
    const parsed = JSON.parse(jsonText);

    return res.status(200).json(parsed);

  } catch (err) {
    console.error("Server Error:", err);
    return res.status(500).json({ error: err.message || 'Критична помилка сервера' });
  }
}
