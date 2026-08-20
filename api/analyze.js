export default async function handler(req, res) {
  // Дозволяємо лише POST-запити
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const { imageBase64, lang } = req.body;

  if (!imageBase64) {
    return res.status(400).json({ error: 'Зображення відсутнє' });
  }

  const apiKey = process.env.OPENAI_API_KEY; // Ваш API ключ з секретів
  if (!apiKey) {
    return res.status(500).json({ error: 'API key не налаштовано на сервері' });
  }

  // Промпт залежно від мови
  const promptText = lang === 'en' 
    ? `Analyze this face image for a fun entertainment profile. Return ONLY a JSON object without markdown formatting with the following structure:
       {"profileType": "Type Name", "shortDescription": "Description", "scores": {"aura": 85, "confidence": 90, "style": 75, "mystery": 80, "chaos": 60}}`
    : `Проаналізуй це зображення обличчя для розважального профілю. Поверни ВИКЛЮЧНО JSON об'єкт без додаткового форматування чи markdown з такою структурою:
       {"profileType": "Назва типу", "shortDescription": "Опис", "scores": {"aura": 85, "confidence": 90, "style": 75, "mystery": 80, "chaos": 60}}`;

  // Функція для затримки (пауза між спробами)
  const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

  let maxRetries = 3;      // Максимум 3 спроби
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
          model: 'gpt-4o-mini', // або gpt-4o
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

      // Якщо код 429 (Too Many Requests) або 503 (Service Unavailable) / High Demand
      if (response.status === 429 || response.status === 503 || (responseData.error && responseData.error.message && responseData.error.message.includes('demand'))) {
        console.warn(`[AI API] Перевантаження моделі (спроба ${attempt} з ${maxRetries}). Чекаємо 2.5 сек...`);
        if (attempt < maxRetries) {
          await delay(2500); // Чекаємо 2.5 секунди перед повторною спробою
          continue;
        }
      }

      // Якщо запит успішний — виходимо з циклу
      if (response.ok) {
        break;
      }
    } catch (err) {
      console.error(`[AI API Error] Спроба ${attempt}:`, err);
      if (attempt < maxRetries) {
        await delay(2000);
      }
    }
  }

  // Обробка відповідей після виходу з циклу
  if (!response || !response.ok || !responseData) {
    const errorMsg = responseData?.error?.message || '';
    if (errorMsg.includes('demand') || response?.status === 429) {
      return res.status(503).json({
        error: 'Модель AI зараз перевантажена великою кількістю запитів. Будь ласка, зачекайте 10 секунд і спробуйте ще раз.'
      });
    }
    return res.status(500).json({ error: 'Помилка при з'єднанні з AI. Спробуйте пізніше.' });
  }

  // Парсимо JSON результат від AI
  try {
    const content = responseData.choices[0].message.content.trim();
    // Видаляємо можливі markdown-теги ```json ... ```
    const cleanJson = content.replace(/^```json\s*/, '').replace(/\s*```$/, '');
    const parsedResult = JSON.parse(cleanJson);

    return res.status(200).json(parsedResult);
  } catch (err) {
    console.error('Помилка парсингу результату від AI:', err);
    return res.status(500).json({ error: 'Не вдалося обробити відповідь від AI.' });
  }
}
