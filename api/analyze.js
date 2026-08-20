export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { imageBase64, lang } = req.body;

    if (!imageBase64) {
      return res.status(400).json({ error: 'Зображення відсутнє' });
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return res.status(500).json({ error: 'GEMINI_API_KEY не налаштовано у Vercel (Environment Variables)' });
    }

    const mimeType = imageBase64.match(/^data:(image\/\w+);base64,/)?.[1] || 'image/jpeg';
    const base64Data = imageBase64.replace(/^data:image\/\w+;base64,/, "");

    const prompt = `
      Проаналізуй обличчя на цій фотографії в гумористичному та розважальному стилі.
      Мова відповіді: ${lang === 'en' ? 'English' : 'Ukrainian'}.

      Поверни ВЕЛИЧНО ТІЛЬКИ чистий JSON без будь-якої розмітки (без markdown, без \`\`\`json):
      {
        "profileType": "Коротка назва типажу (наприклад, 'ГОЛОВНИЙ ГЕРОЙ', 'ТАЄМНИЧИЙ МИСЛИТЕЛЬ')",
        "shortDescription": "2-3 речення короткого влучного опису",
        "scores": {
          "aura": 85,
          "confidence": 90
        }
      }
    `;

    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;

    const apiResponse = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{
          parts: [
            { text: prompt },
            { inline_data: { mime_type: mimeType, data: base64Data } }
          ]
        }]
      })
    });

    const data = await apiResponse.json();

    if (!apiResponse.ok) {
      throw new Error(data.error?.message || 'Помилка Gemini API');
    }

    const rawText = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
    const cleanJsonText = rawText.replace(/```json/g, '').replace(/```/g, '').trim();
    const parsedData = JSON.parse(cleanJsonText);

    return res.status(200).json(parsedData);

  } catch (error) {
    console.error("Server Error:", error);
    return res.status(500).json({ error: error.message || "Помилка сервера" });
  }
}
