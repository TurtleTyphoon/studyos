// Supabase Edge Function: generate quiz questions from note content using Claude
// Deploy with: supabase functions deploy generate-quiz
// Set secret: supabase secrets set ANTHROPIC_API_KEY=sk-ant-...

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { content, title, courseCode, numQuestions = 5 } = await req.json()

    if (!content || content.trim().length < 50) {
      return new Response(
        JSON.stringify({ error: 'Note content too short to generate questions' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const apiKey = Deno.env.get('ANTHROPIC_API_KEY')
    if (!apiKey) {
      return new Response(
        JSON.stringify({ error: 'Anthropic API key not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const prompt = `You are a study quiz generator. Given the following study notes, generate exactly ${numQuestions} multiple-choice questions to test the student's understanding.

Note title: ${title}
Course: ${courseCode || 'General'}

Note content:
${content}

Generate questions in this exact JSON format (no other text):
{
  "questions": [
    {
      "q": "Question text here?",
      "opts": ["Option A", "Option B", "Option C", "Option D"],
      "correct": 0,
      "explanation": "Brief explanation of the correct answer.",
      "concept": "Main concept tested"
    }
  ]
}

Rules:
- Questions should test understanding, not just recall
- Include a mix of difficulty levels
- Each question must have exactly 4 options
- "correct" is the 0-based index of the correct option
- Keep explanations concise (1-2 sentences)
- The "concept" should be a short tag (1-3 words)`

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 2048,
        messages: [{ role: 'user', content: prompt }],
      }),
    })

    if (!response.ok) {
      const err = await response.text()
      return new Response(
        JSON.stringify({ error: `Claude API error: ${err}` }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const data = await response.json()
    const text = data.content[0].text

    const jsonMatch = text.match(/\{[\s\S]*\}/)
    if (!jsonMatch) {
      return new Response(
        JSON.stringify({ error: 'Failed to parse quiz response' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const quiz = JSON.parse(jsonMatch[0])

    return new Response(
      JSON.stringify(quiz),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (err) {
    return new Response(
      JSON.stringify({ error: err.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
