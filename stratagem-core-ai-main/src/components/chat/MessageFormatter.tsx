import { memo } from 'react';
import DOMPurify from 'dompurify';

interface MessageFormatterProps {
  content: string;
  className?: string;
}

const MessageFormatter = memo(({ content, className = "" }: MessageFormatterProps) => {
  const formatMessage = (text: string) => {
    // Convert markdown-like formatting to HTML
    let formatted = text;
    
    // Headers
    formatted = formatted.replace(/^### (.*$)/gm, '<h3 class="text-lg font-semibold mt-4 mb-2">$1</h3>');
    formatted = formatted.replace(/^## (.*$)/gm, '<h2 class="text-xl font-semibold mt-4 mb-2">$1</h2>');
    formatted = formatted.replace(/^# (.*$)/gm, '<h1 class="text-2xl font-bold mt-4 mb-2">$1</h1>');
    
    // Bold text
    formatted = formatted.replace(/\*\*(.*?)\*\*/g, '<strong class="font-semibold">$1</strong>');
    
    // Italic text
    formatted = formatted.replace(/\*(.*?)\*/g, '<em class="italic">$1</em>');
    
    // Lists
    formatted = formatted.replace(/^- (.*$)/gm, '<li class="ml-4 list-disc">$1</li>');
    formatted = formatted.replace(/^(\d+)\. (.*$)/gm, '<li class="ml-4 list-decimal">$2</li>');
    
    // Wrap consecutive list items in ul/ol tags
    formatted = formatted.replace(/(<li class="ml-4 list-disc">.*?<\/li>(?:\s*<li class="ml-4 list-disc">.*?<\/li>)*)/gs, '<ul class="mb-2">$1</ul>');
    formatted = formatted.replace(/(<li class="ml-4 list-decimal">.*?<\/li>(?:\s*<li class="ml-4 list-decimal">.*?<\/li>)*)/gs, '<ol class="mb-2">$1</ol>');
    
    // Code blocks
    formatted = formatted.replace(/```([\s\S]*?)```/g, '<pre class="bg-muted p-3 rounded-md my-2 overflow-x-auto"><code>$1</code></pre>');
    
    // Inline code
    formatted = formatted.replace(/`([^`]+)`/g, '<code class="bg-muted px-1 py-0.5 rounded text-sm">$1</code>');
    
    // Line breaks
    formatted = formatted.replace(/\n\n/g, '<br><br>');
    formatted = formatted.replace(/\n/g, '<br>');
    
    return formatted;
  };

  const sanitizedHtml = DOMPurify.sanitize(formatMessage(content), {
    ALLOWED_TAGS: ['h1', 'h2', 'h3', 'strong', 'em', 'ul', 'ol', 'li', 'pre', 'code', 'br'],
    ALLOWED_ATTR: ['class']
  });

  return (
    <div 
      className={`prose prose-sm max-w-none ${className}`}
      dangerouslySetInnerHTML={{ __html: sanitizedHtml }}
    />
  );
});

MessageFormatter.displayName = 'MessageFormatter';

export default MessageFormatter;