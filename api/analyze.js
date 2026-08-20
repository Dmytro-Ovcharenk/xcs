export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // ВСТАВТЕ СВІЙ API-КЛЮЧ СЮДИ (або задайте через Environment Variables у Vercel)
  const API_KEY = process.env.GEMINI_API_KEY || "AQ.Ab8RN6J2c0n8jAuFVCs13m0WyBY5jo34u6txM2TCp1uZh3Ttvg";

  try {
    const { imageBase64, lang } = req.body;
    const cleanBase64 = imageBase64.replace(/^data:image\/\w+;base64,/, "");

    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${API_KEY}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{
          parts: [
            { text: `Проаналізуй це фото в гумористичному стилі FACECHECK. Поверни JSON з полями:
              profileType (один із: ГОЛОВНИЙ ГЕРОЙ, БОС, ХАОТИК, МІСТЕРІЯ, ДУША КОМПАНІЇ, ТИХИЙ БОС, РОМАНТИК, ПРОБЛЕМНИЙ ТИП 😈),
              shortDescription (короткий жартівливий підсумок),
              roast (дотепний розбір обличчя/стилю),
              scores (об'єкт із цілими числами 1-100: aura, confidence, style, mystery, chaos).
              Мова відповіді: ${lang === 'uk' ? 'Українська' : 'English'}.` },
            { inlineData: { mimeType: "image/jpeg", data: cleanBase64 } }
          ]
        }],
        generationConfig: { responseMimeType: "application/json" }
      })
    });

    const data = await response.json();
    if (data.error) throw new Error(data.error.message);

    const rawText = data.candidates[0].content.parts[0].text;
    const result = JSON.parse(rawText);

    return res.status(200).json(result);
  } catch (err) {
    return res.status(500).json({ error: err.message || "Помилка сервера" });
  }
}