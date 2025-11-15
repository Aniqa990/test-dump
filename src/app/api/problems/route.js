import { NextResponse } from 'next/server';

export async function GET() {
  try {
    // Forward the request to the Python backend with timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 second timeout
    
    const res = await fetch('http://127.0.0.1:8001/problems', {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
      signal: controller.signal,
    });
    
    clearTimeout(timeoutId);

    // Check if the backend responded successfully
    if (!res.ok) {
      const errorData = await res.json().catch(() => ({ error: 'Backend returned a non-JSON error' }));
      console.error("Backend error:", errorData);
      return NextResponse.json({ error: errorData.detail || 'Backend error' }, { status: res.status });
    }

    // If successful, parse the JSON and forward it to the client
    const data = await res.json();
    return NextResponse.json(data);

  } catch (error) {
    console.error("API Route error:", error);
    if (error.name === 'AbortError') {
      return NextResponse.json({ error: 'Request timeout. Is the Python backend running on port 8001?' }, { status: 504 });
    }
    return NextResponse.json({ error: 'Failed to connect to the backend service. Is the Python server running on port 8001?' }, { status: 500 });
  }
}

