import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.53.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface RequestBody {
  message: string;
  conversationHistory: Array<{
    role: string;
    content: string;
  }>;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY');
    if (!OPENAI_API_KEY) {
      throw new Error('OPENAI_API_KEY is not set');
    }

    const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    const { message, conversationHistory }: RequestBody = await req.json();

    console.log('Processing platform help request');

    // Get admin settings for platform assistant configuration
    const { data: adminSettings, error: adminError } = await supabase
      .from('admin_settings')
      .select('platform_prompt, platform_assistant_id, ai_model')
      .limit(1)
      .single();

    if (adminError) {
      console.error('Error fetching admin settings:', adminError);
    }

    // Default platform help prompt
    const defaultPrompt = `You are a helpful platform assistant for Design Rite AI Platform. Help users navigate and understand the platform features:

**Navigation Guide:**
- **Chat**: Main AI chat interface for business assistance and document analysis
- **Documents**: Upload and manage business documents (PDFs, contracts, etc.)
- **Business Tools**: Access proposal generators and business calculators
- **Profile**: Manage your account settings and company information
- **Subscription**: View and manage your subscription tier and billing
- **Analytics**: View usage statistics and platform analytics (if available)
- **Admin** (admins only): Platform configuration and user management

**Key Features:**
- Upload business documents for AI analysis and reference
- Generate professional proposals using AI
- Chat with AI about your business needs with document context
- Different subscription tiers offer varying document limits
- White-label options available for enterprise users

**Getting Started:**
1. Complete your profile with company information
2. Upload relevant business documents
3. Start chatting with the AI for business assistance
4. Use Business Tools for proposal generation

Be concise, helpful, and guide users to the appropriate platform sections based on their needs.`;

    const systemPrompt = adminSettings?.platform_prompt || defaultPrompt;

    const messages = [
      { role: 'system', content: systemPrompt },
      ...conversationHistory.slice(-10), // Include recent conversation history
      { role: 'user', content: message }
    ];

    console.log('Calling OpenAI API for platform help');

    // Use assistant if configured, otherwise use regular chat completion
    let response;
    if (adminSettings?.platform_assistant_id) {
      // Use OpenAI Assistants API - create thread and run
      const threadResponse = await fetch('https://api.openai.com/v1/threads', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${OPENAI_API_KEY}`,
          'Content-Type': 'application/json',
          'OpenAI-Beta': 'assistants=v2'
        },
        body: JSON.stringify({
          messages: [{ role: 'user', content: message }]
        })
      });

      if (!threadResponse.ok) {
        throw new Error('Failed to create thread');
      }

      const thread = await threadResponse.json();
      
      // Create run with streaming
      response = await fetch(`https://api.openai.com/v1/threads/${thread.id}/runs`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${OPENAI_API_KEY}`,
          'Content-Type': 'application/json',
          'OpenAI-Beta': 'assistants=v2'
        },
        body: JSON.stringify({
          assistant_id: adminSettings.platform_assistant_id,
          stream: true
        })
      });
    } else {
      // Use regular chat completion
      const model = adminSettings?.ai_model || 'gpt-4o-mini';
      response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${OPENAI_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: model,
          messages: messages,
          temperature: 0.3,
          max_tokens: 800,
          stream: true,
        }),
      });
    }

    if (!response.ok) {
      const errorData = await response.text();
      console.error('OpenAI API error:', errorData);
      throw new Error(`OpenAI API error: ${response.status}`);
    }

    // Handle streaming response
    const encoder = new TextEncoder();
    const decoder = new TextDecoder();

    const stream = new ReadableStream({
      async start(controller) {
        const reader = response.body?.getReader();
        if (!reader) {
          controller.close();
          return;
        }

        let buffer = '';
        
        try {
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            buffer += decoder.decode(value, { stream: true });
            const lines = buffer.split('\n');
            buffer = lines.pop() || '';

            for (const line of lines) {
              if (line.startsWith('data: ')) {
                const data = line.slice(6);
                if (data === '[DONE]') {
                  controller.close();
                  return;
                }

                try {
                  const parsed = JSON.parse(data);
                  const content = parsed.choices?.[0]?.delta?.content;
                  if (content) {
                    controller.enqueue(encoder.encode(`data: ${JSON.stringify({ content })}\n\n`));
                  }
                } catch (e) {
                  // Skip invalid JSON
                }
              }
            }
          }
        } catch (error) {
          console.error('Streaming error:', error);
        } finally {
          controller.close();
        }
      }
    });

    return new Response(stream, {
      headers: {
        ...corsHeaders,
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    });

  } catch (error) {
    console.error('Error in platform-help function:', error);
    return new Response(JSON.stringify({ 
      error: error.message || 'Internal server error',
      response: "I'm having trouble connecting to my services right now. Please try again in a moment."
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});