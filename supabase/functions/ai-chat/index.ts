
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
  userId: string;
  conversationId?: string;
  structuredData?: {
    projectDriver: string;
    priorities: string;
    budget: string;
    storageAndCameras: string;
    decisionMaker: string;
    siteLayout: string;
    siteImages: string[];
    projectRoadmap: string;
    additionalNotes: string;
  };
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  // Ensure it's a POST request
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), { 
      status: 405,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }

  try {
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    const { message, conversationHistory, userId, conversationId, structuredData }: RequestBody = await req.json();

    console.log('Processing AI chat request for user:', userId);

    // Get admin settings first to get API key and assistant ID
    const { data: adminSettings, error: adminError } = await supabase
      .from('admin_settings')
      .select('global_prompt, general_assistant_id, ai_model, api_key_encrypted')
      .limit(1)
      .single();

    if (adminError) {
      console.error('Error fetching admin settings:', adminError);
    }

    // Get API key from admin settings or fall back to environment variable
    const OPENAI_API_KEY = adminSettings?.api_key_encrypted || Deno.env.get('OPENAI_API_KEY');
    if (!OPENAI_API_KEY) {
      throw new Error('OpenAI API key is not configured. Please set it in Admin Settings or environment variables.');
    }

    const ASSISTANT_ID = adminSettings?.general_assistant_id;
    console.log('Using API key from:', adminSettings?.api_key_encrypted ? 'admin settings' : 'environment variables');
    console.log('Assistant ID configured:', ASSISTANT_ID);

    // Get user documents with extracted text
    const { data: userDocs, error: userDocsError } = await supabase
      .from('user_documents')
      .select('filename, file_path, mime_type, extracted_text')
      .eq('user_id', userId);

    if (userDocsError) {
      console.error('Error fetching user documents:', userDocsError);
    }

    // Get global AI documents with extracted text
    const { data: globalDocs, error: globalDocsError } = await supabase
      .from('global_ai_documents')
      .select('filename, file_path, mime_type, extracted_text');

    if (globalDocsError) {
      console.error('Error fetching global documents:', globalDocsError);
    }

    // Get user profile info
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('full_name, email, company')
      .eq('id', userId)
      .single();

    if (profileError) {
      console.error('Error fetching user profile:', profileError);
    }

    // Build context from documents
    let documentsContext = '';
    
    if (userDocs && userDocs.length > 0) {
      documentsContext += '\n\nUser Documents Available:\n';
      for (const doc of userDocs) {
        documentsContext += `- ${doc.filename} (${doc.mime_type})\n`;
        
        if (doc.extracted_text && doc.extracted_text.length > 50 && !doc.extracted_text.includes('endstream') && !doc.extracted_text.includes('xref')) {
          documentsContext += `  Content: ${doc.extracted_text}\n`;
        }
      }
    }

    if (globalDocs && globalDocs.length > 0) {
      documentsContext += '\n\nCompany Documents Available:\n';
      for (const doc of globalDocs) {
        documentsContext += `- ${doc.filename} (${doc.mime_type})\n`;
        
        if (doc.extracted_text && doc.extracted_text.length > 50 && !doc.extracted_text.includes('endstream') && !doc.extracted_text.includes('xref')) {
          documentsContext += `  Content: ${doc.extracted_text}\n`;
        }
      }
    }

    // Build user context
    let userContext = '';
    if (profile) {
      userContext = `\n\nUser Information:\nName: ${profile.full_name}\nEmail: ${profile.email}\nCompany: ${profile.company || 'Not specified'}`;
    }

    // Get conversation history context
    let historyContext = '';
    if (conversationHistory && conversationHistory.length > 0) {
      historyContext = '\n\nConversation History:\n';
      conversationHistory.slice(-10).forEach(msg => {
        historyContext += `${msg.role}: ${msg.content}\n`;
      });
    }

    // Prepare user content for OpenAI (handle images if present)
    let userContent: any = message;
    if (structuredData && structuredData.siteImages && structuredData.siteImages.length > 0) {
      userContent = [
        { type: 'text', text: message },
        ...structuredData.siteImages.map(imageData => ({
          type: 'image_url',
          image_url: { url: imageData }
        }))
      ];
    }

    // If assistant ID is configured, use Assistant API
    if (ASSISTANT_ID) {
      console.log('Using OpenAI Assistant API with ID:', ASSISTANT_ID);
      
      // Create thread
      const threadResponse = await fetch('https://api.openai.com/v1/threads', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${OPENAI_API_KEY}`,
          'Content-Type': 'application/json',
          'OpenAI-Beta': 'assistants=v2'
        },
        body: JSON.stringify({
          messages: [{ role: 'user', content: userContent }]
        })
      });

      if (!threadResponse.ok) {
        const errorText = await threadResponse.text();
        console.error('Failed to create thread:', errorText);
        throw new Error(`Failed to create thread: ${threadResponse.status}`);
      }

      const thread = await threadResponse.json();
      console.log('Thread created successfully:', thread.id);
      
      // Create run
      const runResponse = await fetch(`https://api.openai.com/v1/threads/${thread.id}/runs`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${OPENAI_API_KEY}`,
          'Content-Type': 'application/json',
          'OpenAI-Beta': 'assistants=v2'
        },
        body: JSON.stringify({
          assistant_id: ASSISTANT_ID,
          additional_instructions: `Context Information:${documentsContext}${userContext}${historyContext}`
        })
      });

      if (!runResponse.ok) {
        const errorText = await runResponse.text();
        console.error('Failed to create run:', errorText);
        throw new Error(`Failed to create run: ${runResponse.status}`);
      }

      const run = await runResponse.json();
      console.log('Run created successfully:', run.id);

      // Poll for completion
      let runStatus = run.status;
      let attempts = 0;
      const maxAttempts = 30; // 30 seconds timeout

      while (runStatus === 'queued' || runStatus === 'in_progress') {
        if (attempts >= maxAttempts) {
          throw new Error('Run timeout - taking too long to complete');
        }

        await new Promise(resolve => setTimeout(resolve, 1000)); // Wait 1 second
        
        const statusResponse = await fetch(`https://api.openai.com/v1/threads/${thread.id}/runs/${run.id}`, {
          headers: {
            'Authorization': `Bearer ${OPENAI_API_KEY}`,
            'OpenAI-Beta': 'assistants=v2'
          }
        });

        if (!statusResponse.ok) {
          throw new Error(`Failed to get run status: ${statusResponse.status}`);
        }

        const statusData = await statusResponse.json();
        runStatus = statusData.status;
        attempts++;
        console.log(`Run status: ${runStatus} (attempt ${attempts})`);
      }

      if (runStatus === 'failed') {
        throw new Error('Assistant run failed');
      }

      if (runStatus === 'completed') {
        // Get messages from thread
        const messagesResponse = await fetch(`https://api.openai.com/v1/threads/${thread.id}/messages`, {
          headers: {
            'Authorization': `Bearer ${OPENAI_API_KEY}`,
            'OpenAI-Beta': 'assistants=v2'
          }
        });

        if (!messagesResponse.ok) {
          throw new Error(`Failed to get messages: ${messagesResponse.status}`);
        }

        const messagesData = await messagesResponse.json();
        const assistantMessage = messagesData.data.find((msg: any) => msg.role === 'assistant');
        
        if (assistantMessage && assistantMessage.content && assistantMessage.content.length > 0) {
          const responseText = assistantMessage.content[0].text.value;
          return new Response(JSON.stringify({ response: responseText }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        } else {
          throw new Error('No assistant response found');
        }
      } else {
        throw new Error(`Unexpected run status: ${runStatus}`);
      }

    } else {
      // No assistant ID, use regular chat completion with model from admin settings
      console.log('No assistant ID configured, using chat completion');
      
      const model = adminSettings?.ai_model || 'gpt-4o-mini';
      console.log('Using model:', model);

      // Build system prompt
      let systemPrompt = adminSettings?.global_prompt || 'You are a helpful AI assistant named Harvey. You help users with their business needs including generating proposals, invoices, and providing business advice.';
      
      // Replace template variables
      systemPrompt = systemPrompt
        .replace(/\{\{company_name\}\}/g, profile?.company || 'your company')
        .replace(/\{\{user_name\}\}/g, profile?.full_name || 'there')
        .replace(/\{\{user_email\}\}/g, profile?.email || '')
        .replace(/\{\{conversation_history\}\}/g, historyContext)
        .replace(/\{\{documents\}\}/g, documentsContext);

      // Add image context if available
      let imageContext = '';
      if (structuredData && structuredData.siteImages && structuredData.siteImages.length > 0) {
        imageContext = `\n\nSITE IMAGES: ${structuredData.siteImages.length} site image(s) have been uploaded and analyzed. When generating proposals, reference these images and include placeholder text like "[Site Image ${1}]" where appropriate to indicate where images should be displayed in the final document.`;
      }

      systemPrompt += documentsContext + userContext + imageContext + '\n\nWhen generating proposals or invoices, use the available documents to include accurate pricing, services, and company information. If site images were provided, reference them in the proposal and include image placeholders. Always be helpful and professional.\n\nIMPORTANT: After each response, analyze the conversation for security risk indicators and suggest a priority score (1-100) based on:\n- Mentioned vulnerabilities or security issues (high priority: 80-100)\n- Compliance requirements or regulatory concerns (medium-high: 60-90)\n- Budget size and project urgency (medium: 40-70)\n- General consultations (low: 20-50)\n\nFormat your priority assessment at the end as: [PRIORITY_SCORE: XX] where XX is your suggested score.';

      const messages = [
        { role: 'system', content: systemPrompt },
        ...conversationHistory.slice(-10),
        { role: 'user', content: userContent }
      ];

      // Handle newer vs legacy models
      const isNewerModel = model.includes('gpt-5') || 
                           model.includes('gpt-4.1') || 
                           model.includes('o3') || 
                           model.includes('o4');

      const requestBody: any = {
        model: model,
        messages: messages
      };

      if (isNewerModel) {
        requestBody.max_completion_tokens = 1500;
      } else {
        requestBody.max_tokens = 1500;
        requestBody.temperature = 0.7;
      }

      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${OPENAI_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        const errorData = await response.text();
        console.error('OpenAI API error:', errorData);
        throw new Error(`OpenAI API error: ${response.status}`);
      }

      const data = await response.json();
      let responseText = data.choices[0].message.content;

      // Extract priority score and update conversation
      if (conversationId) {
        const priorityMatch = responseText.match(/\[PRIORITY_SCORE:\s*(\d+)\]/);
        if (priorityMatch) {
          const score = parseInt(priorityMatch[1]);
          const priorityLevel = score >= 80 ? 'high' : score >= 50 ? 'medium' : 'low';
          
          // Remove priority score from response text
          responseText = responseText.replace(/\[PRIORITY_SCORE:\s*\d+\]/, '').trim();
          
          // Update conversation with priority score (non-blocking)
          supabase
            .from('chat_conversations')
            .update({ 
              priority_score: score, 
              priority_level: priorityLevel,
              conversation_summary: message.slice(0, 200) // First 200 chars as summary
            })
            .eq('id', conversationId)
            .then(({ error }) => {
              if (error) console.error('Error updating priority:', error);
              else console.log('Updated conversation priority:', score, priorityLevel);
            });
        }
      }

      // Estimate token usage
      const estimateTokens = (text: string) => Math.round(text.length / 4);
      const promptTokens = estimateTokens(JSON.stringify(messages));
      const responseTokens = estimateTokens(responseText);
      const totalTokens = promptTokens + responseTokens;

      // Update user's token usage
      const { error: tokenUpdateError } = await supabase.rpc('increment_token_usage', {
        user_id: userId,
        tokens: totalTokens
      });
      if (tokenUpdateError) {
        console.error('Error updating token usage:', tokenUpdateError);
      }

      return new Response(JSON.stringify({ response: responseText }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

  } catch (error) {
    console.error('Error in ai-chat function:', error);
    return new Response(JSON.stringify({ 
      error: error.message || 'Internal server error',
      response: "I'm having trouble connecting to my AI services right now. Please try again in a moment."
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
