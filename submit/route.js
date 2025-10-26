import { NextResponse } from 'next/server';

export async function POST(req) {
  try {
    const { problem_id, team_id, code, language } = await req.json();

    // Forward the request to the Python backend
    const res = await fetch('http://127.0.0.1:8000/submit', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        problem_id,
        team_id,
        code,
        language,
      }),
    });

    // Check if the backend responded successfully
    if (!res.ok) {
      // If the backend returned an error, try to parse it and forward it
      const errorData = await res.json().catch(() => ({ error: 'Backend returned a non-JSON error' }));
      console.error("Backend error:", errorData);
      return NextResponse.json({ error: errorData.detail || 'Backend error' }, { status: res.status });
    }

    // If successful, parse the JSON and forward it to the client
    const data = await res.json();
    return NextResponse.json(data);

  } catch (error) {
    // This block will catch network errors (e.g., if the backend is not running)
    console.error("API Route error:", error);
    return NextResponse.json({ error: 'Failed to connect to the backend service. Is the Python server running?' }, { status: 500 });
  }
}
