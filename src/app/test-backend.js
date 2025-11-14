"use client"

import { useEffect, useState } from 'react';

export default function TestBackend() {
  const [status, setStatus] = useState('Testing...');
  const [data, setData] = useState(null);

  useEffect(() => {
    const testConnection = async () => {
      try {
        console.log('Testing connection to backend...');
        const res = await fetch('http://127.0.0.1:8001/ping');
        const result = await res.json();
        setStatus('✅ Connected!');
        setData(result);
      } catch (error) {
        setStatus('❌ Connection failed');
        setData({ error: error.message });
      }
    };

    testConnection();
  }, []);

  return (
    <div style={{ padding: '20px' }}>
      <h1>Backend Connection Test</h1>
      <p>Status: {status}</p>
      <pre>{JSON.stringify(data, null, 2)}</pre>
    </div>
  );
}

