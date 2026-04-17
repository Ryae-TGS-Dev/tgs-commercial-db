import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  try {
    const { text } = await req.json();

    if (!text) {
      return NextResponse.json({ error: 'No text provided' }, { status: 400 });
    }

    // This uses an unofficial free Google Translate endpoint
    // It is zero-cost and works well for small maintenance notes
    const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=auto&tl=es&dt=t&q=${encodeURIComponent(text)}`;

    const response = await fetch(url);
    const data = await response.json();

    if (data && data[0]) {
      // Google returns a nested array of translations
      const translation = data[0].map((s: any) => s[0]).join('');
      return NextResponse.json({ translation });
    }

    return NextResponse.json({ error: 'Translation service failed' }, { status: 500 });
  } catch (error) {
    console.error('Free translation error:', error);
    return NextResponse.json({ error: 'Translation failed' }, { status: 500 });
  }
}
