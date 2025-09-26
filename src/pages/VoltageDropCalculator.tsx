import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import Layout from '@/components/layout/Layout';
import SEO from '@/components/seo/SEO';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { Zap, MessageSquare, Send, Calculator, History, Download } from 'lucide-react';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  created_at: string;
}

interface VoltageCalculation {
  id: string;
  wire_size: string;
  distance: number;
  current_amps: number;
  voltage_drop_calculated: number;
  voltage_drop_percentage: number;
  material: string;
  system_voltage: number;
  created_at: string;
}

const VoltageDropCalculatorPage = () => {
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
  const [calculations, setCalculations] = useState<VoltageCalculation[]>([]);

  useEffect(() => {
    fetchCalculations();
  }, [user]);

  const fetchCalculations = async () => {
    if (!user) return;
    
    try {
      const { data, error } = await supabase
        .from('voltage_calculations')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(10);

      if (error) throw error;
      setCalculations(data || []);
    } catch (error) {
      console.error('Error fetching calculations:', error);
    }
  };

  const fetchLastConversation = async () => {
    if (!user) return;

    try {
      const { data: conversations, error: convError } = await supabase
        .from('chat_conversations')
        .select('id')
        .eq('user_id', user.id)
        .order('updated_at', { ascending: false })
        .limit(1);

      if (convError) throw convError;

      if (conversations && conversations.length > 0) {
        const { data: messages, error: msgError } = await supabase
          .from('chat_messages')
          .select('*')
          .eq('conversation_id', conversations[0].id)
          .order('created_at', { ascending: true });

        if (msgError) throw msgError;
        
        if (messages && messages.length > 0) {
          const transformedMessages: Message[] = messages.map(msg => ({
            id: msg.id,
            role: (msg.role === 'user' || msg.role === 'assistant') ? msg.role : 'user',
            content: msg.content,
            created_at: msg.created_at
          }));
          setLastConversation(transformedMessages);
          toast.success('Last conversation loaded for context');
        } else {
          toast.info('No messages found in the last conversation');
        }
      } else {
        toast.info('No previous conversations found');
      }
    } catch (error) {
      console.error('Error fetching last conversation:', error);
      toast.error('Failed to load last conversation');
    }
  };

  const calculateVoltageDrop = () => {
    const dist = parseFloat(distance);
    const curr = parseFloat(current);
    const sysVolt = parseFloat(systemVoltage);

    if (!dist || !curr || !wireSize) {
      toast.error('Please fill in all required fields');
      return;
    }

    const wireSizes: Record<string, number> = {
      '18': 1624,
      '16': 2580,
      '14': 4110,
      '12': 6530,
      '10': 10380,
      '8': 16510,
      '6': 26240,
      '4': 41740,
      '2': 66360,
      '1': 83690,
      '1/0': 105600,
      '2/0': 133100,
      '3/0': 167800,
      '4/0': 211600
    };

    const cmArea = wireSizes[wireSize];
    const k = material === 'copper' ? 12.9 : 21.2;

    const voltageDrop = (2 * k * dist * curr) / cmArea;
    const voltageDropPercentage = (voltageDrop / sysVolt) * 100;

    const calculationResult = {
      voltageDrop,
      voltageDropPercentage,
      isAcceptable: voltageDropPercentage <= 3,
      recommendation: voltageDropPercentage > 3 ? 'Consider using larger wire size' : 'Wire size is acceptable'
    };

    setResult(calculationResult);
    saveCalculation(calculationResult);
  };

  const saveCalculation = async (calculationResult: any) => {
    if (!user) return;

    try {
      const { error } = await supabase
        .from('voltage_calculations')
        .insert({
          user_id: user.id,
          wire_size: wireSize,
          distance: parseFloat(distance),
          current_amps: parseFloat(current),
          voltage_drop_calculated: calculationResult.voltageDrop,
          voltage_drop_percentage: calculationResult.voltageDropPercentage,
          material,
          system_voltage: parseFloat(systemVoltage),
          calculation_details: {
            isAcceptable: calculationResult.isAcceptable,
            recommendation: calculationResult.recommendation
          }
        });

      if (error) throw error;
      fetchCalculations();
    } catch (error) {
      console.error('Error saving calculation:', error);
      toast.error('Failed to save calculation');
    }
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
      const conversationHistory = lastConversation.map(msg => ({
        role: msg.role,
        content: msg.content
      }));

      const contextualPrompt = `${expertPrompt}

${lastConversation.length > 0 ? `
PREVIOUS CONVERSATION CONTEXT:
${conversationHistory.map(msg => `${msg.role.toUpperCase()}: ${msg.content}`).join('\n')}

---END PREVIOUS CONVERSATION---
` : ''}

Current voltage drop calculation context:
- Distance: ${distance} feet
- Current: ${current} amps  
- Wire size: ${wireSize} AWG
- Material: ${material}
- System voltage: ${systemVoltage}V
${result ? `- Calculated voltage drop: ${result.voltageDrop.toFixed(2)}V (${result.voltageDropPercentage.toFixed(1)}%)` : ''}

User question: ${userMessage}`;

      const response = await supabase.functions.invoke('ai-chat', {
        body: {
          message: contextualPrompt,
          conversationHistory: chatMessages.map(msg => ({
            role: msg.role,
            content: msg.content
          })),
          userId: user?.id,
          structuredData: {
            type: 'voltage_calculation',
            data: {
              distance,
              current,
              wireSize,
              material,
              systemVoltage,
              result
            }
          }
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
          const lines = chunk.split('\n');

          for (const line of lines) {
            if (line.startsWith('data: ') && line !== 'data: [DONE]') {
              const data = line.slice(6);
              
              try {
                const parsed = JSON.parse(data);
                if (parsed.choices?.[0]?.delta?.content) {
                  const content = parsed.choices[0].delta.content;
                  fullResponse += content;
                  setStreamingMessage(fullResponse);
                }
              } catch (e) {
                // Ignore parsing errors for streaming
              }
            }
          }
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

  const expertPrompt = `You are a world-class low voltage systems expert with 20+ years of experience in:

- Security camera systems (IP, analog, PTZ, thermal)
- Access control systems (card readers, biometrics, door hardware)
- Network infrastructure (PoE, switches, cabling)
- Fire alarm and life safety systems
- Structured cabling and telecommunications
- Power calculations and electrical requirements
- Code compliance (NEC, local electrical codes)
- System design and engineering
- Installation best practices
- Troubleshooting and diagnostics

EXPERTISE AREAS:
1. SYSTEM DESIGN: Layout planning, equipment specification, power calculations
2. INSTALLATION: Step-by-step procedures, best practices, code compliance
3. TROUBLESHOOTING: Systematic diagnostics, problem resolution, testing methods
4. CODE COMPLIANCE: NEC requirements, local codes, safety standards

COMMUNICATION STYLE:
- Provide detailed, technical yet understandable explanations
- Include specific calculations, formulas, and procedures when relevant
- Offer multiple solutions when appropriate (good/better/best)
- Reference relevant codes and standards
- Suggest practical tips and pro techniques
- Always prioritize safety and code compliance

RESPONSE FORMAT:
- Start with a direct answer to the specific question
- Provide detailed technical explanation
- Include relevant calculations if needed
- Offer additional context or related considerations
- Suggest follow-up resources when appropriate`;

  return (
    <Layout>
      <SEO
        title="Voltage Drop Calculator — Design Rite AI"
        description="Calculate voltage drop for low voltage systems and get expert AI advice."
        canonical="/voltage-drop-calculator"
      />
      <div className="max-w-6xl mx-auto space-y-6">
        <header>
          <h1 className="text-3xl font-bold">Voltage Drop Calculator</h1>
          <p className="text-muted-foreground mt-2">
            Calculate voltage drop and get expert advice from our AI assistant
          </p>
        </header>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calculator className="h-5 w-5" />
                Calculator
              </CardTitle>
              <CardDescription>
                Enter the details of your circuit to calculate the voltage drop.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="distance">Distance (feet)</Label>
                  <Input
                    id="distance"
                    value={distance}
                    onChange={(e) => setDistance(e.target.value)}
                    placeholder="100"
                    type="number"
                  />
                </div>
                <div>
                  <Label htmlFor="current">Current (amps)</Label>
                  <Input
                    id="current"
                    value={current}
                    onChange={(e) => setCurrent(e.target.value)}
                    placeholder="2.5"
                    type="number"
                    step="0.1"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="wireSize">Wire Size (AWG)</Label>
                  <Select value={wireSize} onValueChange={setWireSize}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select wire size" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="18">18 AWG</SelectItem>
                      <SelectItem value="16">16 AWG</SelectItem>
                      <SelectItem value="14">14 AWG</SelectItem>
                      <SelectItem value="12">12 AWG</SelectItem>
                      <SelectItem value="10">10 AWG</SelectItem>
                      <SelectItem value="8">8 AWG</SelectItem>
                      <SelectItem value="6">6 AWG</SelectItem>
                      <SelectItem value="4">4 AWG</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="material">Material</Label>
                  <Select value={material} onValueChange={setMaterial}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="copper">Copper</SelectItem>
                      <SelectItem value="aluminum">Aluminum</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div>
                <Label htmlFor="systemVoltage">System Voltage</Label>
                <Select value={systemVoltage} onValueChange={setSystemVoltage}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="12">12V DC</SelectItem>
                    <SelectItem value="24">24V DC</SelectItem>
                    <SelectItem value="48">48V DC (PoE)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <Button onClick={calculateVoltageDrop} className="w-full">
                <Zap className="h-4 w-4 mr-2" />
                Calculate Voltage Drop
              </Button>

              {result && (
                <Card className={result.isAcceptable ? 'border-green-200' : 'border-red-200'}>
                  <CardContent className="pt-4">
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span>Voltage Drop:</span>
                        <span className="font-mono">{result.voltageDrop.toFixed(2)}V</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Percentage:</span>
                        <span className="font-mono">{result.voltageDropPercentage.toFixed(1)}%</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span>Status:</span>
                        <Badge variant={result.isAcceptable ? 'default' : 'destructive'}>
                          {result.isAcceptable ? 'Acceptable' : 'Too High'}
                        </Badge>
                      </div>
                      <div className="text-sm text-muted-foreground mt-2">
                        {result.recommendation}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MessageSquare className="h-5 w-5" />
                Low Voltage Expert AI
              </CardTitle>
              <CardDescription>
                Get expert advice on low voltage systems
              </CardDescription>
              <Button 
                onClick={fetchLastConversation} 
                variant="outline" 
                size="sm"
                className="w-fit"
              >
                <History className="h-4 w-4 mr-2" />
                Pull Last Design Rite AI Conversation
              </Button>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-96 mb-4 p-4 border rounded">
                {chatMessages.map((message) => (
                  <div
                    key={message.id}
                    className={`mb-4 ${
                      message.role === 'user' ? 'text-right' : 'text-left'
                    }`}
                  >
                    <div
                      className={`inline-block p-3 rounded-lg max-w-[80%] ${
                        message.role === 'user'
                          ? 'bg-primary text-primary-foreground'
                          : 'bg-muted'
                      }`}
                    >
                      <div className="text-sm whitespace-pre-wrap">
                        {message.content}
                      </div>
                    </div>
                  </div>
                ))}
                {streamingMessage && (
                  <div className="mb-4 text-left">
                    <div className="inline-block p-3 rounded-lg max-w-[80%] bg-muted">
                      <div className="text-sm whitespace-pre-wrap">
                        {streamingMessage}
                      </div>
                    </div>
                  </div>
                )}
              </ScrollArea>
              <div className="flex gap-2">
                <Textarea
                  placeholder="Ask a question about your calculation..."
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      sendChatMessage();
                    }
                  }}
                  disabled={isLoading}
                />
                <Button 
                  onClick={sendChatMessage} 
                  disabled={!chatInput.trim() || isLoading}
                >
                  <Send className="h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </Layout>
  );
};

export default VoltageDropCalculatorPage;