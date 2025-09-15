import React, { useState, useRef, useEffect } from 'react';
import { MessageCircle, X, Send, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';

interface Message {
  id: string;
  content: string;
  role: 'user' | 'assistant';
  timestamp: Date;
}

const PLATFORM_INSTRUCTIONS = `You are a helpful platform assistant for DesignR AI Platform. Help users navigate and understand the platform features:

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

const PlatformHelpBubble = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      content: 'Hi! I\'m here to help you navigate the DesignR AI Platform. Ask me about features, navigation, or how to get started!',
      role: 'assistant',
      timestamp: new Date()
    }
  ]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const sendMessage = async () => {
    if (!inputValue.trim() || isLoading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      content: inputValue,
      role: 'user',
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setInputValue('');
    setIsLoading(true);

    try {
      // Call the platform help API
      const conversationHistory = messages.slice(-10).map(msg => ({
        role: msg.role,
        content: msg.content
      }));

      let fullResponse = '';
      
      const response = await fetch(`https://gzgncmpytstovexfazdw.supabase.co/functions/v1/platform-help`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imd6Z25jbXB5dHN0b3ZleGZhemR3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQzMjY5MDEsImV4cCI6MjA2OTkwMjkwMX0.MXGmZChk2ytt2NQX5kDqiXxN2h4RiC2zD5EDN9wlJtc`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: inputValue,
          conversationHistory
        })
      });

      if (response.ok) {
        const reader = response.body?.getReader();
        const decoder = new TextDecoder();

        if (reader) {
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            const chunk = decoder.decode(value);
            const lines = chunk.split('\n');

            for (const line of lines) {
              if (line.startsWith('data: ')) {
                try {
                  const data = JSON.parse(line.slice(6));
                  if (data.content) {
                    fullResponse += data.content;
                  }
                } catch (e) {
                  // Skip invalid JSON
                }
              }
            }
          }
        }
      } else {
        // Fallback to local response
        fullResponse = generatePlatformResponse(inputValue);
      }

      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        content: fullResponse || generatePlatformResponse(inputValue),
        role: 'assistant',
        timestamp: new Date()
      };
      setMessages(prev => [...prev, assistantMessage]);
      setIsLoading(false);
    } catch (error) {
      console.error('Error sending message:', error);
      // Fallback to local response
      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        content: generatePlatformResponse(inputValue),
        role: 'assistant',
        timestamp: new Date()
      };
      setMessages(prev => [...prev, assistantMessage]);
      setIsLoading(false);
    }
  };

  const generatePlatformResponse = (query: string): string => {
    const lowerQuery = query.toLowerCase();
    
    if (lowerQuery.includes('navigate') || lowerQuery.includes('menu') || lowerQuery.includes('where')) {
      return 'The main navigation is on the left sidebar. Key sections include Chat (main AI interface), Documents (file management), Business Tools (proposals & calculators), and your Profile settings. What specific area would you like to explore?';
    }
    
    if (lowerQuery.includes('document') || lowerQuery.includes('upload') || lowerQuery.includes('file')) {
      return 'Go to the Documents section to upload PDFs, contracts, and other business files. These documents will be available to the AI in your chats for context and analysis. Your subscription tier determines how many documents you can upload.';
    }
    
    if (lowerQuery.includes('proposal') || lowerQuery.includes('business tool')) {
      return 'Visit Business Tools in the sidebar to access the AI-powered proposal generator. Upload relevant documents first for better AI context, then describe your project to generate professional proposals.';
    }
    
    if (lowerQuery.includes('subscription') || lowerQuery.includes('plan') || lowerQuery.includes('billing')) {
      return 'Check the Subscription page to view your current tier, document limits, and billing information. Different tiers offer varying document upload limits and features.';
    }
    
    if (lowerQuery.includes('chat') || lowerQuery.includes('ai') || lowerQuery.includes('assistant')) {
      return 'The Chat section is your main AI interface. Upload business documents first, then chat with the AI about your business needs. The AI can reference your uploaded documents for context-aware assistance.';
    }
    
    if (lowerQuery.includes('getting started') || lowerQuery.includes('start') || lowerQuery.includes('begin')) {
      return 'To get started: 1) Complete your Profile with company info, 2) Upload key business documents in the Documents section, 3) Start chatting with the AI for assistance, 4) Try the Business Tools for proposal generation. Need help with any specific step?';
    }
    
    return 'I can help you navigate the platform! Ask me about specific features like documents, chat, business tools, navigation, or getting started. What would you like to know more about?';
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  return (
    <div className="fixed bottom-6 right-6 z-40">
      {!isOpen && (
        <Button
          onClick={() => setIsOpen(true)}
          className="h-14 w-14 rounded-full bg-purple-600 hover:bg-purple-700 shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105"
          size="icon"
        >
          <MessageCircle className="h-6 w-6 text-white" />
        </Button>
      )}

      {isOpen && (
        <Card className="w-80 h-96 shadow-xl border-purple-200 animate-in slide-in-from-bottom-5 duration-300">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 bg-purple-50 dark:bg-purple-950/20">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <MessageCircle className="h-4 w-4 text-purple-600" />
              Platform Help
            </CardTitle>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsOpen(false)}
              className="h-6 w-6 p-0"
            >
              <X className="h-4 w-4" />
            </Button>
          </CardHeader>
          
          <CardContent className="p-0 flex flex-col h-80">
            <ScrollArea className="flex-1 p-3">
              <div className="space-y-3">
                {messages.map((message) => (
                  <div
                    key={message.id}
                    className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                  >
                    <div
                      className={`max-w-[85%] rounded-lg px-3 py-2 text-sm ${
                        message.role === 'user'
                          ? 'bg-purple-600 text-white'
                          : 'bg-muted text-foreground'
                      }`}
                    >
                      {message.content}
                    </div>
                  </div>
                ))}
                
                {isLoading && (
                  <div className="flex justify-start">
                    <div className="bg-muted rounded-lg px-3 py-2 text-sm flex items-center gap-2">
                      <Loader2 className="h-3 w-3 animate-spin" />
                      Thinking...
                    </div>
                  </div>
                )}
                
                <div ref={messagesEndRef} />
              </div>
            </ScrollArea>
            
            <div className="p-3 border-t">
              <div className="flex gap-2">
                <Input
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  onKeyPress={handleKeyPress}
                  placeholder="Ask about the platform..."
                  className="flex-1 text-sm"
                  disabled={isLoading}
                />
                <Button
                  onClick={sendMessage}
                  disabled={!inputValue.trim() || isLoading}
                  size="sm"
                  className="bg-purple-600 hover:bg-purple-700"
                >
                  <Send className="h-3 w-3" />
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default PlatformHelpBubble;