

// Usar la URL completa del Worker en lugar del proxy
const API_URL = 'https://google-drive-api.certificatemedicine.workers.dev';


// Función para obtener URL de autorización
export const getAuthUrl = async () => {
  try {
    const response = await fetch(`${API_URL}/getAuthUrl`, {
      method: 'GET',
      headers: {
        'Accept': 'application/json'
      }
    });
    
    // Verificar si la respuesta es JSON válido
    const contentType = response.headers.get('content-type');
    if (!contentType || !contentType.includes('application/json')) {
      const text = await response.text();
      throw new Error(`Respuesta no válida: ${text}`);
    }
    
    const data = await response.json();
    return data.authUrl;
  } catch (error) {
    console.error('Error al obtener URL de autorización:', error);
    throw error;
  }
};

// Función para crear una carpeta en Google Drive
export const createFolderInDrive = async (folderName, parentFolderId = null) => {
  try {
    const tokens = JSON.parse(localStorage.getItem('googleDriveTokens'));
    if (!tokens) {
      throw new Error('No hay tokens de autenticación');
    }

    // Crear metadatos de la carpeta
    const metadata = {
      name: folderName,
      mimeType: 'application/vnd.google-apps.folder',
    };

    // Si se proporciona un ID de carpeta padre, añadirlo a los metadatos
    if (parentFolderId) {
      metadata.parents = [parentFolderId];
    }

    // Hacer la solicitud para crear la carpeta
    const response = await fetch('https://www.googleapis.com/drive/v3/files', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${tokens.access_token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(metadata),
    });

    if (!response.ok) {
      throw new Error(`Error al crear carpeta: ${response.statusText}`);
    }

    const data = await response.json();
    return data.id;
  } catch (error) {
    console.error('Error al crear carpeta en Drive:', error);
    throw error;
  }
};


// Función para obtener tokens con el código de autorización
export const getTokens = async (code) => {
  try {
    const response = await fetch(`${API_URL}/getTokens`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ code }),
    });
    const data = await response.json();
    return data.tokens;
  } catch (error) {
    console.error('Error al obtener tokens:', error);
    throw error;
  }
};
// Función para obtener el token de acceso actual
export const getAccessToken = () => {
  try {
    const tokens = JSON.parse(localStorage.getItem('googleDriveTokens'));
    if (!tokens || !tokens.access_token) {
      return null;
    }
    return tokens.access_token;
  } catch (error) {
    console.error('Error al obtener token de acceso:', error);
    return null;
  }
};
// Añade esta función para eliminar un archivo por su ID
export const deleteFileFromDrive = async (fileId) => {
  try {
    const accessToken = getAccessToken();
    if (!accessToken) {
      throw new Error('No hay token de acceso disponible');
    }

    const response = await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${accessToken}`
      }
    });

    if (!response.ok) {
      throw new Error(`Error al eliminar archivo: ${response.statusText}`);
    }

    return true;
  } catch (error) {
    console.error('Error al eliminar archivo de Drive:', error);
    throw error;
  }
};


// Función para configurar el cliente con tokens existentes
export const setTokens = (tokens) => {
  localStorage.setItem('googleDriveTokens', JSON.stringify(tokens));
};
export const uploadFileToDrive = async (fileBlob, fileName, folderId = null) => {
  try {
    const accessToken = getAccessToken();
    if (!accessToken) {
      throw new Error('No hay token de acceso disponible');
    }

    const metadata = {
      name: fileName,
      mimeType: 'application/pdf',
    };

    if (folderId) {
      metadata.parents = [folderId];
    }

    const form = new FormData();
    form.append('metadata', new Blob([JSON.stringify(metadata)], { type: 'application/json' }));
    form.append('file', fileBlob);

    const response = await fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`
      },
      body: form
    });

    if (!response.ok) {
      throw new Error(`Error al subir archivo: ${response.statusText}`);
    }

    const data = await response.json();
    
    // Configurar permisos para que cualquiera con el enlace pueda ver el archivo
    await fetch(`https://www.googleapis.com/drive/v3/files/${data.id}/permissions`, {
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

    // Devolver tanto la URL como el ID del archivo
    return {
      url: `https://drive.google.com/file/d/${data.id}/view`,
      fileId: data.id
    };
  } catch (error) {
    console.error('Error al subir archivo a Drive:', error);
    throw error;
  }
};

export default {
  getAuthUrl,
  getTokens,
  setTokens,
  uploadFileToDrive,
  createFolderInDrive,
  deleteFileFromDrive,
  getAccessToken
};