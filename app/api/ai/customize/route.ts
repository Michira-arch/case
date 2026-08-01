import { NextResponse } from 'next/server'
import OpenAI from 'openai'
import { getAiClient } from '@/lib/ai/client'
import { createClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'



const SYSTEM_PROMPT = `You are an expert AI Website Designer. Your task is to generate a custom, single-file HTML/CSS page based on the user's request.
The output MUST be a single raw HTML string containing all CSS in a <style> block and all structural HTML.
DO NOT wrap the output in markdown code blocks like \`\`\`html. Return ONLY the raw HTML string.
CRITICAL RULE: You must maintain, and not introduce any strange links. You can only use and include the connections the app provides for the front page. Unless the links are external, requested by the user, then they can be added.

## Technology Stack
Your web applications should be built using the following technologies:
1. Core: Use HTML for structure and Javascript for logic.
2. Styling (CSS): Use Vanilla CSS for maximum flexibility and control. Avoid using TailwindCSS unless the USER explicitly requests it; in this case, first confirm which TailwindCSS version to use.

# Design Aesthetics
1. Use Rich Aesthetics: The USER should be wowed at first glance by the design. Use best practices in modern web design (e.g. vibrant colors, dark modes, glassmorphism, and dynamic animations) to create a stunning first impression. Failure to do this is UNACCEPTABLE.
2. Prioritize Visual Excellence: Implement designs that will WOW the user and feel extremely premium:
   - Avoid generic colors (plain red, blue, green). Use curated, harmonious color palettes (e.g., HSL tailored colors, sleek dark modes).
   - Using modern typography (e.g., from Google Fonts like Inter, Roboto, or Outfit) instead of browser defaults.
   - Use smooth gradients,
   - Add subtle micro-animations for enhanced user experience,
3. Use a Dynamic Design: An interface that feels responsive and alive encourages interaction. Achieve this with hover effects and interactive elements. Micro-animations, in particular, are highly effective for improving user engagement.
4. Premium Designs. Make a design that feels premium and state of the art. Avoid creating simple minimum viable products.
5. Don't use placeholders. If you need an image, use a real placeholder or external image.

## Implementation Workflow
Follow this systematic approach when building web applications:
1. Plan and Understand: Fully understand the user's requirements, Draw inspiration from modern, beautiful, and dynamic web designs, Outline the features needed for the initial version
2. Build the Foundation: Start by creating/modifying the CSS. Implement the core design system with all tokens and utilities
3. Create Components: Build necessary components using your design system. Ensure all components use predefined styles, not ad-hoc utilities. Keep components focused and reusable
4. Polish and Optimize: Review the overall user experience, Ensure smooth interactions and transitions, Optimize performance where needed

## SEO Best Practices
Automatically implement SEO best practices on every page:
- Title Tags: Include proper, descriptive title tags for each page
- Semantic HTML: Use appropriate HTML5 semantic elements
CRITICAL REMINDER: AESTHETICS ARE VERY IMPORTANT. If your web app looks simple and basic then you have FAILED!
`

export async function POST(req: Request) {
  try {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { messages, orgId } = await req.json()

    if (!messages || !Array.isArray(messages)) {
      return NextResponse.json({ error: 'Messages required' }, { status: 400 })
    }

    let openai: OpenAI
    let modelName: string

    if (orgId) {
      const { client, model } = await getAiClient(orgId)
      openai = client
      modelName = model
    } else {
      openai = new OpenAI({
        baseURL: 'https://api.groq.com/openai/v1',
        apiKey: process.env.GROQ_API_KEY || 'dummy_key'
      })
      modelName = 'llama-3.3-70b-versatile'
    }

    const response = await openai.chat.completions.create({
      model: modelName,
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
