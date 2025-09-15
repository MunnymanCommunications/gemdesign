import { Button } from '@/components/ui/button';
import { FileText, Send } from 'lucide-react';

interface QuickActionsProps {
  onQuickAction: (action: string, prompt: string) => void;
  activeAction: string | null;
  onActionSelect: (actionId: string) => void;
}

const QuickActions = ({ onQuickAction, activeAction, onActionSelect }: QuickActionsProps) => {
  const quickActions = [
    {
      id: 'generate-proposal',
      label: 'Generate Proposal',
      icon: FileText,
      prompt: 'Generate a professional proposal based on our conversation. Use my uploaded proposal templates for formatting and include relevant services from my pricing document. Make sure to include project timeline, deliverables, and pricing.'
    }
  ];

  return (
    <div className="flex gap-2 mb-4">
      {quickActions.map((action) => (
        <Button
          key={action.id}
          variant={activeAction === action.id ? "default" : "outline"}
          size="sm"
          onClick={() => onActionSelect(action.id)}
          className={`transition-colors ${
            activeAction === action.id 
              ? "bg-primary text-primary-foreground border-primary" 
              : "bg-transparent border-primary/30 text-primary hover:bg-primary/10 hover:border-primary/50"
          }`}
        >
          <action.icon className="h-4 w-4 mr-2" />
          {action.label}
        </Button>
      ))}
    </div>
  );
};

export default QuickActions;