# 🚀 CORS Proxy per Make.com

Proxy semplice per risolvere problemi CORS con webhook Make.com. Deploy su Vercel in 2 minuti.

## 🎯 Problema Risolto

Alcuni browser bloccano le richieste dirette ai webhook Make.com a causa delle policy CORS:

```
❌ Browser → Make.com (CORS BLOCKED)
✅ Browser → Proxy Vercel → Make.com (FUNZIONA)
```

## 🔧 Setup Veloce

### 1. Clona questo repository
```bash
git clone https://github.com/TUO-USERNAME/cors-proxy-make.git
cd cors-proxy-make
```

### 2. Deploy su Vercel
```bash
npm i -g vercel
vercel
```

### 3. Configura i tuoi webhook
Modifica il file `api/proxy-make.js` e aggiungi i tuoi URL Make.com:

```javascript
const allowedWebhooks = [
  'https://hook.eu2.make.com/rs8d7ntch8kqi7zpcjwy8pqudz8yr8s0', // Form principale
  'https://hook.eu2.make.com/6c532l9lbrpji3mjm6decgduwt8hbvqw', // Lead tracking
  // Aggiungi qui i tuoi webhook
];
```

## 📡 Come Usare

### Nel tuo JavaScript frontend:

```javascript
// ❌ PRIMA (diretto - CORS error)
const response = await fetch('https://hook.eu2.make.com/...', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(data)
});

// ✅ DOPO (via proxy - funziona)
const response = await fetch('https://tuo-proxy.vercel.app/api/proxy-make', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'X-Target-Webhook': 'https://hook.eu2.make.com/rs8d7ntch8kqi7zpcjwy8pqudz8yr8s0'
  },
  body: JSON.stringify(data)
});

const result = await response.json();
// result contiene la risposta identica di Make.com
```

### Esempio completo:

```javascript
// Configurazione
const PROXY_URL = 'https://tuo-proxy.vercel.app/api/proxy-make';
const WEBHOOK_MAIN = 'https://hook.eu2.make.com/rs8d7ntch8kqi7zpcjwy8pqudz8yr8s0';

// Funzione helper
async function sendToMake(data) {
  const response = await fetch(PROXY_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Target-Webhook': WEBHOOK_MAIN
    },
    body: JSON.stringify(data)
  });
  
  return await response.json();
}

// Uso
const formData = {
  name: 'Mario Rossi',
  email: 'mario@email.com',
  phone: '1234567890'
};

try {
  const result = await sendToMake(formData);
  
  if (result.status === 'whatsapp-si') {
    console.log('✅ Successo!');
  } else if (result.status === 'whatsapp-no') {
    console.log('❌ WhatsApp non valido');
  }
} catch (error) {
  console.error('💥 Errore:', error);
}
```

## 🔒 Sicurezza

Il proxy include diverse misure di sicurezza:

- ✅ **Whitelist webhook**: Solo URL autorizzati
- ✅ **CORS headers**: Configurati correttamente  
- ✅ **Method validation**: Solo POST permesso
- ✅ **Error handling**: Non espone dettagli interni
- ✅ **Request logging**: Per debugging (solo su Vercel)

## 📊 Struttura Progetto

```
cors-proxy-make/
├── api/
│   └── proxy-make.js        # 🎯 Proxy endpoint
├── vercel.json              # ⚙️ Configurazione Vercel
├── package.json             # 📦 Metadati progetto
└── README.md                # 📖 Questa documentazione
```

## 🛠️ Configurazione Avanzata

### Timeout personalizzato
```json
// vercel.json
{
  "functions": {
    "api/proxy-make.js": {
      "maxDuration": 60
    }
  }
}
```

### Headers personalizzati
```javascript
// In proxy-make.js
res.setHeader('Access-Control-Allow-Origin', 'https://tuo-dominio.com'); // Più restrittivo
res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
```

### Logging avanzato
```javascript
// In proxy-make.js
console.log('📥 Request:', {
  method: req.method,
  webhook: req.headers['x-target-webhook'],
  timestamp: new Date().toISOString()
});
```

## 🐛 Debugging

### Controlla i log Vercel:
1. Vai su [vercel.com](https://vercel.com)
2. Seleziona il tuo progetto
3. Tab "Functions" → Logs

### Test del proxy:
```bash
curl -X POST https://tuo-proxy.vercel.app/api/proxy-make \
  -H "Content-Type: application/json" \
  -H "X-Target-Webhook: https://hook.eu2.make.com/..." \
  -d '{"test": "data"}'
```

### Errori comuni:

| Errore | Causa | Soluzione |
|--------|-------|-----------|
| `403 Forbidden` | Webhook non nella whitelist | Aggiungi URL a `allowedWebhooks` |
| `405 Method Not Allowed` | Metodo diverso da POST | Usa solo POST |
| `400 Bad Request` | Header `X-Target-Webhook` mancante | Aggiungi header alla richiesta |
| `500 Internal Error` | Errore Make.com | Controlla logs Vercel |

## 📈 Performance

- ⚡ **Latency**: ~50-200ms aggiuntivi
- 🌍 **Edge locations**: Network globale Vercel
- 📊 **Throughput**: 1000+ richieste/giorno (piano free)
- ⏱️ **Timeout**: 10s (free) / 60s (pro)

## 🔄 Aggiornamenti

### Aggiungere nuovo webhook:
1. Modifica `allowedWebhooks` in `api/proxy-make.js`
2. Commit e push su GitHub
3. Vercel si aggiorna automaticamente

### Aggiornare configurazione:
```bash
git add .
git commit -m "Update webhook configuration"
git push origin main
```

## 📞 Supporto

### Problemi comuni:
- **CORS ancora bloccato**: Verifica che l'URL del proxy sia corretto
- **500 errors**: Controlla che Make.com sia raggiungibile
- **Risposte vuote**: Verifica formato dati inviati

### Debug headers:
```javascript
// Nel browser, controlla Network tab
const response = await fetch(PROXY_URL, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'X-Target-Webhook': WEBHOOK_URL
  },
  body: JSON.stringify(data)
});

console.log('Status:', response.status);
console.log('Headers:', [...response.headers.entries()]);
```

## 📝 Note

- ✅ **Gratis**: Vercel free tier include 100GB bandwidth
- ✅ **Veloce**: Edge functions con latency globale bassa
- ✅ **Affidabile**: 99.9% uptime SLA
- ✅ **Scalabile**: Auto-scaling automatico

## 🚀 Deploy Alternativo

### Railway (se preferisci):
```bash
# Clone e setup
git clone https://github.com/TUO-USERNAME/cors-proxy-make.git
cd cors-proxy-make

# Deploy su Railway
npm i -g @railway/cli
railway login
railway link
railway up
```

---

**🎯 Obiettivo**: Risolvere CORS con Make.com in modo semplice ed elegante.  
**⚡ Setup**: 2 minuti  
**💰 Costo**: Gratis (Vercel free tier)  
**🔧 Manutenzione**: Zero

Made with ❤️ per risolvere problemi CORS una volta per tutte!
