// api/proxy-make.js - VERSIONE MIGLIORATA CON DEBUGGING

export default async function handler(req, res) {
  // CORS Headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-Target-Webhook');
  res.setHeader('Access-Control-Max-Age', '86400');

  // Handle preflight OPTIONS request
  if (req.method === 'OPTIONS') {
    console.log('📋 Preflight request handled');
    return res.status(200).end();
  }

  // Solo POST per sicurezza
  if (req.method !== 'POST') {
    console.log(`❌ Metodo ${req.method} non permesso`);
    return res.status(405).json({ error: 'Solo POST permesso' });
  }

  // 🔍 LOG DETTAGLIATO DELLA RICHIESTA
  console.log('🎯 === NUOVA RICHIESTA PROXY ===');
  console.log('📊 Request details:', {
    method: req.method,
    url: req.url,
    headers: req.headers,
    bodyType: typeof req.body,
    bodySize: req.body ? JSON.stringify(req.body).length : 0
  });

  try {
    // Estrai il target webhook dall'header
    const targetWebhook = req.headers['x-target-webhook'];
    
    console.log('🎯 Target webhook:', targetWebhook);
    
    if (!targetWebhook) {
      console.log('❌ Header X-Target-Webhook mancante');
      return res.status(400).json({ 
        error: 'Header X-Target-Webhook obbligatorio' 
      });
    }

    // Whitelist dei webhook permessi
    const allowedWebhooks = [
      'https://hook.eu2.make.com/rs8d7ntch8kqi7zpcjwy8pqudz8yr8s0',
      'https://hook.eu2.make.com/6c532l9lbrpji3mjm6decgduwt8hbvqw',
      'https://hooks.zapier.com/hooks/catch/24572349/udj8db0/'
    ];

    if (!allowedWebhooks.includes(targetWebhook)) {
      console.log(`🚫 Webhook non autorizzato: ${targetWebhook}`);
      console.log('✅ Webhook permessi:', allowedWebhooks);
      return res.status(403).json({ 
        error: 'Webhook non autorizzato',
        provided: targetWebhook,
        allowed: allowedWebhooks
      });
    }

    console.log('✅ Webhook autorizzato, procedo con l\'invio...');

    // 📦 LOG DEL PAYLOAD
    console.log('📦 Payload da inviare:');
    console.log(JSON.stringify(req.body, null, 2));

    // 🚀 RICHIESTA A MAKE.COM CON TIMEOUT E LOGGING
    console.log(`📡 Invio richiesta a Make.com: ${targetWebhook}`);
    
    const startTime = Date.now();
    
    // Controller per timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => {
      console.log('⏰ TIMEOUT - Aborting request after 25 seconds');
      controller.abort();
    }, 25000);

    let makeResponse;
    try {
      makeResponse = await fetch(targetWebhook, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json, text/plain, */*',
          'User-Agent': 'PropleaderProxy/1.0'
        },
        body: JSON.stringify(req.body),
        signal: controller.signal
      });
    } catch (fetchError) {
      clearTimeout(timeoutId);
      
      console.error('💥 ERRORE FETCH verso Make.com:', {
        name: fetchError.name,
        message: fetchError.message,
        stack: fetchError.stack
      });
      
      if (fetchError.name === 'AbortError') {
        console.log('⏰ Request abortita per timeout');
        return res.status(408).json({ 
          error: 'Timeout - Make.com non ha risposto entro 25 secondi',
          webhook: targetWebhook,
          timeout: '25s'
        });
      }
      
      if (fetchError.message.includes('fetch')) {
        console.log('🌐 Errore di rete verso Make.com');
        return res.status(502).json({ 
          error: 'Impossibile raggiungere Make.com',
          webhook: targetWebhook,
          details: fetchError.message
        });
      }
      
      throw fetchError; // Re-throw per catch generale
    }

    clearTimeout(timeoutId);
    const endTime = Date.now();
    const duration = endTime - startTime;

    console.log(`⏱️ Richiesta completata in ${duration}ms`);
    console.log(`📥 Risposta Make.com: ${makeResponse.status} ${makeResponse.statusText}`);

    // 🔍 LOG HEADERS DI RISPOSTA
    console.log('📊 Response headers da Make.com:');
    for (const [key, value] of makeResponse.headers.entries()) {
      console.log(`  ${key}: ${value}`);
    }

    // 🔍 LEGGI E PROCESSA LA RISPOSTA
    let responseData;
    let responseText;
    
    try {
      // Prima leggi come testo
      responseText = await makeResponse.text();
      console.log('📄 Raw response da Make.com:');
      console.log(responseText);
      
      // Poi prova a parsificare come JSON
      if (responseText.trim()) {
        try {
          responseData = JSON.parse(responseText);
          console.log('✅ Response parsificata come JSON:', responseData);
        } catch (parseError) {
          console.log('⚠️ Response non è JSON valido, uso formato wrapper');
          responseData = {
            status: makeResponse.ok ? 'whatsapp-si' : 'error',
            raw: responseText,
            httpStatus: makeResponse.status,
            parseError: parseError.message
          };
        }
      } else {
        console.log('⚠️ Response vuota da Make.com');
        responseData = {
          status: makeResponse.ok ? 'whatsapp-si' : 'error',
          raw: '',
          httpStatus: makeResponse.status,
          message: 'Empty response from Make.com'
        };
      }
      
    } catch (responseError) {
      console.error('❌ Errore lettura response:', responseError);
      responseData = {
        status: 'error',
        error: 'Failed to read response from Make.com',
        httpStatus: makeResponse.status,
        details: responseError.message
      };
    }

    // 🎯 INVIA RISPOSTA AL CLIENT
    console.log('📤 Risposta finale al client:');
    console.log(JSON.stringify(responseData, null, 2));
    console.log('🏁 === FINE RICHIESTA PROXY ===\n');
    
    return res.status(makeResponse.status).json(responseData);

  } catch (error) {
    // 💥 GESTIONE ERRORI GENERALE
    console.error('💥 ERRORE GENERALE DEL PROXY:', {
      name: error.name,
      message: error.message,
      stack: error.stack
    });

    console.log('📤 Invio errore 500 al client');
    console.log('🏁 === FINE RICHIESTA PROXY (ERROR) ===\n');
    
    return res.status(500).json({ 
      error: 'Errore interno del proxy',
      timestamp: new Date().toISOString(),
      details: error.message
    });
  }
}

// Configurazione Vercel
export const config = {
  api: {
    bodyParser: {
      sizeLimit: '2mb',
    },
  },
};
