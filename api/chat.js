// This is a Vercel Serverless Function
export default async function handler(req, res) {
  // The API key is now saved directly in the backend file
  const apiKey = "ak_2cL6295Lv0MI2cI7C27xN6Ak4J28T";

  // Only allow POST requests (standard for chat completions)
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const response = await fetch("https://api.longcat.chat/openai/v1/chat/completions", {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      // Pass the body (model, messages, etc.) from the frontend to the LongCat API
      body: JSON.stringify(req.body),
    });

    if (!response.ok) {
      const errorText = await response.text();
      return res.status(response.status).json({ error: errorText });
    }

    const data = await response.json();
    
    // Return the AI response back to your frontend
    res.status(200).json(data);
  } catch (error) {
    console.error('Backend Error:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
}
