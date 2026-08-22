export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { image } = req.body;

  if (!image) {
    return res.status(400).json({ error: 'Зображення відсутнє' });
  }

  const apiKey = process.env.OPENAI_API_KEY;

  if (!apiKey) {
    return res.status(500).json({ error: 'API key не налаштовано в Environment Variables хостингу' });
  }

  try {
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: "gpt-4o",
        messages: [
          {
            role: "user",
            content: [
              {
                type: "text",
                text: "Analyze this unique face features, expression, posture, and style. Return ONLY a valid JSON object with 5 unique integer scores from 40 to 99 for these keys: aura, confidence, style, mystery, chaos. Do NOT output markdown codeblocks (no ```json)."
              },
              {
                type: "image_url",
                image_url: { url: image }
              }
            ]
          }
        ],
        max_tokens: 100,
        temperature: 0.7
      })
    });

    const data = await response.json();

    if (data.error) {
      return res.status(500).json({ error: data.error.message });
    }

    let content = data.choices[0].message.content.trim();
    content = content.replace(/```json/g, '').replace(/```/g, '').trim();

    const scores = JSON.parse(content);
    return res.status(200).json(scores);

  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}
