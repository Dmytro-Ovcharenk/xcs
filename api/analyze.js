import { GoogleGenerativeAI } from "@google/generative-ai";

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
      return res.status(500).json({ error: 'API ключ не налаштовано у Vercel Environment Variables' });
    }

    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

    const base64Data = imageBase64.replace(/^data:image\/\w+;base64,/, "");

    const prompt = `
      Проаналізуй обличчя на цій фотографії в гумористичному та розважальному стилі.
      Мова відповіді: ${lang === 'en' ? 'English' : 'Ukrainian'}.

      Поверни ВЕЛИЧНО ТІЛЬКИ чистий JSON без будь-якої розмітки (без markdown, без \`\`\`json):
      {
        "profileType": "Коротка назва типажу (наприклад, 'ГОЛОВНИЙ ГЕРОЙ', 'ТАЄМНИЧИЙ МИСЛИТЕЛЬ')",
        "shortDescription": "2-3 речення короткого влучного опису",
        "scores": {
          "aura": число від 50 до 100,
          "confidence": число від 50 до 100
        }
      }
    `;

    const result = await model.generateContent([
      prompt,
      {
        inlineData: {
          data: base64Data,
          mimeType: "image/jpeg"
        }
      }
    ]);

    const responseText = await result.response.text();
    const cleanJsonText = responseText.replace(/```json/g, '').replace(/```/g, '').trim();
    const parsedData = JSON.parse(cleanJsonText);

    return res.status(200).json(parsedData);

  } catch (error) {
    console.error("Помилка сервера:", error);
    return res.status(500).json({ error: "Помилка аналізу: " + error.message });
  }
}
