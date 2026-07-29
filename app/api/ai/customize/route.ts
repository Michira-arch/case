import { NextResponse } from 'next/server'
import OpenAI from 'openai'

export const dynamic = 'force-dynamic'



const SYSTEM_PROMPT = `You are an expert AI Website Designer. Your task is to generate a custom, single-file HTML/CSS page based on the user's request.
Follow these frontend-design guidelines:
- Ensure unique, non-generic, opinionated designs. Use modern typography, spacing, and CSS techniques (Grid, Flexbox).
- Make it responsive.
- The output MUST be a single raw HTML string containing all CSS in a <style> block and all structural HTML.
- DO NOT wrap the output in markdown code blocks like \`\`\`html. Return ONLY the raw HTML string.
- CRITICAL RULE: You must maintain, and not introduce any strange links. You can only use and include the connections the app provides for the front page. Unless the links are external, requested by the user, then they can be added.
`

export async function POST(req: Request) {
  try {
    const { messages } = await req.json()

    if (!messages || !Array.isArray(messages)) {
      return NextResponse.json({ error: 'Messages required' }, { status: 400 })
    }

    const openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY || 'dummy_key_to_prevent_crash'
    })

    const response = await openai.chat.completions.create({
      model: 'gpt-4o', // Defaulting to robust model
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        ...messages
      ],
      temperature: 0.7
    })

    let html = response.choices[0].message.content || ''
    
    // Clean up if the model wrapped output in markdown
    html = html.trim()
    if (html.startsWith('```html')) {
      html = html.substring(7)
    } else if (html.startsWith('```')) {
      html = html.substring(3)
    }
    if (html.endsWith('```')) {
      html = html.substring(0, html.length - 3)
    }

    // ENFORCE server-side character limit: 20,000 chars
    if (html.length > 20000) {
      return NextResponse.json({ error: 'Generated design exceeds the 20,000 character limit.' }, { status: 400 })
    }

    return NextResponse.json({ html })
  } catch (error: any) {
    console.error('AI Customization Error:', error)
    return NextResponse.json({ error: error.message || 'Failed to generate layout' }, { status: 500 })
  }
}
