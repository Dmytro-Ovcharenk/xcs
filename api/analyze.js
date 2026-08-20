export default async function handler(req, res) {
  // Дозволяємо лише POST-запити
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    const { imageBase64, lang } = req.body || {};

    if (!imageBase64) {
      return res.status(400).json({ error: 'Зображення відсутнє' });
    }

    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      console.error("ОШИБКА: Не задано OPENAI_API_KEY в Environment Variables на Vercel");
      return res.status(500).json({ error: 'OPENAI_API_KEY не налаштовано на сервері Vercel' });
    }

    // Текст запиту залежно від мови
    const promptText = lang === 'en' 
      ? `Analyze this face image for a fun entertainment profile. Return ONLY a JSON object without markdown formatting with the following structure:
         {"profileType": "Type Name", "shortDescription": "Description", "scores": {"aura": 85, "confidence": 90, "style": 75, "mystery": 80, "chaos": 60}}`
      : `Проаналізуй це зображення обличчя для розважального профілю. Поверни ВИКЛЮЧНО JSON об'єкт без додаткового форматування чи markdown з такою структурою:
         {"profileType": "Назва типу", "shortDescription": "Опис", "scores": {"aura": 85, "confidence": 90, "style": 75, "mystery": 80, "chaos": 60}}`;

    const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

    let maxRetries = 3;
    let attempt = 0;
    let response = null;
    let responseData = null;

    while (attempt < maxRetries) {
      attempt++;
      try {
        response = await fetch('https://api.openai.com/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey}`
          },
          body: JSON.stringify({
            model: 'gpt-4o-mini',
            messages: [
              {
                role: 'user',
                content: [
                  { type: 'text', text: promptText },
                  {
                    type: 'image_url',
                    image_url: {
                      url: imageBase64
                    }
                  }
                ]
              }
            ],
            max_tokens: 500
          })
        });

        responseData = await response.json();

        // Повторюємо спробу, якщо модель перевантажена
        if (response.status === 429 || response.status === 503 || (responseData?.error?.message && responseData.error.message.includes('demand'))) {
          console.warn(`[AI API] Перевантаження (спроба ${attempt} з ${maxRetries}). Очікування 2.5 сек...`);
          if (attempt < maxRetries) {
            await delay(2500);
            continue;
          }
        }

        if (response.ok) break;

      } catch (err) {
        console.error(`[AI API Error] Спроба ${attempt}:`, err);
        if (attempt < maxRetries) await delay(2000);
      }
    }

    if (!response || !response.ok || !responseData) {
      const errorMsg = responseData?.error?.message || '';
      if (errorMsg.includes('demand') || response?.status === 429) {
        return res.status(503).json({
          error: 'Модель AI зараз перевантажена. Будь ласка, зачекайте 10 секунд і спробуйте ще раз.'
        });
      }
      return res.status(500).json({ error: responseData?.error?.message || 'Помилка при з’єднанні з AI API.' });
    }

    // Очищаємо та розбираємо відповідь від AI
    let content = responseData.choices[0].message.content.trim();
    content = content.replace(/^```json\s*/, '').replace(/\s*```$/, '');
    
    const parsedResult = JSON.parse(content);
    return res.status(200).json(parsedResult);

  } catch (globalError) {
    console.error("Критична помилка функції:", globalError);
    return res.status(500).json({ error: globalError.message || 'Внутрішня помилка сервера.' });
  }
}
