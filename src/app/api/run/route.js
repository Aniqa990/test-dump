import { NextResponse } from 'next/server';

export async function POST(req) {
  try {
    const { language, code, stdin } = await req.json();

    if (!language || !code) {
      return NextResponse.json({ error: 'Language and code are required' }, { status: 400 });
    }

    // Forward the request to the Python backend piston execution
    const res = await fetch('http://127.0.0.1:8001/run', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        language,
        code,
        stdin: stdin || '',
      }),
    });

    if (!res.ok) {
      const errorData = await res.json().catch(() => ({ error: 'Backend returned a non-JSON error' }));
      console.error("Backend error:", errorData);
      return NextResponse.json({ error: errorData.detail || 'Failed to execute code' }, { status: res.status });
    }

    const data = await res.json();
    return NextResponse.json(data);

  } catch (error) {
    console.error("API Route error:", error);
    return NextResponse.json({ error: 'Failed to connect to the backend service. Is the Python server running?' }, { status: 500 });
  }
}

