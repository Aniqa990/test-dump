import { NextResponse } from 'next/server';

export async function POST(req) {
  try {
    const { team_name, password } = await req.json();

    if (!team_name || !password) {
      return NextResponse.json({ error: 'Team name and password are required' }, { status: 400 });
    }

    // Forward the request to the Python backend
    const res = await fetch('http://127.0.0.1:8001/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        team_name,
        password
      }),
    });

    // Check if the backend responded successfully
    if (!res.ok) {
      const errorData = await res.json().catch(() => ({ error: 'Backend returned a non-JSON error' }));
      console.error("Backend error:", errorData);
      return NextResponse.json({ error: errorData.detail || 'Invalid credentials' }, { status: res.status });
    }

    // If successful, parse the JSON and forward it to the client
    const data = await res.json();
    return NextResponse.json(data);

  } catch (error) {
    console.error("API Route error:", error);
    return NextResponse.json({ error: 'Failed to connect to the backend service. Is the Python server running?' }, { status: 500 });
  }
}

