import React, { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { getTokens, setTokens } from '../utils/googleDriveService';

const OAuth2Callback = () => {
  const [status, setStatus] = useState('Procesando autenticación...');
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const processAuth = async () => {
      try {
        // Obtener código de la URL
        const urlParams = new URLSearchParams(location.search);
        const code = urlParams.get('code');
        
        if (!code) {
          setStatus('Error: No se recibió código de autorización');
          return;
        }
        
        // Obtener tokens
        const tokens = await getTokens(code);
        
        // Guardar tokens
        localStorage.setItem('googleDriveTokens', JSON.stringify(tokens));
        setTokens(tokens);
        
        setStatus('Autenticación exitosa. Redirigiendo...');
        
        // Redirigir después de 2 segundos
        setTimeout(() => {
          navigate('/');
        }, 2000);
      } catch (error) {
        console.error('Error en callback OAuth2:', error);
        setStatus(`Error: ${error.message}`);
      }
    };
    
    processAuth();
  }, [location, navigate]);

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-100">
      <div className="bg-white p-8 rounded-lg shadow-md max-w-md w-full">
        <h1 className="text-2xl font-bold mb-4 text-center">Google Drive</h1>
        <div className="text-center">
          <p className="mb-4">{status}</p>
          {status.includes('Error') && (
            <button
              onClick={() => navigate('/')}
              className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
            >
              Volver al inicio
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default OAuth2Callback;