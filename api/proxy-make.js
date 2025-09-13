export default async function handler(req, res) {
  // CORS Headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-Target-Webhook');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Solo POST permesso' });
  }

  try {
    const targetWebhook = req.headers['x-target-webhook'];
    
    const allowedWebhooks = [
      'https://hook.eu2.make.com/rs8d7ntch8kqi7zpcjwy8pqudz8yr8s0',
      'https://hook.eu2.make.com/6c532l9lbrpji3mjm6decgduwt8hbvqw'
    ];

    if (!allowedWebhooks.includes(targetWebhook)) {
      return res.status(403).json({ error: 'Webhook non autorizzato' });
    }

    const makeResponse = await fetch(targetWebhook, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(req.body)
    });

    const responseData = await makeResponse.json();
    res.status(makeResponse.status).json(responseData);

  } catch (error) {
    res.status(500).json({ error: 'Errore proxy' });
  }
}
