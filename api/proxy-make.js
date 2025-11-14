// api/proxy-make.js - VERSIONE INTELLIGENTE CON GOOGLE SHEETS SOLO PER LEAD + API KEY

export default async function handler(req, res) {
  // 🔐 API KEY PER MAKE.COM
  const MAKE_API_KEY = 'mk_auth_2024_7X9kL3mQ8nR4pT6vY2sZ1wE5uI0oB9cN';

  // CORS Headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-Target-Webhook, X-Request-Type, X-Google-Sheets-Url');
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
  console.log('🎯 === NUOVA RICHIESTA PROXY INTELLIGENTE ===');
  console.log('📊 Request details:', {
    method: req.method,
    url: req.url,
    headers: req.headers,
    bodyType: typeof req.body,
    bodySize: req.body ? JSON.stringify(req.body).length : 0
  });

  try {
    // Estrai headers importanti
    const targetWebhook = req.headers['x-target-webhook'];
    const requestType = req.headers['x-request-type']; // 'lead' o 'tracking'
    const googleSheetsUrl = req.headers['x-google-sheets-url'];
    
    console.log('🎯 Target webhook:', targetWebhook);
    console.log('🏷️ Request type:', requestType);
    console.log('📊 Google Sheets URL:', googleSheetsUrl);
    console.log('🔐 Using API Key:', MAKE_API_KEY.substring(0, 15) + '...');
    
    if (!targetWebhook) {
      console.log('❌ Header X-Target-Webhook mancante');
      return res.status(400).json({ 
        error: 'Header X-Target-Webhook obbligatorio' 
      });
    }

    // Whitelist dei webhook permessi
    const allowedWebhooks = [
      // LEAD su n8n
      'https://digitalsolutions.app.n8n.cloud/webhook/875aa7f1-389c-4182-b241-5526dc271962',
      'https://digitalsolutions.app.n8n.cloud/webhook-test/875aa7f1-389c-4182-b241-5526dc271962',
    
      // TRACKING ancora su Make
      'https://hook.eu2.make.com/6c532l9lbrpji3mjm6decgduwt8hbvqw'
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

    // 🚀 RICHIESTA A MAKE.COM CON TIMEOUT E LOGGING + API KEY
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
          'User-Agent': 'PropleaderProxy/1.1',
          'x-make-apikey': MAKE_API_KEY  // 🔐 API KEY PER MAKE.COM
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

    // 🔍 LEGGI E INOLTRA DIRETTAMENTE LA RISPOSTA DI MAKE.COM
    let responseData;
    let responseText;
    
    try {
      // Leggi la risposta come testo
      responseText = await makeResponse.text();
      console.log('📄 Raw response da Make.com:');
      console.log(responseText);
      
      // Prova a parsificare come JSON
      if (responseText.trim()) {
        try {
          // 📦 INOLTRA DIRETTAMENTE QUELLO CHE RESTITUISCE MAKE.COM
          responseData = JSON.parse(responseText);
          console.log('✅ Response parsificata come JSON - inoltro direttamente:', responseData);
        } catch (parseError) {
          console.log('⚠️ Response non è JSON valido, creo wrapper');
          responseData = {
            raw: responseText,
            httpStatus: makeResponse.status,
            parseError: parseError.message
          };
        }
      } else {
        console.log('⚠️ Response vuota da Make.com');
        responseData = {
          raw: '',
          httpStatus: makeResponse.status,
          message: 'Empty response from Make.com'
        };
      }
      
    } catch (responseError) {
      console.error('❌ Errore lettura response:', responseError);
      responseData = {
        error: 'Failed to read response from Make.com',
        httpStatus: makeResponse.status,
        details: responseError.message
      };
    }

    // 🧠 LOGICA INTELLIGENTE: INVIA A GOOGLE SHEETS SOLO SE È UN LEAD
    let sheetsResult = null;
    
    if (requestType === 'lead' && googleSheetsUrl) {
      console.log('📊 === RILEVATO LEAD - INVIO A GOOGLE SHEETS ===');
      
      try {
        // Prepara dati semplificati per Google Sheets (solo i campi essenziali)
        const sheetsData = {
          name: req.body.name || '',
          email: req.body.email || '',
          phone: req.body.phone || '',
          prefix: req.body.prefix || '',
          funnel: req.body.funnel || ''
        };
        
        console.log('📦 Dati per Google Sheets:', JSON.stringify(sheetsData, null, 2));
        
        // Invia a Google Sheets
        const sheetsResponse = await fetch(googleSheetsUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(sheetsData)
        });
        
        if (sheetsResponse.ok) {
          const sheetsResponseData = await sheetsResponse.text();
          console.log('✅ Salvato su Google Sheets:', sheetsResponseData);
          
          try {
            sheetsResult = {
              success: true,
              response: JSON.parse(sheetsResponseData)
            };
          } catch {
            sheetsResult = {
              success: true,
              response: sheetsResponseData
            };
          }
        } else {
          console.error('❌ Errore Google Sheets:', sheetsResponse.status, sheetsResponse.statusText);
          sheetsResult = {
            success: false,
            error: `Google Sheets error: ${sheetsResponse.status}`,
            status: sheetsResponse.status
          };
        }
        
      } catch (sheetsError) {
        console.error('💥 ERRORE invio a Google Sheets:', sheetsError);
        sheetsResult = {
          success: false,
          error: sheetsError.message
        };
      }
    } else if (requestType === 'lead') {
      console.log('⚠️ LEAD rilevato ma Google Sheets URL mancante');
      sheetsResult = {
        success: false,
        error: 'Google Sheets URL mancante per il lead'
      };
    } else {
      console.log('ℹ️ Non è un lead, salto Google Sheets');
    }

    // 🎯 PREPARA RISPOSTA FINALE
    const finalResponse = {
      ...responseData,
      proxy_info: {
        duration_ms: duration,
        request_type: requestType,
        timestamp: new Date().toISOString(),
        authenticated: true  // 🔐 Indica che la richiesta è autenticata
      }
    };

    // Aggiungi info Google Sheets se presente
    if (sheetsResult) {
      finalResponse.google_sheets = sheetsResult;
    }

    console.log('📤 Risposta finale al client:');
    console.log(JSON.stringify(finalResponse, null, 2));
    console.log('🏁 === FINE RICHIESTA PROXY INTELLIGENTE ===\n');
    
    return res.status(makeResponse.status).json(finalResponse);

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
