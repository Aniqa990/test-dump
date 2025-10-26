import { NextResponse } from 'next/server';

export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);
    const team_id = searchParams.get('team_id');
    
    if (!team_id) {
      return NextResponse.json({ error: 'team_id is required' }, { status: 400 });
    }

    // Forward the request to the Python backend
    const res = await fetch(`http://127.0.0.1:8001/submissions?team_id=${team_id}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!res.ok) {
      const errorData = await res.json().catch(() => ({ error: 'Backend returned a non-JSON error' }));
      console.error("Backend error:", errorData);
      return NextResponse.json({ error: errorData.detail || 'Backend error' }, { status: res.status });
    }

    const data = await res.json();
    return NextResponse.json(data);

  } catch (error) {
    console.error("API Route error:", error);
    return NextResponse.json({ error: 'Failed to connect to the backend service.' }, { status: 500 });
  }
}

