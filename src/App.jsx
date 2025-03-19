import React, { useEffect, useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import CertificateGenerator from './components/CertificateGenerator';
import OAuth2Callback from './components/OAuth2Callback';

function App() {
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Simple check to ensure components are loading
    console.log("App component mounted");
    setLoading(false);
  }, []);

  if (loading) {
    return <div>Cargando aplicación...</div>;
  }

  return (
    <Router>
      <Routes>
        <Route path="/" element={<CertificateGenerator />} />
        <Route path="/oauth2callback" element={<OAuth2Callback />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Router>
  );
}

export default App;