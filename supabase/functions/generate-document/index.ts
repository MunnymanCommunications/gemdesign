import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    )

    const { document_type, assessment_data, user_id, conversation_id } = await req.json()

    console.log('Generate Document - Input:', { document_type, user_id, hasAssessment: !!assessment_data })

    if (!user_id) {
      throw new Error('User ID is required')
    }

    // Fetch user profile for company information
    const { data: profile, error: profileError } = await supabaseClient
      .from('profiles')
      .select('company, full_name, logo_url')
      .eq('id', user_id)
      .single()

    if (profileError) {
      console.error('Generate Document - Profile fetch error:', profileError)
    }

    const companyName = profile?.company || 'Your Company'
    const contactName = profile?.full_name || 'Contact Name'
    const logoUrl = profile?.logo_url || ''

    // Prepare prompt for document generation
    let prompt = ''
    if (document_type === 'security_assessment') {
      prompt = `Generate a professional security assessment report based on the following assessment data. Use the company name "${companyName}" throughout the document. Structure it with sections: Executive Summary, Assessment Findings, Recommendations, Implementation Plan, and Pricing.

Assessment Data:
${JSON.stringify(assessment_data, null, 2)}

Key Requirements:
- Replace any placeholders like {{company_name}} with "${companyName}"
- Make recommendations specific to the provided data (budget, priorities, site layout, etc.)
- Include realistic pricing tiers based on the assessment
- Format as clean Markdown that can be converted to PDF
- Keep it professional and actionable

Company Information:
- Company: ${companyName}
- Contact: ${contactName}
${logoUrl ? `- Logo URL: ${logoUrl}` : ''}

Output only the Markdown content, no additional explanations.`
    } else {
      throw new Error(`Unsupported document type: ${document_type}`)
    }

    // Call Gemini API (assuming GEMINI_API_KEY is set)
    const GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent?key=' + Deno.env.get('GEMINI_API_KEY')
    
    const geminiResponse = await fetch(GEMINI_API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: 0.7,
          topK: 40,
          topP: 0.95,
          maxOutputTokens: 4096,
        },
      }),
    })

    if (!geminiResponse.ok) {
      const errorText = await geminiResponse.text()
      console.error('Generate Document - Gemini API error:', geminiResponse.status, errorText)
      throw new Error(`AI generation failed: ${geminiResponse.status}`)
    }

    const geminiData = await geminiResponse.json()
    let generatedContent = geminiData.candidates?.[0]?.content?.parts?.[0]?.text || 'Failed to generate content'

    // Post-process to replace any remaining placeholders
    generatedContent = generatedContent.replace(/\{\{company_name\}\}/g, companyName)
    generatedContent = generatedContent.replace(/\{\{contact_name\}\}/g, contactName)

    // Save the generated document to Supabase (assuming a 'documents' table exists)
    const { data: savedDoc, error: saveError } = await supabaseClient
      .from('documents')
      .insert({
        user_id,
        conversation_id,
        type: document_type,
        title: `${companyName} - ${document_type.replace('_', ' ').toUpperCase()}`,
        content: generatedContent,
        metadata: {
          assessment_data: assessment_data,
          company_name: companyName,
          generated_at: new Date().toISOString()
        }
      })
      .select()
      .single()

    if (saveError) {
      console.error('Generate Document - Save error:', saveError)
      // Don't fail the whole request if saving fails, just log
    }

    console.log('Generate Document - Success, content length:', generatedContent.length)

    return new Response(
      JSON.stringify({ 
        success: true, 
        content: generatedContent,
        document_id: savedDoc?.id || null 
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      },
    )

  } catch (error) {
    console.error('Generate Document - Full error:', error)
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message || 'Internal server error' 
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500 
      },
    )
  }
})