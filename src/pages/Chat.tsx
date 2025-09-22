import { useState, useRef, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import Layout from '@/components/layout/Layout';
import SEO from '@/components/seo/SEO';
import QuickActions from '@/components/chat/QuickActions';
import ConversationList from '@/components/chat/ConversationList';
import MessageFormatter from '@/components/chat/MessageFormatter';
import DocumentEditor from '@/components/documents/DocumentEditor';
import AssessmentForm from '@/components/chat/AssessmentForm';
import CompanyInfoForm, { CompanyInfoData } from '@/components/chat/CompanyInfoForm';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { Send, Bot, User, Plus, FileText, MessageSquare, ClipboardList } from 'lucide-react';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  created_at: string;
}

interface Conversation {
  id: string;
  title: string;
  created_at: string;
  company_name?: string;
  assessment_type?: string;
  priority_score?: number;
  priority_level?: 'low' | 'medium' | 'high';
  conversation_summary?: string;
  assessment_data?: any;
}

interface AssessmentData {
  step1: string;
  step2: string;
  step3: string;
  step4: string;
  step5: string;
  step6: string;
  step6Images: File[];
  step7: string;
  additionalNotes: string;
}

const Chat = () => {
  const { user } = useAuth();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [currentConversation, setCurrentConversation] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [activeAction, setActiveAction] = useState<string | null>(null);
  const [showDocumentEditor, setShowDocumentEditor] = useState(false);
  const [generatedContent, setGeneratedContent] = useState('');
  const [streamingMessage, setStreamingMessage] = useState('');
  const [isAssessmentMode, setIsAssessmentMode] = useState(false);
  const [lastAssessmentImages, setLastAssessmentImages] = useState<string[]>([]);
  const [showCompanyForm, setShowCompanyForm] = useState(false);
  const [documentType, setDocumentType] = useState('Proposal');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (user) {
      fetchConversations();
    }
  }, [user]);

  useEffect(() => {
    if (currentConversation) {
      fetchMessages(currentConversation);
    }
  }, [currentConversation]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const fetchConversations = async () => {
    try {
      const { data, error } = await supabase
        .from('chat_conversations')
        .select('*')
        .eq('user_id', user?.id)
        .order('priority_score', { ascending: false })
        .order('updated_at', { ascending: false });

      if (error) throw error;
      // Type cast the priority_level to match our interface
      const conversations = (data || []).map(conv => ({
        ...conv,
        priority_level: conv.priority_level as 'low' | 'medium' | 'high'
      }));
      setConversations(conversations);
    } catch (error) {
      console.error('Error fetching conversations:', error);
      toast.error('Failed to load conversations');
    }
  };

  const fetchMessages = async (conversationId: string) => {
    try {
      const { data, error } = await supabase
        .from('chat_messages')
        .select('*')
        .eq('conversation_id', conversationId)
        .order('created_at', { ascending: true });

      if (error) throw error;
      setMessages((data || []).map(msg => ({
        id: msg.id,
        role: msg.role as 'user' | 'assistant',
        content: msg.content,
        created_at: msg.created_at
      })));
    } catch (error) {
      console.error('Error fetching messages:', error);
      toast.error('Failed to load messages');
    }
  };

  const createNewConversation = async (companyData?: CompanyInfoData): Promise<string | null> => {
    try {
      const title = companyData 
        ? `${companyData.companyName} - ${companyData.assessmentType.charAt(0).toUpperCase() + companyData.assessmentType.slice(1)} Assessment`
        : 'New Conversation';

      const { data, error } = await supabase
        .from('chat_conversations')
        .insert({
          user_id: user?.id,
          title,
          company_name: companyData?.companyName,
          assessment_type: companyData?.assessmentType || 'general',
          priority_score: 50,
          priority_level: 'medium',
          assessment_data: companyData ? {
            industry: companyData.industry,
            companySize: companyData.companySize,
            contactPerson: companyData.contactPerson
          } : {}
        })
        .select()
        .single();

      if (error) throw error;
      const conversation = {
        ...data,
        priority_level: data.priority_level as 'low' | 'medium' | 'high'
      };
      setCurrentConversation(conversation.id);
      setConversations(prev => [conversation, ...prev]);
      setMessages([]);
      return conversation.id;
    } catch (error) {
      console.error('Error creating conversation:', error);
      toast.error('Failed to create new conversation');
      return null;
    }
  };

  const sendMessage = async (messageContent?: string, assessmentData?: any) => {
    const messageToSend = messageContent || inputMessage;
    if (!messageToSend.trim() || !currentConversation || isLoading) return;

    let userMessage = messageToSend.trim();
    
    // Add action context if one is selected
    if (activeAction) {
      const actionMap = {
        'generate-proposal': 'Generate a professional proposal based on our conversation. Use my uploaded proposal templates for formatting and include relevant services from my pricing document. Make sure to include project timeline, deliverables, and pricing. If site images were uploaded during assessment, reference them in the proposal. Do not include any introductory phrases like "Here is the proposal".',
        'generate-invoice': 'Generate an invoice based on the services we discussed. Use my company information and pricing document to create an accurate invoice with the correct pricing and branding.'
      };
      userMessage = `${actionMap[activeAction as keyof typeof actionMap]} ${userMessage}`;
    }
    
    setInputMessage('');
    setIsLoading(true);

    try {
      // Add user message to database
      const { data: userMessageData, error: userError } = await supabase
        .from('chat_messages')
        .insert({
          conversation_id: currentConversation,
          user_id: user?.id,
          role: 'user',
          content: userMessage
        })
        .select()
        .single();

      if (userError) throw userError;

      // Add user message to UI immediately
      setMessages(prev => [...prev, {
        id: userMessageData.id,
        role: userMessageData.role as 'user' | 'assistant',
        content: userMessageData.content,
        created_at: userMessageData.created_at
      }]);

      // Call AI API with streaming
      const conversationHistory = messages.map(msg => ({
        role: msg.role,
        content: msg.content
      }));

      setStreamingMessage('');
      let fullResponse = '';

      try {
        const response = await fetch(`https://gzgncmpytstovexfazdw.supabase.co/functions/v1/ai-chat`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imd6Z25jbXB5dHN0b3ZleGZhemR3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQzMjY5MDEsImV4cCI6MjA2OTkwMjkwMX0.MXGmZChk2ytt2NQX5kDqiXxN2h4RiC2zD5EDN9wlJtc`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            message: userMessage,
            conversationHistory,
            userId: user?.id,
            conversationId: currentConversation,
            structuredData: assessmentData
          })
        });

        if (!response.ok) throw new Error('Failed to get AI response');

        const data = await response.json();
        fullResponse = data.response || "I'm having trouble connecting to my AI services right now. Please try again in a moment.";
        
      } catch (error) {
        console.error('AI API error:', error);
        fullResponse = "I'm having trouble connecting to my AI services right now. Please try again in a moment.";
        toast.error('Failed to get AI response');
      }

      setStreamingMessage('');
      const aiResponse = fullResponse;

      // Add AI response to database
      const { data: aiMessageData, error: aiError } = await supabase
        .from('chat_messages')
        .insert({
          conversation_id: currentConversation,
          user_id: user?.id,
          role: 'assistant',
          content: aiResponse
        })
        .select()
        .single();

      if (aiError) throw aiError;

      // Add AI message to UI
      setMessages(prev => [...prev, {
        id: aiMessageData.id,
        role: aiMessageData.role as 'user' | 'assistant',
        content: aiMessageData.content,
        created_at: aiMessageData.created_at
      }]);

      // Check if this is a document generation action and open editor
      if (activeAction === 'generate-proposal' || activeAction === 'generate-invoice') {
        const currentConversationData = conversations.find(c => c.id === currentConversation);
        setGeneratedContent(aiResponse);
        setShowDocumentEditor(true);
        // Set the document type based on the active action
        const documentType = activeAction === 'generate-proposal' ? 'Proposal' : 'Invoice';
        // Pass the document type to the DocumentEditor component
        setDocumentType(documentType);
        setActiveAction(null);
      }

      // Update conversation title if it's the first message
      if (messages.length === 0) {
        const title = userMessage.substring(0, 50) + (userMessage.length > 50 ? '...' : '');
        await supabase
          .from('chat_conversations')
          .update({ title })
          .eq('id', currentConversation);
        
        setConversations(prev => prev.map(conv => 
          conv.id === currentConversation ? { ...conv, title } : conv
        ));
      }

    } catch (error) {
      console.error('Error sending message:', error);
      toast.error('Failed to send message');
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const handleQuickAction = (actionId: string, prompt: string) => {
    // This is kept for compatibility but not used anymore
  };

  const handleActionSelect = (actionId: string) => {
    if (activeAction === actionId) {
      setActiveAction(null);
    } else {
      setActiveAction(actionId);
    }
  };

  const fetchCompanyInfo = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('company, email, full_name')
        .eq('id', user?.id)
        .single();
      
      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error fetching company info:', error);
      return null;
    }
  };

  const refreshConversations = () => {
    fetchConversations();
    if (currentConversation) {
      fetchMessages(currentConversation);
    }
  };

  const handleNewConversation = () => {
    setShowCompanyForm(true);
  };

  const handleCompanyFormSubmit = async (companyData: CompanyInfoData) => {
    const conversationId = await createNewConversation(companyData);
    if (conversationId) {
      setCurrentConversation(conversationId);
      setMessages([]);
      setGeneratedContent('');
      setIsAssessmentMode(false);
      setShowCompanyForm(false);
      
      // Send initial context message to AI
      const contextMessage = `Starting ${companyData.assessmentType} assessment for ${companyData.companyName}. Company details: Industry: ${companyData.industry || 'Not specified'}, Size: ${companyData.companySize || 'Not specified'}, Contact: ${companyData.contactPerson || 'Not specified'}. Please begin the assessment with appropriate questions.`;
      await sendMessage(contextMessage, companyData);
    }
  };

  const handlePriorityUpdate = async (conversationId: string, priorityLevel: 'low' | 'medium' | 'high') => {
    setConversations(prev => 
      prev.map(conv => 
        conv.id === conversationId 
          ? { ...conv, priority_level: priorityLevel }
          : conv
      )
    );
  };

  const handleAssessmentSubmit = async (data: AssessmentData) => {
    if (!currentConversation) {
      const conversationId = await createNewConversation();
      if (!conversationId) return;
    }

    setIsLoading(true);

    try {
      // Convert files to base64 for API call
      const imagesBase64 = await Promise.all(
        data.step6Images.map(async (file) => {
          const reader = new FileReader();
          return new Promise<string>((resolve) => {
            reader.onload = () => resolve(reader.result as string);
            reader.readAsDataURL(file);
          });
        })
      );

      // Structure the assessment data for AI
      const structuredData = {
        projectDriver: data.step1,
        priorities: data.step2,
        budget: data.step3,
        storageAndCameras: data.step4,
        decisionMaker: data.step5,
        siteLayout: data.step6,
        siteImages: imagesBase64,
        projectRoadmap: data.step7,
        additionalNotes: data.additionalNotes
      };

      // Store assessment images for later use in proposals
      setLastAssessmentImages(imagesBase64);

      const assessmentMessage = `STRUCTURED ASSESSMENT DATA:

**Project Driver:** ${data.step1}

**Client Priorities:** ${data.step2}

**Budget Information:** ${data.step3}

**Storage & Camera Requirements:** ${data.step4}

**Decision Maker:** ${data.step5}

**Site Layout Information:** ${data.step6}
${data.step6Images.length > 0 ? `\n**Site Images:** ${data.step6Images.length} image(s) uploaded for analysis` : ''}

**Project Roadmap:** ${data.step7}

${data.additionalNotes ? `**Additional Notes:** ${data.additionalNotes}` : ''}

Please provide a comprehensive security camera system assessment based on this structured information. Include specific recommendations, pricing considerations, and implementation timeline.`;

      // Send structured message with images
      await sendMessage(assessmentMessage, structuredData);
      
      // Switch back to chat mode after submission
      setIsAssessmentMode(false);
      
    } catch (error) {
      console.error('Error submitting assessment:', error);
      toast.error('Failed to submit assessment');
    }
  };

  return (
    <Layout>
      <SEO
        title="AI Assistant Chat — Design Rite AI"
        description="Chat with your AI assistant for proposals, invoices, and analysis."
        canonical="/chat"
      />
      <div className="max-w-7xl mx-auto h-[calc(100vh-8rem)]">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 h-full">
          {/* Conversations Sidebar */}
          <div className="lg:col-span-1">
            <Card className="h-full">
              <CardHeader>
                <div className="flex justify-between items-center">
                  <CardTitle>Conversations</CardTitle>
                  <Button onClick={handleNewConversation} size="sm">
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="p-0">
                <ScrollArea className="h-[calc(100vh-12rem)]">
                  <ConversationList
                    conversations={conversations}
                    currentConversation={currentConversation}
                    onConversationSelect={setCurrentConversation}
                    onConversationDeleted={refreshConversations}
                    onPriorityUpdate={handlePriorityUpdate}
                  />
                </ScrollArea>
              </CardContent>
            </Card>
          </div>

          {/* Chat Area */}
          <div className="lg:col-span-3">
            <Card className="h-full flex flex-col">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2">
                    <Bot className="h-5 w-5" />
                    AI Assistant
                    <Badge variant="secondary">Beta</Badge>
                  </CardTitle>
                  
                  {/* Mode Toggle */}
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2">
                      <MessageSquare className="h-4 w-4" />
                      <Label htmlFor="mode-toggle" className="text-sm font-medium">
                        Free Chat
                      </Label>
                    </div>
                    <Switch
                      id="mode-toggle"
                      checked={isAssessmentMode}
                      onCheckedChange={setIsAssessmentMode}
                    />
                    <div className="flex items-center gap-2">
                      <ClipboardList className="h-4 w-4" />
                      <Label htmlFor="mode-toggle" className="text-sm font-medium">
                        Assessment
                      </Label>
                    </div>
                  </div>
                </div>
              </CardHeader>
              {currentConversation ? (
                <>
                  <CardContent className="flex-1 p-0">
                    {isAssessmentMode ? (
                      <div className="h-[calc(100vh-16rem)] p-6 overflow-y-auto">
                        <AssessmentForm 
                          onSubmit={handleAssessmentSubmit} 
                          onCancel={() => setIsAssessmentMode(false)}
                        />
                      </div>
                    ) : (
                      <ScrollArea className="h-[calc(100vh-16rem)] p-4">
                        <div className="space-y-4">
                          {messages.map((message) => (
                            <div
                              key={message.id}
                              className={`flex items-start gap-3 ${
                                message.role === 'user' ? 'justify-end' : ''
                              }`}
                            >
                              {message.role === 'assistant' && (
                                <Bot className="h-6 w-6 text-blue-500" />
                              )}
                              <div
                                className={`max-w-lg rounded-lg p-3 ${
                                  message.role === 'user'
                                    ? 'bg-blue-500 text-white'
                                    : 'bg-gray-100 dark:bg-gray-800'
                                }`}
                              >
                                <MessageFormatter content={message.content} />
                              </div>
                              {message.role === 'user' && (
                                <User className="h-6 w-6 text-gray-500" />
                              )}
                            </div>
                          ))}
                          {isLoading && streamingMessage && (
                            <div className="flex items-start gap-3">
                              <Bot className="h-6 w-6 text-blue-500" />
                              <div className="max-w-lg rounded-lg p-3 bg-gray-100 dark:bg-gray-800">
                                <MessageFormatter content={streamingMessage} />
                              </div>
                            </div>
                          )}
                          <div ref={messagesEndRef} />
                        </div>
                      </ScrollArea>
                    )}
                  </CardContent>
                  {!isAssessmentMode && (
                    <div className="p-4 border-t space-y-4">
                      <QuickActions 
                        onQuickAction={handleQuickAction} 
                        activeAction={activeAction}
                        onActionSelect={handleActionSelect}
                      />
                      <div className="flex gap-2">
                        <Input
                          placeholder="Type your message..."
                          value={inputMessage}
                          onChange={(e) => setInputMessage(e.target.value)}
                          onKeyPress={handleKeyPress}
                          disabled={isLoading}
                        />
                        <Button onClick={() => sendMessage()} disabled={!inputMessage.trim() || isLoading}>
                          <Send className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  )}
                </>
              ) : (
                <CardContent className="flex-1 flex items-center justify-center">
                  <div className="text-center">
                    <Bot className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <h3 className="text-lg font-semibold mb-2">Welcome to your AI Assistant</h3>
                    <p className="text-muted-foreground mb-4">
                      Start a new conversation to begin chatting with your AI assistant.
                    </p>
                    <Button onClick={handleNewConversation}>
                      <Plus className="h-4 w-4 mr-2" />
                      Start New Conversation
                    </Button>
                  </div>
                </CardContent>
              )}
            </Card>
          </div>
        </div>

        {/* Document Editor Modal */}
        <DocumentEditor
          isOpen={showDocumentEditor}
          onClose={() => setShowDocumentEditor(false)}
          documentType={documentType.toLowerCase() as 'proposal' | 'invoice'}
          aiGeneratedContent={generatedContent}
          clientName={conversations.find(c => c.id === currentConversation)?.company_name}
          assessmentImages={lastAssessmentImages}
        />
      </div>

      {/* Company Info Form */}
      <CompanyInfoForm
        open={showCompanyForm}
        onSubmit={handleCompanyFormSubmit}
        onCancel={() => setShowCompanyForm(false)}
      />
    </Layout>
  );
};

export default Chat;
