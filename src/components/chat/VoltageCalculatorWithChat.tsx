import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import { toast } from 'sonner';
import { Zap, MessageSquare, Send, Calculator, History } from 'lucide-react';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  created_at: string;
}

const VoltageCalculatorWithChat = () => {
  const { user } = useAuth();
  const [distance, setDistance] = useState('');
  const [current, setCurrent] = useState('');
  const [wireSize, setWireSize] = useState('');
  const [material, setMaterial] = useState('copper');
  const [systemVoltage, setSystemVoltage] = useState('12');
  const [result, setResult] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [chatMessages, setChatMessages] = useState<Message[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [streamingMessage, setStreamingMessage] = useState('');
  const [lastConversation, setLastConversation] = useState<Message[]>([]);

  const calculateVoltageDrop = () => {
    const dist = parseFloat(distance);
    const curr = parseFloat(current);
    const sysVolt = parseFloat(systemVoltage);

    if (!dist || !curr || !wireSize) {
      toast.error('Please fill in all required fields');
      return;
    }

    const wireSizes: Record<string, number> = {
      '18': 1624, '16': 2580, '14': 4110, '12': 6530, '10': 10380,
      '8': 16510, '6': 26240, '4': 41740, '2': 66360, '1': 83690,
      '1/0': 105600, '2/0': 133100, '3/0': 167800, '4/0': 211600
    };

    const cmArea = wireSizes[wireSize];
    const k = material === 'copper' ? 12.9 : 21.2;

    const voltageDrop = (2 * k * dist * curr) / cmArea;
    const voltageDropPercentage = (voltageDrop / sysVolt) * 100;

    const calculationResult = {
      voltageDrop,
      voltageDropPercentage,
      isAcceptable: voltageDropPercentage <= 3,
      recommendation: voltageDropPercentage > 3 ? 'Consider using a larger wire size.' : 'Wire size is acceptable.'
    };

    setResult(calculationResult);
  };

  const sendChatMessage = async () => {
    if (!chatInput.trim() || isLoading) return;

    const userMessage = chatInput;
    setChatInput('');
    setIsLoading(true);

    const newUserMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: userMessage,
      created_at: new Date().toISOString()
    };
    setChatMessages(prev => [...prev, newUserMessage]);

    try {
      const contextualPrompt = `
        Current voltage drop calculation context:
        - Distance: ${distance} feet
        - Current: ${current} amps
        - Wire size: ${wireSize} AWG
        - Material: ${material}
        - System voltage: ${systemVoltage}V
        ${result ? `- Calculated voltage drop: ${result.voltageDrop.toFixed(2)}V (${result.voltageDropPercentage.toFixed(1)}%)` : ''}

        User question: ${userMessage}
      `;

      const response = await supabase.functions.invoke('ai-chat', {
        body: {
          message: contextualPrompt,
          conversationHistory: chatMessages.map(msg => ({ role: msg.role, content: msg.content })),
          userId: user?.id
        }
      });

      if (response.error) throw response.error;

      const reader = response.data?.body?.getReader();
      if (reader) {
        setStreamingMessage('');
        let fullResponse = '';

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const chunk = new TextDecoder().decode(value);
          fullResponse += chunk;
          setStreamingMessage(fullResponse);
        }

        const aiMessage: Message = {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          content: fullResponse,
          created_at: new Date().toISOString()
        };
        setChatMessages(prev => [...prev, aiMessage]);
        setStreamingMessage('');
      }
    } catch (error) {
      console.error('Error sending message:', error);
      toast.error('Failed to send message');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Calculator className="h-5 w-5" />Calculator</CardTitle>
          <CardDescription>Enter the details of your circuit to calculate the voltage drop.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Calculator Inputs */}
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><MessageSquare className="h-5 w-5" />AI Assistant</CardTitle>
          <CardDescription>Ask our AI assistant for help with your calculations.</CardDescription>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-96 mb-4 p-4 border rounded">
            {chatMessages.map((message) => (
              <div key={message.id} className={`mb-4 ${message.role === 'user' ? 'text-right' : 'text-left'}`}>
                <div className={`inline-block p-3 rounded-lg max-w-[80%] ${message.role === 'user' ? 'bg-primary text-primary-foreground' : 'bg-muted'}`}>
                  <div className="text-sm whitespace-pre-wrap">{message.content}</div>
                  <div className="text-xs text-muted-foreground mt-1">{new Date(message.created_at).toLocaleTimeString()}</div>
                </div>
              </div>
            ))}
            {streamingMessage && (
              <div className="mb-4 text-left">
                <div className="inline-block p-3 rounded-lg max-w-[80%] bg-muted">
                  <div className="text-sm whitespace-pre-wrap">{streamingMessage}</div>
                </div>
              </div>
            )}
          </ScrollArea>
          <div className="flex gap-2">
            <Input
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
              placeholder="Ask a question..."
              onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && (e.preventDefault(), sendChatMessage())}
            />
            <Button onClick={sendChatMessage} disabled={isLoading}><Send className="h-4 w-4" /></Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default VoltageCalculatorWithChat;