import React, { useState, useEffect } from 'react';
import { Document, Page, Text, View, StyleSheet, Font, pdf, Image, PDFViewer } from '@react-pdf/renderer';
import * as XLSX from 'xlsx';
import JSZip from 'jszip';
import QRCode from 'qrcode';
import logoImage from '../imagenes/logo.png';
import selloImage from '../imagenes/sello.png';
import fondoPdf from '../imagenes/formato-certificado.png';
import certificadoImage from '../imagenes/certificado.png';
import firmaImage from '../imagenes/firma.png';
import { getAuthUrl, getTokens, setTokens, uploadFileToDrive, createFolderInDrive, deleteFileFromDrive, getAccessToken } from '../utils/googleDriveService';
// Importar las fuentes locales
import barlowRegular from '../assets/font/Barlow-Regular.ttf';
import barlowBold from '../assets/font/Barlow-Bold.ttf';
import barlowLight from '../assets/font/Barlow-Light.ttf'; // Asumiendo que tienes esta variante para weight 300
// Definimos los estilos sin depender de fuentes externas
// Registrar la fuente Barlow
// Registrar la fuente Barlow desde archivos locales
Font.register({
  family: 'Open Sans',
  fonts: [
    { src: 'https://cdn.jsdelivr.net/npm/open-sans-all@0.1.3/fonts/open-sans-regular.ttf', fontWeight: 'normal' },
    { src: 'https://cdn.jsdelivr.net/npm/open-sans-all@0.1.3/fonts/open-sans-600.ttf', fontWeight: 'bold' },
    { src: 'https://cdn.jsdelivr.net/npm/open-sans-all@0.1.3/fonts/open-sans-300.ttf', fontWeight: '300' },
  ]
});

const styles = StyleSheet.create({
  page: {
    width: '279mm',  // Volvemos al tamaño estándar
    height: '216mm',
    padding: 0,
    fontFamily: 'Open Sans', // Cambiado a Barlow
    orientation: 'landscape',
    position: 'relative',
    backgroundColor: 'transparent', // Hacemos el fondo transparente
  },
  mainTitle: {
    fontSize: 35, // 35px como solicitado

    marginBottom: 10,
    textAlign: 'center',
    fontWeight: 'bold',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'flex-start',
    alignItems: 'flex-start',
    marginBottom: 30,
  },
  backgroundImage: {
    position: 'absolute',
    width: '100%',
    height: '100%',
    top: 0,
    left: 0,
    zIndex: -1,
  },
  logo: {
    width: 150,
    height: 150,
    position: 'absolute',
    top: 1,
    left: 1,
  },
  footerContent: {
    fontSize: 10,
    textAlign: 'center',
    lineHeight: 1.4, // Reducido
    marginBottom: 15, // Reducido de 30 a 15
  },
  titleContainer: {
    alignItems: 'center',
    marginBottom: 15,
  },
  certTitle: {
    fontSize: 20, // 20px como solicitado

    marginBottom: 10,
    textAlign: 'center',
    fontWeight: '300', // Font weight 300 como solicitado
  },
  name: {
    fontSize: 30, // 30px como solicitado
  
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 10,
  },
  rut: {
    fontSize: 18,

    marginBottom: 20,
    textAlign: 'center',
    fontWeight: 'bold', // Hacemos el texto más grueso
  },
  content: {
    fontSize: 18, // Reducido de 20 a 18
    color: '#000000',
    textAlign: 'center',
    lineHeight: 1.5, // Reducido ligeramente
    marginBottom: 20, // Reducido de 30 a 20
    fontWeight: '300',
  },

  footer: {
    position: 'absolute',
    bottom: 25, // Ajustado de 40 a 25
    left: 40,
    right: 40,
    alignItems: 'center',
  },
  footerImages: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    marginTop: 20,
    padding: '0 20px',
  },
  signatureContainer: {
    flex: 1,
    alignItems: 'center',
    marginHorizontal: 20,
  },
  contentContainer: {
    padding: 25,
    width: '100%',
    height: '100%',
    position: 'relative',
    zIndex: 1,
    backgroundColor: 'transparent', // Aseguramos que este contenedor también sea transparente
  },
  

  signatureImage: {
    width: '100%',
    height: 80,
    objectFit: 'contain',
    marginBottom: 10,
  },
  sealContainer: {
    marginTop:-30,
    alignItems: 'center',
    marginBottom: 0,
  },
  sealImage: {
    width: 180,
    height: 180,
    objectFit: 'contain',
    marginBottom: 2,
  },
  qrContainer: {
    position: 'absolute',
    bottom: 40,
    right: 40,
    width: 80,
    height: 80,
    alignItems: 'center',
  },
  qrImage: {
    width: 80,
    height: 80,
  },
  qrText: {
    fontSize: 8,

    textAlign: 'center',
    marginTop: 5,
  },
  websiteText: {
    fontSize: 10,

    textAlign: 'center',
    marginTop: -30,
  },
  certificateImage: {
    width: 150,
    height: 150,
    objectFit: 'contain',
  },
  dynamicData: {

    fontWeight: 'bold', // Hacemos el texto más grueso
  },
  signatureName: {
    fontSize: 10,

    textAlign: 'center',
  },
  disclaimer: {
    fontSize: 10,
    color: '#666666',
    textAlign: 'center',
    marginTop: 20,
  },
  bottomRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    marginTop: 20,
  }
});

// Función para generar un QR como imagen base64
const generateQRCode = async (url) => {
  try {
    const qrDataURL = await QRCode.toDataURL(url, {
      width: 80,
      margin: 1,
      color: {
        dark: '#000000',
        light: '#ffffff',
      },
    });
    return qrDataURL;
  } catch (error) {
    console.error('Error generando QR:', error);
    return null;
  }
};

const Certificate = ({ data }) => {
  return (
    <Document>
          <Page size={[792, 612]} style={styles.page}>
        {/* Imagen de fondo - manejo de imagen paara "@react-pdf/renderer" */}
        <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}>
          <Image src={fondoPdf} style={{ width: '100%', height: '100%' }} />
        </View>
        <View style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          padding: 25,
        }}>
          
          <View style={styles.titleContainer}>
          <Text style={styles.mainTitle}>CERTIFICADO DE APROBACIÓN</Text>
            <Text style={styles.certTitle}>Certificamos que:</Text>
            <Text style={styles.name}>{data.nombre}</Text>
            <Text style={styles.rut}>Rut: {data.rut}</Text>
          </View>

        <View style={styles.content}>
          <Text>
          Ha participado en calidad de Asistente (<Text style={styles.dynamicData}>{data.asistencia}% de asistencia</Text>) y ha{'\n'}
          aprobado con nota final <Text style={styles.dynamicData}>{data.nota}</Text>, la 3ra Jornada "<Text style={styles.dynamicData}>{data.nombreCurso}</Text>",{'\n'}
          organizado por Check Medicine Mode On, con un total de <Text style={styles.dynamicData}>{data.horas}</Text> horas{'\n'}
          pedagógicas, realizado desde el <Text style={styles.dynamicData}>{data.fechaInicio}</Text> al <Text style={styles.dynamicData}>{data.fechaFin}</Text> <Text style={styles.dynamicData}>{data.año}</Text>.
          </Text>
        </View>
        <View style={styles.footerContent}>
          <Text>
            Santiago de Chile, {data.año} {'\n'}
            Este curso no pertenece a la malla curricular de la carrera de Medicina y sus{'\n'}
            calificaciones no forman parte del cálculo para la Calificación Médica Nacional (CMN).{'\n'}
          </Text>
        </View>
          <View style={styles.footer}>
            <View style={styles.footerImages}>
              <View style={styles.signatureContainer}>
                <Image style={styles.signatureImage} src={firmaImage} />
                <Text style={styles.signatureName}>
                NICOLETTE FRANCOIS{'\n'}
                AHUMADA ALVEAR{'\n'}
                CEO Check Medicine Mode On
                </Text>
              </View>
              <View style={styles.sealContainer}>
                <Image style={styles.sealImage} src={selloImage} />
                <Text style={styles.websiteText}>
                www.checkmedicinemo.com
                </Text>
              </View>
              <View style={styles.signatureContainer}>
                <Image style={styles.certificateImage} src={certificadoImage} />
              </View>
              <View style={styles.signatureContainer}>
                {data.qrCodeUrl && (
                  <View style={styles.qrContainer}>
                    <Image src={data.qrCodeUrl} style={styles.qrImage} />
                    <Text style={styles.qrText}>Verificar certificado</Text>
                  </View>
                )}
              </View>
            </View>
          </View>
      </View>
      </Page>
    </Document>
  );
};


const readExcelFile = (file) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target.result);
        const workbook = XLSX.read(data, { type: 'array' });
        const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
        const jsonData = XLSX.utils.sheet_to_json(firstSheet);
        resolve(jsonData);
      } catch (error) {
        reject(error);
      }
    };
    reader.readAsArrayBuffer(file);
  });
};

// Sample data for preview
const sampleData = {
  nombre: "Juan Pérez Ejemplo",
  rut: "12.345.678-9",
  asistencia: "100",
  nota: "6.5",
  jornada: "3ra Jornada",
  nombreCurso: "Abordaje Inicial: Medicina de Urgencias y Paciente Crítico",
  horas: "50",
  fechaInicio: "01/01/2024",
  fechaFin: "31/01/2024",
  año: "2024",
  numeroCertificado: "2728"
};

const CertificateGenerator = () => {
  const [excelData, setExcelData] = useState([]);
  const [showPreview, setShowPreview] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [progress, setProgress] = useState(0);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  useEffect(() => {
    const tokens = localStorage.getItem('googleDriveTokens');
    if (tokens) {
      setTokens(JSON.parse(tokens));
      setIsAuthenticated(true);
    }
  }, []);
   // Función para manejar la autenticación con Google
const handleGoogleAuth = async () => {
  try {
    // Obtener URL de autorización y redirigir
    const authUrl = await getAuthUrl();
    window.location.href = authUrl;
  } catch (error) {
    console.error('Error al obtener URL de autorización:', error);
    alert('Error al conectar con Google Drive');
  }
};
      // Función para procesar el código de autorización (debe ser llamada desde la página de callback)
  const handleAuthCallback = async (code) => {
    try {
      const tokens = await getTokens(code);
      // Guardar tokens en localStorage
      localStorage.setItem('googleDriveTokens', JSON.stringify(tokens));
      setTokens(tokens);
      setIsAuthenticated(true);
    } catch (error) {
      console.error('Error al obtener tokens:', error);
      alert('Error al autenticar con Google Drive');
    }
  };
  const handleFileUpload = async (event) => {
    const file = event.target.files[0];
    try {
      const data = await readExcelFile(file);
      // Limpiar y transformar los datos
      const transformedData = data.map(item => {
        // Convertir todas las claves del objeto a minúsculas y sin espacios
        const normalizedItem = {};
        Object.keys(item).forEach(key => {
          const normalizedKey = key.toLowerCase().trim();
          normalizedItem[normalizedKey] = item[key];
        });

        // Crear un objeto limpio con las claves correctas
        const cleanItem = {
          nombre: normalizedItem['nombre'] || '',
          rut: normalizedItem['rut'] || '',
          asistencia: normalizedItem['asistencia'] || 0,
          nota: normalizedItem['nota'] || '',
          jornada: normalizedItem['jornada'] || '',
          nombreCurso: normalizedItem['nombrecurso'] || '',
          horas: normalizedItem['horas'] || '',
          año: normalizedItem['año'] || new Date().getFullYear().toString(),
          numeroCertificado: normalizedItem['numerocertificado'] || '',
          fechaInicio: formatExcelDate(normalizedItem['fechainicio']),
          fechaFin: formatExcelDate(normalizedItem['fechafin'])
        };

        console.log('Item original:', item);
        console.log('Item normalizado:', normalizedItem);
        console.log('Item limpio:', cleanItem);

        return cleanItem;
      });

      console.log('Datos transformados:', transformedData);
      setExcelData(transformedData);
    } catch (error) {
      console.error('Error al leer el archivo Excel:', error);
      alert('Error al leer el archivo Excel');
    }
  };
  

  // Función para formatear fechas de Excel
  const formatExcelDate = (excelDate) => {
    if (!excelDate) return '';
    try {
      // Si es un número (fecha de Excel), convertir a fecha
      if (typeof excelDate === 'number') {
        const date = new Date((excelDate - 25569) * 86400 * 1000);
        return date.toLocaleDateString('es-ES', {
          day: '2-digit',
          month: '2-digit',
          year: 'numeric'
        });
      }
      // Si ya es string, devolverlo limpio
      return excelDate.toString().trim();
    } catch (error) {
      console.error('Error al formatear fecha:', error);
      return '';
    }
  };

// Función para subir un archivo a Google Drive
const uploadToDrive = async (fileBlob, fileName, folderId = null) => {
  try {
    if (!isAuthenticated) {
      alert('Debes autenticarte con Google Drive primero');
      return null;
    }
    
    // Subir archivo usando el servicio
    const result = await uploadFileToDrive(fileBlob, fileName, folderId);
    console.log('Resultado de subida a Drive:', result);
    return result;
  } catch (error) {
    console.error('Error al subir a Google Drive:', error);
    return null;
  }
};

   // Función para crear una carpeta con la fecha actual dentro de la carpeta principal
   const createDateFolder = async (parentFolderId) => {
    try {
      if (!isAuthenticated) {
        alert('Debes autenticarte con Google Drive primero');
        return null;
      }
      
      const today = new Date();
      const folderName = today.toLocaleDateString('es-ES', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
      }).replace(/\//g, '-');
      
      // Esta función debe ser implementada en googleDriveService.js
      const folderId = await createFolderInDrive(folderName, parentFolderId);
      
      // Si no se pudo crear la carpeta, lanzar un error específico
      if (!folderId) {
        throw new Error('No se pudo crear la carpeta. Posiblemente no tienes permisos suficientes o estás usando una cuenta incorrecta.');
      }
      
      return folderId;
    } catch (error) {
      console.error('Error al crear carpeta en Drive:', error);
      // Lanzar el error para que sea capturado por la función que llama a esta
      throw new Error(`Error al crear carpeta en Drive: ${error.message}`);
    }
  };
    const handleLogout = () => {
      localStorage.removeItem('googleDriveTokens');
      setIsAuthenticated(false);
      alert('Has cerrado sesión correctamente');
    };

// Función para procesar el RUT y obtener "rut sin" y "clave"
const procesarRut = (rut) => {
  if (!rut) return { rutSin: '', clave: '' };
  
  try {
    // Limpiar el RUT para asegurarnos que tiene el formato correcto
    const rutLimpio = rut.replace(/\s/g, '');
    
    // Separar el RUT en parte numérica y dígito verificador
    const parts = rutLimpio.split('-');
    const mainPart = parts[0].replace(/\./g, '').replace(/^0+/, '');
    const dv = parts.length > 1 ? parts[1] : '';
    
    // Para "rut sin", usamos el RUT completo con guion y dígito verificador
    const rutSin = `${mainPart}-${dv}`;
    
    // Para "clave", tomamos los últimos 4 dígitos de la parte numérica
    let clave = '';
    if (mainPart.length >= 4) {
      clave = mainPart.slice(-4);
    } else {
      clave = mainPart; // Si tiene menos de 4 dígitos, usamos lo que hay
    }
    
    return { rutSin, clave };
  } catch (error) {
    console.error('Error al procesar RUT:', error);
    return { rutSin: '', clave: '' };
  }
};




const generateCertificates = async () => {
  if (!excelData || excelData.length === 0) {
    alert('No hay datos para generar certificados');
    return;
  }

  setIsGenerating(true);
  setProgress(0);
  
  console.log('Iniciando generación de certificados con datos:', excelData);
  const zip = new JSZip();
  const totalItems = excelData.length;
  // Array para almacenar los datos actualizados con las URLs
  // Array para almacenar los datos actualizados con las URLs, "rut sin" y "clave"
  const updatedExcelData = excelData.map(item => {
    // Procesar el RUT para obtener "rut sin" y "clave"
    const { rutSin, clave } = procesarRut(item.rut);
    
    // Devolver el objeto con los nuevos campos
    return {
      ...item,
      'rut sin': rutSin,  // Usamos el nombre exacto que aparece en tu Excel
      'clave': clave
    };
  });

  try {
    // ID de la carpeta principal donde quieres guardar los certificados
    const mainFolderId = '1FU4bmvetv8La3TUtTD6PHlHpfT3Wu_p0';
    
    // Crear una subcarpeta con la fecha actual
    const today = new Date();
    const folderName = today.toLocaleDateString('es-ES', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    }).replace(/\//g, '-');
    
    let dateFolderId;
    try {
      dateFolderId = await createFolderInDrive(folderName, mainFolderId);
      if (!dateFolderId) {
        throw new Error('No se pudo crear la carpeta en Drive. Verifica que estés usando la cuenta correcta con los permisos adecuados.');
      }
    } catch (folderError) {
      // Si hay un error al crear la carpeta, detener todo el proceso
      alert(`Error: ${folderError.message}`);
      setIsGenerating(false);
      return; // Salir de la función para evitar continuar con el proceso
    }
    
    const targetFolderId = dateFolderId;
    console.log('Carpeta creada en Drive con ID:', targetFolderId);
    
    // Generar todos los certificados
    for (let i = 0; i < excelData.length; i++) {
      const data = excelData[i];
      console.log('Generando certificado para:', data);
      
      // Crear un nombre de archivo único
      const timestamp = new Date().getTime() + i; // Añadimos i para evitar colisiones
      const safeCourseName = data.nombreCurso.replace(/[^a-z0-9]/gi, '_').toLowerCase();
      const safeName = data.nombre.replace(/[^a-z0-9]/gi, '_').toLowerCase();
      const finalFileName = `certificado_${safeCourseName}_${safeName}_${timestamp}.pdf`;
      
      try {
        // Primero subimos un archivo placeholder para obtener la URL final
        // Creamos un blob pequeño como placeholder
        const placeholderBlob = new Blob(['Placeholder'], { type: 'text/plain' });
        
        // Subimos el placeholder para reservar la URL
        const placeholderResult = await uploadFileToDrive(placeholderBlob, finalFileName, targetFolderId);
        console.log('Placeholder subido a Drive:', placeholderResult);
        
        if (!placeholderResult || !placeholderResult.url || !placeholderResult.fileId) {
          throw new Error(`No se pudo crear el placeholder para ${data.nombre}`);
        }
        
        // Guardamos la URL y el fileId que usaremos para el certificado final
        const finalUrl = placeholderResult.url;
        const finalFileId = placeholderResult.fileId;
        
        // Guardamos la URL en el array de datos actualizados
        updatedExcelData[i] = {
          ...updatedExcelData[i],
          url_pdf: finalUrl
        };

        // Generamos el QR con la URL final (que ya sabemos)
        const qrCodeUrl = await generateQRCode(finalUrl);
        
        // Actualizamos los datos con la URL del QR
        const updatedData = { ...data, qrCodeUrl };
        
        // Generamos el PDF final con el QR
        const finalPdfBlob = await pdf(<Certificate data={updatedData} />).toBlob();
        
        // Reemplazamos el placeholder con el PDF final
        // Para esto, usamos la API de actualización de archivos de Google Drive
        const accessToken = getAccessToken();
        if (!accessToken) {
          throw new Error('No hay token de acceso disponible');
        }
        
        // Crear un FormData para la actualización
        const form = new FormData();
        form.append('file', finalPdfBlob);
        
        // Actualizar el archivo en Drive
        const updateResponse = await fetch(`https://www.googleapis.com/upload/drive/v3/files/${finalFileId}?uploadType=media`, {
          method: 'PATCH',
          headers: {
            'Authorization': `Bearer ${accessToken}`
          },
          body: finalPdfBlob
        });
        
        if (!updateResponse.ok) {
          throw new Error(`Error al actualizar el certificado: ${updateResponse.statusText}`);
        }
        
        console.log('Certificado con QR actualizado en Drive:', finalUrl);
        
        // Añadimos al ZIP la versión con QR
        zip.file(finalFileName, finalPdfBlob);
        
      } catch (certError) {
        console.error(`Error al generar certificado para ${data.nombre}:`, certError);
        // Continuamos con el siguiente certificado
      }
      
      // Actualizar progreso
      setProgress(Math.round(((i + 1) / totalItems) * 100));
    }

    // Crear y descargar el archivo ZIP
    console.log('Generando archivo ZIP...');
    const content = await zip.generateAsync({ type: "blob" });
    const url = URL.createObjectURL(content);
    const link = document.createElement('a');
    link.href = url;
    const timestamp = new Date().toISOString().split('T')[0];
    link.download = `certificados_${timestamp}.zip`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    
    // Generar el Excel actualizado con las URLs
    const workbook = XLSX.utils.book_new();
    const worksheet = XLSX.utils.json_to_sheet(updatedExcelData);
    XLSX.utils.book_append_sheet(workbook, worksheet, "Certificados");
    
    // Modificamos esta parte para usar writeFile en lugar de write con blob
    const timestamp2 = new Date().toISOString().split('T')[0];
    const excelFileName = `certificados_urls_${timestamp2}.xlsx`;
    
    // Usar writeFile para generar y descargar directamente
    XLSX.writeFile(workbook, excelFileName);
    
    // Enviar datos a WordPress
    try {
      console.log('Enviando datos a WordPress...');
  
  // Obtener el token JWT desde variables de entorno
  const jwtToken = import.meta.env.VITE_WP_JWT_TOKEN;
  
  if (!jwtToken) {
    console.error('Token JWT no encontrado en variables de entorno');
    throw new Error('Token JWT de WordPress no configurado en variables de entorno');
  }
  
  console.log('Usando autenticación JWT');
  // Enviar cada certificado a WordPress
  for (let i = 0; i < updatedExcelData.length; i++) {
    const item = updatedExcelData[i];
    
      // Generar un código aleatorio de 5 dígitos
  const randomCode = Math.floor(10000 + Math.random() * 90000);
  
  // Crear el título del post con el código aleatorio
  const postTitle = `${item.nombre} - ${item['rut sin']} - ${item.nombreCurso} #${randomCode}`;
    
    // Crear el objeto de datos para WordPress
    const postData = {
      title: postTitle,
      status: 'publish',
      content: `Certificado para ${item.nombre}`,
      // Formato para JetEngine con campos expuestos en la API REST
      meta: {
        rut_estudiante: item['rut sin'],
        clave_acceso: item.clave,
        curso_nombre: item.nombreCurso,
        pdf_url: item.url_pdf,
        nombre_alumno: item.nombre,
        ano: item.año || new Date().getFullYear().toString()
      }
    };
    
    console.log('Enviando datos a WordPress con formato JetEngine (API REST activada):', postData);
    
    // Corregido: Usar Bearer token en lugar de Basic auth
    const wpResponse = await fetch('https://certificados.checkmedicinemo.com/wp-json/wp/v2/certificados', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${jwtToken}`,
        'Accept': 'application/json'
      },
      body: JSON.stringify(postData)
    });
    
    // Mostrar información detallada sobre la respuesta para depuración
    console.log(`Respuesta de WordPress (status ${wpResponse.status}):`, wpResponse);
    
    if (!wpResponse.ok) {
      const errorText = await wpResponse.text();
      console.error(`Error al enviar certificado ${i+1} a WordPress:`, errorText);
      // Intentar analizar el error si es JSON
      try {
        const errorJson = JSON.parse(errorText);
        console.error('Detalles del error:', errorJson);
      } catch (e) {
        // No es JSON, ya mostramos el texto
      }
      continue;  // Continuar con el siguiente certificado
    }
        
        const wpResult = await wpResponse.json();
        console.log(`Certificado ${i+1} enviado a WordPress con ID:`, wpResult.id);
        
        // Actualizar progreso (50% para generación de PDFs + 50% para envío a WordPress)
        setProgress(Math.round(50 + ((i + 1) / totalItems) * 50));
      }
      
      console.log('Todos los certificados enviados a WordPress');
      alert('Certificados generados con éxito, Excel actualizado con URLs y datos enviados a WordPress');
    } catch (wpError) {
      console.error('Error al enviar datos a WordPress:', wpError);
      alert('Certificados generados con éxito y Excel actualizado con URLs, pero hubo un error al enviar a WordPress: ' + wpError.message);
    }
    
  } catch (error) {
    console.error('Error al generar certificados:', error);
    alert('Error al generar los certificados: ' + error.message);
  } finally {
    setIsGenerating(false);
  }
};
    return (
      <div className="min-h-screen bg-gray-50 py-8 px-4" style={{backgroundColor: '#f9fafb', minHeight: '100vh', padding: '2rem 1rem'}}>
        <div className="max-w-4xl mx-auto bg-white rounded-lg shadow-lg overflow-hidden" style={{maxWidth: '64rem', margin: '0 auto', backgroundColor: 'white', borderRadius: '0.5rem', boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)', overflow: 'hidden'}}>
          {/* Encabezado */}
          <div style={{background: 'linear-gradient(to right, #2563eb, #4f46e5)', padding: '1.5rem 2rem'}}>
            <h1 style={{fontSize: '1.875rem', fontWeight: 'bold', color: 'white', textAlign: 'center'}}>Generador de Certificados</h1>
            <p style={{color: '#bfdbfe', textAlign: 'center', marginTop: '0.5rem'}}>Check Medicine Mode On</p>
          </div>
          
          <div style={{padding: '2rem'}}>
            {/* Sección de autenticación */}
            <div style={{marginBottom: '2rem', display: 'flex', justifyContent: 'center'}}>
              {!isAuthenticated ? (
                <button
                  onClick={handleGoogleAuth}
                  style={{
                    display: 'flex', 
                    alignItems: 'center', 
                    backgroundColor: 'white', 
                    border: '1px solid #d1d5db', 
                    borderRadius: '0.5rem', 
                    padding: '0.75rem 1.5rem', 
                    color: '#374151', 
                    fontWeight: '500', 
                    boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
                    cursor: 'pointer'
                  }}
                >
                  <svg style={{width: '1.25rem', height: '1.25rem', marginRight: '0.5rem'}} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M21.8055 10.0415H21V10H12V14H17.6515C16.827 16.3285 14.6115 18 12 18C8.6865 18 6 15.3135 6 12C6 8.6865 8.6865 6 12 6C13.5295 6 14.921 6.577 15.9805 7.5195L18.809 4.691C17.023 3.0265 14.634 2 12 2C6.4775 2 2 6.4775 2 12C2 17.5225 6.4775 22 12 22C17.5225 22 22 17.5225 22 12C22 11.3295 21.931 10.675 21.8055 10.0415Z" fill="#FFC107"/>
                    <path d="M3.15295 7.3455L6.43845 9.755C7.32745 7.554 9.48045 6 12 6C13.5295 6 14.921 6.577 15.9805 7.5195L18.809 4.691C17.023 3.0265 14.634 2 12 2C8.15895 2 4.82795 4.1685 3.15295 7.3455Z" fill="#FF3D00"/>
                    <path d="M12 22C14.583 22 16.93 21.0115 18.7045 19.404L15.6095 16.785C14.5718 17.5742 13.3038 18.001 12 18C9.39903 18 7.19053 16.3415 6.35853 14.027L3.09753 16.5395C4.75253 19.778 8.11353 22 12 22Z" fill="#4CAF50"/>
                    <path d="M21.8055 10.0415H21V10H12V14H17.6515C17.2571 15.1082 16.5467 16.0766 15.608 16.7855L15.6095 16.7845L18.7045 19.4035C18.4855 19.6025 22 17 22 12C22 11.3295 21.931 10.675 21.8055 10.0415Z" fill="#1976D2"/>
                  </svg>
                  Conectar con Google Drive
                </button>
              ) : (
                <div style={{display: 'flex', flexDirection: 'column', alignItems: 'center'}}>
                  <div style={{display: 'flex', alignItems: 'center', marginBottom: '1rem'}}>
                    <div style={{padding: '0.5rem', backgroundColor: '#d1fae5', color: '#065f46', borderRadius: '0.5rem', display: 'flex', alignItems: 'center'}}>
                      <svg style={{width: '1.25rem', height: '1.25rem', marginRight: '0.5rem'}} fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd"></path>
                      </svg>
                      Conectado a Google Drive
                    </div>
                    <button
                      onClick={handleLogout}
                      style={{
                        marginLeft: '1rem', 
                        backgroundColor: '#ef4444', 
                        color: 'white', 
                        padding: '0.5rem 1rem', 
                        borderRadius: '0.5rem',
                        cursor: 'pointer'
                      }}
                    >
                      Cerrar Sesión
                    </button>
                  </div>
                </div>
              )}
            </div>
            
            {/* Sección de carga y generación */}
            <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', marginBottom: '2rem'}}>
              <div style={{backgroundColor: '#f9fafb', padding: '1.5rem', borderRadius: '0.5rem', border: '1px solid #e5e7eb'}}>
                <h2 style={{fontSize: '1.125rem', fontWeight: '500', color: '#111827', marginBottom: '1rem'}}>Cargar archivo Excel</h2>
                <label style={{
                  display: 'flex', 
                  flexDirection: 'column', 
                  alignItems: 'center', 
                  padding: '1rem', 
                  backgroundColor: 'white', 
                  color: '#3b82f6', 
                  borderRadius: '0.5rem', 
                  boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)', 
                  border: '1px solid #3b82f6',
                  cursor: 'pointer'
                }}>
                  <svg style={{width: '2rem', height: '2rem'}} fill="currentColor" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20">
                    <path d="M16.88 9.1A4 4 0 0 1 16 17H5a5 5 0 0 1-1-9.9V7a3 3 0 0 1 4.52-2.59A4.98 4.98 0 0 1 17 8c0 .38-.04.74-.12 1.1zM11 11h3l-4-4-4 4h3v3h2v-3z" />
                  </svg>
                  <span style={{marginTop: '0.5rem', fontSize: '1rem'}}>Seleccionar archivo</span>
                  <input
                    type="file"
                    accept=".xlsx,.xls,.csv"
                    onChange={handleFileUpload}
                    style={{display: 'none'}}
                  />
                </label>
                {excelData.length > 0 && (
                  <div style={{marginTop: '1rem', textAlign: 'center'}}>
                    <p style={{color: '#059669', fontWeight: '500'}}>
                      {excelData.length} registros cargados
                    </p>
                  </div>
                )}
              </div>
              
              <div style={{backgroundColor: '#f9fafb', padding: '1.5rem', borderRadius: '0.5rem', border: '1px solid #e5e7eb'}}>
                <h2 style={{fontSize: '1.125rem', fontWeight: '500', color: '#111827', marginBottom: '1rem'}}>Acciones</h2>
                <div style={{display: 'flex', flexDirection: 'column', gap: '1rem'}}>
                  <button
                    onClick={() => setShowPreview(!showPreview)}
                    style={{
                      backgroundColor: '#4f46e5', 
                      color: 'white', 
                      padding: '0.5rem 1rem', 
                      borderRadius: '0.5rem', 
                      display: 'flex', 
                      alignItems: 'center', 
                      justifyContent: 'center',
                      cursor: 'pointer'
                    }}
                  >
                    <svg style={{width: '1.25rem', height: '1.25rem', marginRight: '0.5rem'}} fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path>
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"></path>
                    </svg>
                    {showPreview ? 'Ocultar Vista Previa' : 'Mostrar Vista Previa'}
                  </button>
                  
                  {excelData.length > 0 && (
                    <button
                      onClick={generateCertificates}
                      disabled={isGenerating}
                      style={{
                        backgroundColor: '#059669', 
                        color: 'white', 
                        padding: '0.5rem 1rem', 
                        borderRadius: '0.5rem', 
                        display: 'flex', 
                        alignItems: 'center', 
                        justifyContent: 'center',
                        opacity: isGenerating ? '0.5' : '1',
                        cursor: isGenerating ? 'not-allowed' : 'pointer'
                      }}
                    >
                      {isGenerating ? (
                        <>
                          <svg style={{animation: 'spin 1s linear infinite', marginRight: '0.75rem', height: '1.25rem', width: '1.25rem'}} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                            <circle style={{opacity: '0.25'}} cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path style={{opacity: '0.75'}} fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                          </svg>
                          Generando...
                        </>
                      ) : (
                        <>
                          <svg style={{width: '1.25rem', height: '1.25rem', marginRight: '0.5rem'}} fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                          </svg>
                          Generar Certificados
                        </>
                      )}
                    </button>
                  )}
                </div>
              </div>
            </div>
            
            {/* Barra de progreso */}
            {isGenerating && (
              <div className="mb-8">
                <div className="flex justify-between mb-1">
                  <span className="text-base font-medium text-blue-700">Progreso</span>
                  <span className="text-sm font-medium text-blue-700">{progress}%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2.5">
                  <div className="bg-blue-600 h-2.5 rounded-full transition-all duration-300" style={{ width: `${progress}%` }}></div>
                </div>
              </div>
            )}
            
            {/* Vista previa */}
            {showPreview && (
              <div className="mt-8 border-t pt-6">
                <h2 className="text-xl font-semibold text-gray-800 mb-4">Vista Previa del Certificado</h2>
                <div className="h-[600px] border border-gray-300 rounded-lg overflow-hidden">
                  <PDFViewer width="100%" height="100%">
                    <Certificate data={{...sampleData, qrCodeUrl: 'https://via.placeholder.com/80'}} />
                  </PDFViewer>
                </div>
              </div>
            )}
          </div>
          
          {/* Footer */}
          <div className="bg-gray-50 px-4 py-3 sm:px-6 border-t border-gray-200">
            <p className="text-sm text-gray-500 text-center">
              © {new Date().getFullYear()} Check Medicine Mode On - Generador de Certificados
            </p>
          </div>
        </div>
      </div>
    );
};

export default CertificateGenerator;
