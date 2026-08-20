export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const API_KEY = process.env.GEMINI_API_KEY;
  if (!API_KEY) {
    return res.status(500).json({ error: 'API key is missing in Environment Variables' });
  }

  try {
    const { imageBase64, lang } = req.body;
    const cleanBase64 = imageBase64.replace(/^data:image\/\w+;base64,/, "");

    const promptText = `Проаналізуй це фото у гумористичному стилі FACECHECK. Поверни ВИКЛЮЧНО JSON без додаткового тексту чи фраз:
    {
      "free": {
        "profileType": "ГОЛОВНИЙ ГЕРОЙ / БОС / ХАОТИК / МІСТЕРІЯ / ДУША КОМПАНІЇ",
        "shortDescription": "короткий жартівливий підсумок (1 речення)",
        "scores": { "aura": 85, "confidence": 90 }
      },
      "premium": {
        "roast": "детальний гострий розбір обличчя та стилю (3-4 речення)",
        "compatibility": "з яким типом людей найкраща сумісність",
        "secretWarning": "таємне застереження про цю людину",
        "styleAdvice": "порада щодо іміджу"
      }
    }
    Мова відповіді: ${lang === 'uk' ? 'Українська' : 'English'}.`;

    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-3.6-flash:generateContent?key=${API_KEY}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{
          parts: [
            { text: promptText },
            { inlineData: { mimeType: "image/jpeg", data: cleanBase64 } }
          ]
        }]
      })
    });

    const data = await response.json();
    if (!response.ok) throw new Error(data.error?.message || 'API Error');

    let textResponse = data.candidates[0].content.parts[0].text;
    textResponse = textResponse.replace(/```json/g, '').replace(/```/g, '').trim();
    
    const parsedData = JSON.parse(textResponse);
    return res.status(200).json(parsedData);

  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}
