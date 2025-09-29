import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';

interface GeneratedDocument {
  id: string;
  title: string;
  client_name: string;
  document_type: string;
  content: string;
  file_path: string | null;
  amount: number | null;
  created_at: string;
  updated_at: string;
  user_id: string;
}

export const useGeneratedDocuments = () => {
  const { user } = useAuth();
  const [docs, setDocs] = useState<GeneratedDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (user) {
      fetchDocuments();
    } else {
      setDocs([]);
      setLoading(false);
    }
  }, [user]);

  const fetchDocuments = async () => {
    if (!user) return;

    setLoading(true);
    setError(null);
    try {
      const { data, error } = await supabase
        .from('generated_documents')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;

      setDocs(data || []);
    } catch (err) {
      console.error('Error fetching generated documents:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch documents');
      toast.error('Failed to load generated documents');
      setDocs([]);
    } finally {
      setLoading(false);
    }
  };

  const deleteDocument = async (id: string) => {
    if (!user) return false;

    try {
      const doc = docs.find(d => d.id === id);
      if (!doc) return false;

      // Delete from storage if file_path exists
      if (doc.file_path) {
        const { error: storageError } = await supabase.storage
          .from('documents')  // Assuming 'documents' bucket; adjust if different
          .remove([doc.file_path]);

        if (storageError) throw storageError;
      }

      // Delete from database
      const { error: dbError } = await supabase
        .from('generated_documents')
        .delete()
        .eq('id', id);

      if (dbError) throw dbError;

      setDocs(prev => prev.filter(d => d.id !== id));
      toast.success('Document deleted successfully');
      return true;
    } catch (err) {
      console.error('Error deleting document:', err);
      toast.error('Failed to delete document');
      return false;
    }
  };

  const refetch = fetchDocuments;

  return {
    docs,
    loading,
    error,
    deleteDocument,
    refetch
  };
};