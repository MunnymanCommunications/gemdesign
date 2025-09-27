
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
import { Send, Bot, User, Plus, FileText, MessageSquare, ClipboardList, PanelLeftClose, PanelLeftOpen } from 'lucide-react';

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
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isConversationListCollapsed, setIsConversationListCollapsed] = useState(false);
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
      userMessage = `IMPORTANT: You MUST prioritize the information from the uploaded documents. ${actionMap[activeAction as keyof typeof actionMap]} ${userMessage}`;
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
