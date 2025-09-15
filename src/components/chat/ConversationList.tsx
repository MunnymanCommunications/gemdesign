import { useState } from 'react';
import { X, Search, Building2, AlertTriangle, AlertCircle, Info } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface Conversation {
  id: string;
  title: string;
  created_at: string;
  company_name?: string;
  assessment_type?: string;
  priority_score?: number;
  priority_level?: 'low' | 'medium' | 'high';
  conversation_summary?: string;
}

interface ConversationListProps {
  conversations: Conversation[];
  currentConversation: string | null;
  onConversationSelect: (id: string) => void;
  onConversationDeleted: () => void;
  onPriorityUpdate?: (conversationId: string, priorityLevel: 'low' | 'medium' | 'high') => void;
}

const ConversationList = ({ 
  conversations, 
  currentConversation, 
  onConversationSelect,
  onConversationDeleted,
  onPriorityUpdate 
}: ConversationListProps) => {
  const [hoveredConversation, setHoveredConversation] = useState<string | null>(null);
  const [deletingConversation, setDeletingConversation] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [priorityFilter, setPriorityFilter] = useState<'all' | 'low' | 'medium' | 'high'>('all');

  const deleteConversation = async (conversationId: string, event: React.MouseEvent) => {
    event.stopPropagation();
    setDeletingConversation(conversationId);
    
    try {
      // Delete messages first
      const { error: messagesError } = await supabase
        .from('chat_messages')
        .delete()
        .eq('conversation_id', conversationId);

      if (messagesError) throw messagesError;

      // Delete conversation
      const { error: conversationError } = await supabase
        .from('chat_conversations')
        .delete()
        .eq('id', conversationId);

      if (conversationError) throw conversationError;

      toast.success('Conversation deleted successfully');
      onConversationDeleted();
    } catch (error) {
      console.error('Error deleting conversation:', error);
      toast.error('Failed to delete conversation');
    } finally {
      setDeletingConversation(null);
    }
  };

  const updatePriority = async (conversationId: string, priorityLevel: 'low' | 'medium' | 'high') => {
    try {
      const { error } = await supabase
        .from('chat_conversations')
        .update({ priority_level: priorityLevel })
        .eq('id', conversationId);

      if (error) throw error;

      toast.success('Priority updated successfully');
      onPriorityUpdate?.(conversationId, priorityLevel);
    } catch (error) {
      console.error('Error updating priority:', error);
      toast.error('Failed to update priority');
    }
  };

  const getPriorityColor = (score?: number, level?: string) => {
    if (score && score >= 80) return 'text-red-500 bg-red-50 border-red-200';
    if (score && score >= 50) return 'text-orange-500 bg-orange-50 border-orange-200';
    if (level === 'high') return 'text-red-500 bg-red-50 border-red-200';
    if (level === 'medium') return 'text-orange-500 bg-orange-50 border-orange-200';
    return 'text-green-500 bg-green-50 border-green-200';
  };

  const getPriorityIcon = (score?: number, level?: string) => {
    if (score && score >= 80) return AlertTriangle;
    if (score && score >= 50) return AlertCircle;
    if (level === 'high') return AlertTriangle;
    if (level === 'medium') return AlertCircle;
    return Info;
  };

  // Filter and sort conversations
  const filteredConversations = conversations
    .filter(conv => {
      const matchesSearch = !searchQuery || 
        conv.company_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        conv.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        conv.conversation_summary?.toLowerCase().includes(searchQuery.toLowerCase());
      
      const matchesPriority = priorityFilter === 'all' || conv.priority_level === priorityFilter;
      
      return matchesSearch && matchesPriority;
    })
    .sort((a, b) => {
      // Sort by priority score (high to low), then by creation date (newest first)
      const scoreA = a.priority_score || 50;
      const scoreB = b.priority_score || 50;
      if (scoreA !== scoreB) return scoreB - scoreA;
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    });

  return (
    <div className="space-y-4 p-4">
      {/* Search and Filter Controls */}
      <div className="space-y-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
          <Input
            placeholder="Search assessments..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        
        <Select value={priorityFilter} onValueChange={(value: 'all' | 'low' | 'medium' | 'high') => setPriorityFilter(value)}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Priorities</SelectItem>
            <SelectItem value="high">High Priority</SelectItem>
            <SelectItem value="medium">Medium Priority</SelectItem>
            <SelectItem value="low">Low Priority</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Conversations List */}
      <div className="space-y-2">
        {filteredConversations.map((conversation) => {
          const PriorityIcon = getPriorityIcon(conversation.priority_score, conversation.priority_level);
          const priorityColor = getPriorityColor(conversation.priority_score, conversation.priority_level);
          
          return (
            <div
              key={conversation.id}
              onClick={() => onConversationSelect(conversation.id)}
              onMouseEnter={() => setHoveredConversation(conversation.id)}
              onMouseLeave={() => setHoveredConversation(null)}
              className={`relative p-3 rounded-lg cursor-pointer transition-colors group border ${
                currentConversation === conversation.id
                  ? 'bg-primary text-primary-foreground border-primary'
                  : 'hover:bg-muted border-border'
              }`}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  {/* Company name and priority indicator */}
                  <div className="flex items-center gap-2 mb-1">
                    {conversation.company_name ? (
                      <div className="flex items-center gap-2">
                        <Building2 className="h-3 w-3 text-muted-foreground" />
                        <span className="font-medium text-sm truncate">{conversation.company_name}</span>
                      </div>
                    ) : (
                      <p className="font-medium text-sm truncate">{conversation.title}</p>
                    )}
                    
                    {/* Priority Score and Level */}
                    <div className="flex items-center gap-1">
                      {conversation.priority_score && (
                        <Badge variant="outline" className={`text-xs px-1 py-0 ${priorityColor}`}>
                          {conversation.priority_score}
                        </Badge>
                      )}
                      <PriorityIcon className="h-3 w-3" />
                    </div>
                  </div>
                  
                  {/* Assessment type */}
                  {conversation.assessment_type && (
                    <p className="text-xs text-muted-foreground capitalize mb-1">
                      {conversation.assessment_type} Assessment
                    </p>
                  )}
                  
                  {/* Date */}
                  <p className="text-xs opacity-70">
                    {new Date(conversation.created_at).toLocaleDateString()}
                  </p>
                  
                  {/* Summary if available */}
                  {conversation.conversation_summary && (
                    <p className="text-xs text-muted-foreground mt-1 truncate">
                      {conversation.conversation_summary}
                    </p>
                  )}
                </div>
                
                {/* Priority Selector and Delete Button */}
                <div className="flex items-center gap-1">
                  {hoveredConversation === conversation.id && onPriorityUpdate && (
                    <Select
                      value={conversation.priority_level || 'medium'}
                      onValueChange={(value: 'low' | 'medium' | 'high') => {
                        updatePriority(conversation.id, value);
                      }}
                    >
                      <SelectTrigger className="h-6 w-16 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="low">Low</SelectItem>
                        <SelectItem value="medium">Med</SelectItem>
                        <SelectItem value="high">High</SelectItem>
                      </SelectContent>
                    </Select>
                  )}
                  
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={(e) => deleteConversation(conversation.id, e)}
                    disabled={deletingConversation === conversation.id}
                    className="h-6 w-6 p-0 opacity-70 hover:opacity-100 hover:bg-destructive hover:text-destructive-foreground flex-shrink-0"
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </div>
              </div>
            </div>
          );
        })}
        
        {filteredConversations.length === 0 && conversations.length > 0 && (
          <p className="text-muted-foreground text-center py-8">
            No assessments match your search criteria.
          </p>
        )}
        
        {conversations.length === 0 && (
          <p className="text-muted-foreground text-center py-8">
            No assessments yet. Start a new one!
          </p>
        )}
      </div>
    </div>
  );
};

export default ConversationList;