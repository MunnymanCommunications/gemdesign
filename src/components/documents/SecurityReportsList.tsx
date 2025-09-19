import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Download, Trash2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';

interface SecurityReport {
  id: string;
  company_name: string;
  file_path: string;
  created_at: string;
}

const SecurityReportsList = () => {
  const { user } = useAuth();
  const [reports, setReports] = useState<SecurityReport[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      fetchReports();
    }
  }, [user]);

  const fetchReports = async () => {
    try {
      const { data, error } = await supabase
        .from('security_reports')
        .select('id, company_name, file_path, created_at')
        .eq('user_id', user?.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      setReports(data || []);
    } catch (error) {
      console.error('Error fetching reports:', error);
      toast.error('Failed to load security reports');
    } finally {
      setLoading(false);
    }
  };

  const deleteReport = async (id: string) => {
    try {
      // First get report to delete
      const report = reports.find(r => r.id === id);
      if (!report) return;

      // Delete from storage
      const { error: storageError } = await supabase.storage
        .from('security-reports')
        .remove([report.file_path]);

      if (storageError) throw storageError;

      // Delete from database
      const { error: dbError } = await supabase
        .from('security_reports')
        .delete()
        .eq('id', id);

      if (dbError) throw dbError;
      
      setReports(reports.filter(report => report.id !== id));
      toast.success('Report deleted successfully');
    } catch (error) {
      console.error('Error deleting report:', error);
      toast.error('Failed to delete report');
    }
  };

  const downloadReport = async (report: SecurityReport) => {
    try {
      const { data, error } = await supabase.storage
        .from('security-reports')
        .download(report.file_path);

      if (error) throw error;

      const url = URL.createObjectURL(data);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${report.company_name.replace(/\s+/g, '_')}_Security_Report.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error downloading report:', error);
      toast.error('Failed to download report');
    }
  };

  if (loading) {
    return <div>Loading...</div>;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Security Reports</CardTitle>
      </CardHeader>
      <CardContent>
        {reports.length === 0 ? (
          <p>No security reports found.</p>
        ) : (
          <ul className="space-y-4">
            {reports.map(report => (
              <li key={report.id} className="flex items-center justify-between p-4 border rounded-lg">
                <div>
                  <p className="font-semibold">{report.company_name}</p>
                  <p className="text-sm text-gray-500">
                    Generated on {new Date(report.created_at).toLocaleDateString()}
                  </p>
                </div>
                <div className="flex items-center space-x-2">
                  <Button variant="outline" size="sm" onClick={() => downloadReport(report)}>
                    <Download className="w-4 h-4 mr-2" />
                    Download
                  </Button>
                  <Button variant="destructive" size="sm" onClick={() => deleteReport(report.id)}>
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
};

export default SecurityReportsList;