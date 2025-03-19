// Implementación para Cloudflare Workers
addEventListener('fetch', event => {
  event.respondWith(handleRequest(event.request))
})

// Configuración de OAuth2
const CLIENT_ID = process.env.REACT_APP_GOOGLE_OAUTH_CLIENT_ID;
const CLIENT_SECRET = process.env.REACT_APP_GOOGLE_OAUTH_CLIENT_SECRET;
const REDIRECT_URI = 'https://check-certificado.vercel.app/oauth2callback';
const SCOPES = ['https://www.googleapis.com/auth/drive.file'];

async function handleRequest(request) {
  const url = new URL(request.url);
  const path = url.pathname;

  // Configuración de CORS mejorada
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',  // O específicamente 'http://localhost:5173'
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS, PUT, DELETE',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Requested-With',
    'Access-Control-Max-Age': '86400',  // 24 horas
  };

  // Manejar preflight OPTIONS de forma más explícita
  if (request.method === 'OPTIONS') {
    return new Response(null, { 
      status: 204,  // No Content es más apropiado para OPTIONS
      headers: corsHeaders 
    });
  }

  // Rutas de la API (sin /api al principio para workers.dev)
  if (path === '/getAuthUrl') {
    return handleGetAuthUrl(request, corsHeaders);
  } else if (path === '/getTokens') {
    return handleGetTokens(request, corsHeaders);
  } else if (path === '/uploadToDrive') {
    return handleUploadToDrive(request, corsHeaders);
  }

  return new Response('Not Found', { status: 404 });
}

// Función para generar URL de autorización
async function handleGetAuthUrl(request, corsHeaders) {
  try {
    // Construir URL de autorización manualmente (sin googleapis)
    const authUrl = new URL('https://accounts.google.com/o/oauth2/v2/auth');
    authUrl.searchParams.append('client_id', CLIENT_ID);
    authUrl.searchParams.append('redirect_uri', REDIRECT_URI);
    authUrl.searchParams.append('response_type', 'code');
    authUrl.searchParams.append('scope', SCOPES.join(' '));
    authUrl.searchParams.append('access_type', 'offline');
    authUrl.searchParams.append('prompt', 'consent');

    // Asegurarse de devolver JSON válido con los encabezados correctos
    return new Response(JSON.stringify({ authUrl: authUrl.toString() }), {
      headers: {
        'Content-Type': 'application/json',
        ...corsHeaders
      }
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: {
        'Content-Type': 'application/json',
        ...corsHeaders
      }
    });
  }
}

// Función para obtener tokens con el código de autorización
async function handleGetTokens(request, corsHeaders) {
  try {
    if (request.method !== 'POST') {
      return new Response('Method Not Allowed', { 
        status: 405,
        headers: corsHeaders
      })
    }

    const requestData = await request.json();
    const code = requestData.code;

    if (!code) {
      return new Response(JSON.stringify({ error: 'No se proporcionó código' }), {
        status: 400,
        headers: {
          'Content-Type': 'application/json',
          ...corsHeaders
        }
      })
    }

    // Intercambiar código por tokens
    const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: new URLSearchParams({
        code,
        client_id: CLIENT_ID,
        client_secret: CLIENT_SECRET,
        redirect_uri: REDIRECT_URI,
        grant_type: 'authorization_code'
      })
    });

    const tokens = await tokenResponse.json();

    return new Response(JSON.stringify({ tokens }), {
      headers: {
        'Content-Type': 'application/json',
        ...corsHeaders
      }
    })
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: {
        'Content-Type': 'application/json',
        ...corsHeaders
      }
    })
  }
}

// Función para subir archivo a Google Drive
async function handleUploadToDrive(request, corsHeaders) {
  try {
    if (request.method !== 'POST') {
      return new Response('Method Not Allowed', { 
        status: 405,
        headers: corsHeaders
      })
    }

    // Nota: Cloudflare Workers tiene limitaciones para procesar FormData
    // Esta es una implementación simplificada
    const formData = await request.formData();
    const file = formData.get('file');
    const tokensString = formData.get('tokens');
    
    if (!file || !tokensString) {
      return new Response(JSON.stringify({ error: 'Faltan datos requeridos' }), {
        status: 400,
        headers: {
          'Content-Type': 'application/json',
          ...corsHeaders
        }
      })
    }

    const tokens = JSON.parse(tokensString);
    const accessToken = tokens.access_token;

    // Crear archivo en Drive (metadata)
    const metadataResponse = await fetch('https://www.googleapis.com/drive/v3/files', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        name: file.name,
        mimeType: 'application/pdf'
      })
    });

    const metadata = await metadataResponse.json();
    const fileId = metadata.id;

    // Subir contenido del archivo
    const fileBuffer = await file.arrayBuffer();
    await fetch(`https://www.googleapis.com/upload/drive/v3/files/${fileId}?uploadType=media`, {
      method: 'PATCH',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': file.type
      },
      body: fileBuffer
    });

    // Configurar permisos para que sea público
    await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}/permissions`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        role: 'reader',
        type: 'anyone'
      })
    });

    // Obtener enlace compartido
    const shareResponse = await fetch(
      `https://www.googleapis.com/drive/v3/files/${fileId}?fields=webViewLink`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${accessToken}`
        }
      }
    );
    
    const shareData = await shareResponse.json();

    return new Response(JSON.stringify({ 
      fileId: fileId,
      webViewLink: shareData.webViewLink 
    }), {
      headers: {
        'Content-Type': 'application/json',
        ...corsHeaders
      }
    })
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: {
        'Content-Type': 'application/json',
        ...corsHeaders
      }
    })
  }
}