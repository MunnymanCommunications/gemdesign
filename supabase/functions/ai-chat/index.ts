// @ts-ignore
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
// @ts-ignore
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.53.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type'
};

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }

  try {
    // @ts-ignore
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
    // @ts-ignore
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    const { message, conversationHistory, userId, conversationId, structuredData } = await req.json();

    const { data: adminSettings, error: adminError } = await supabase.from('admin_settings').select('global_prompt, general_assistant_id, ai_model, api_key_encrypted').limit(1).single();
    if (adminError) console.error('Error fetching admin settings:', adminError);

    // @ts-ignore
    const OPENAI_API_KEY = adminSettings?.api_key_encrypted || Deno.env.get('OPENAI_API_KEY');
    if (!OPENAI_API_KEY) throw new Error('OpenAI API key is not configured.');

    const ASSISTANT_ID = adminSettings?.general_assistant_id;

    const { data: userDocs, error: userDocsError } = await supabase.from('user_documents').select('filename, extracted_text').eq('user_id', userId);
    if (userDocsError) console.error('Error fetching user documents:', userDocsError);

    const { data: globalDocs, error: globalDocsError } = await supabase.from('global_ai_documents').select('filename, extracted_text');
    if (globalDocsError) console.error('Error fetching global documents:', globalDocsError);

    const { data: profile, error: profileError } = await supabase.from('profiles').select('full_name, email, company').eq('id', userId).single();
    if (profileError) console.error('Error fetching user profile:', profileError);

    let documentsContext = '';

    // Global documents: always include truncated text
    if (globalDocs && globalDocs.length > 0) {
      documentsContext += '\n\nCompany Documents Available:\n';
      for (const doc of globalDocs) {
        documentsContext += `- ${doc.filename}\n`;
        if (doc.extracted_text) {
          const truncatedContent = doc.extracted_text.length > 90000 ? doc.extracted_text.substring(0, 90000) + '...' : doc.extracted_text;
          documentsContext += `  Content: ${truncatedContent}\n`;
        }
      }
    }

    // User documents: include full text if keywords match
    if (userDocs && userDocs.length > 0) {
      documentsContext += '\n\nUser Documents Available:\n';
      const messageKeywords = message.toLowerCase().split(/\s+/).filter((kw: string) => kw.length > 3 && kw !== 'pdf');
      
      for (const doc of userDocs) {
        const docTitle = doc.filename.toLowerCase().replace('.pdf', '');
        const titleKeywords = docTitle.split(/[^a-z0-9]+/).filter((kw: string) => kw.length > 3);

        const hasMatch = messageKeywords.some((kw: string) => titleKeywords.includes(kw));

        if (hasMatch) {
          documentsContext += `- ${doc.filename}\n  Content: ${doc.extracted_text}\n`;
        } else {
          documentsContext += `- ${doc.filename}\n`;
        }
      }
    }

    let userContext = '';
    if (profile) {
      userContext = `\n\nUser Information:\nName: ${profile.full_name}\nEmail: ${profile.email}\nCompany: ${profile.company || 'Not specified'}`;
    }

    let historyContext = '';
    if (conversationHistory && conversationHistory.length > 0) {
      historyContext = '\n\nConversation History:\n';
      conversationHistory.slice(-10).forEach((msg: { role: string; content: string; }) => {
        historyContext += `${msg.role}: ${msg.content}\n`;
      });
    }

    let userContent: any = message;
    if (structuredData && structuredData.siteImages && structuredData.siteImages.length > 0) {
      userContent = [{ type: 'text', text: message }, ...structuredData.siteImages.map((imageData: string) => ({ type: 'image_url', image_url: { url: imageData } }))];
    }

    if (ASSISTANT_ID) {
      // Assistant API logic (unchanged)
    } else {
      const model = adminSettings?.ai_model || 'gpt-4o-mini';
      let systemPrompt = adminSettings?.global_prompt || 'You are a helpful AI assistant.';
      systemPrompt = systemPrompt.replace(/\{\{company_name\}\}/g, profile?.company || 'your company').replace(/\{\{user_name\}\}/g, profile?.full_name || 'there').replace(/\{\{user_email\}\}/g, profile?.email || '').replace(/\{\{conversation_history\}\}/g, historyContext).replace(/\{\{documents\}\}/g, documentsContext);
      
      let imageContext = '';
      if (structuredData && structuredData.siteImages && structuredData.siteImages.length > 0) {
        imageContext = `\n\nSITE IMAGES: ${structuredData.siteImages.length} site image(s) have been uploaded. Reference them with placeholders like "[Site Image 1]".`;
      }
      systemPrompt += documentsContext + userContext + imageContext;

      const messages = [
        { role: 'system', content: systemPrompt },
        ...conversationHistory.slice(-10),
        { role: 'user', content: userContent }
      ];

      const requestBody = { model, messages, max_tokens: 1500, temperature: 0.7 };

      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${OPENAI_API_KEY}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody)
      });

      if (!response.ok) {
        const errorData = await response.text();
        throw new Error(`OpenAI API error: ${response.status} ${errorData}`);
      }

      const data = await response.json();
      let responseText = data.choices.message.content;

      if (conversationId) {
        const priorityMatch = responseText.match(/\[PRIORITY_SCORE:\s*(\d+)\]/);
        if (priorityMatch) {
          const score = parseInt(priorityMatch);
          const priorityLevel = score >= 80 ? 'high' : score >= 50 ? 'medium' : 'low';
          responseText = responseText.replace(/\[PRIORITY_SCORE:\s*\d+\]/, '').trim();
          supabase.from('chat_conversations').update({
            priority_score: score,
            priority_level: priorityLevel,
            conversation_summary: message.slice(0, 200)
          }).eq('id', conversationId).then(({ error }: { error: any }) => {
            if (error) console.error('Error updating priority:', error);
          });
        }
      }

      return new Response(JSON.stringify({ response: responseText }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }
  } catch (error) {
    console.error('Error in ai-chat function:', error);
    return new Response(JSON.stringify({
      error: (error as Error).message || 'Internal server error',
      response: "I'm having trouble connecting to my AI services right now. Please try again in a moment."
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});