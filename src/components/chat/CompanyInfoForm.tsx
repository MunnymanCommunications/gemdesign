import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Building2, FileText } from 'lucide-react';

interface CompanyInfoFormProps {
  open: boolean;
  onSubmit: (data: CompanyInfoData) => void;
  onCancel: () => void;
}

export interface CompanyInfoData {
  companyName: string;
  assessmentType: 'security' | 'general' | 'compliance';
  industry?: string;
  companySize?: string;
  contactPerson?: string;
  dueDate?: string;
  timeline: string;
  priority: number;
}

const CompanyInfoForm = ({ open, onSubmit, onCancel }: CompanyInfoFormProps) => {
  const [formData, setFormData] = useState<CompanyInfoData>({
    companyName: '',
    assessmentType: 'security',
    industry: '',
    companySize: '',
    contactPerson: '',
    dueDate: '',
    timeline: '',
    priority: 0
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (formData.companyName.trim() && formData.timeline) {
      let priority = 49;
      
      // Calculate priority based on due date
      if (formData.dueDate) {
        const dueDate = new Date(formData.dueDate);
        const now = new Date();
        const timeLeft = dueDate.getTime() - now.getTime();
        const daysLeft = Math.ceil(timeLeft / (1000 * 3600 * 24));

        if (daysLeft <= 7) {
          priority = 100; // Due within a week
        } else if (daysLeft <= 30) {
          priority = 80; // Due within a month
        } else if (daysLeft <= 90) {
          priority = 60; // Due within 3 months
        } else {
          priority = 40; // Due in more than 3 months
        }
      } else {
        switch (formData.timeline) {
          case '2-4w':
            priority = 100;
          break;
        case '1-2m':
          priority = 90;
          break;
        case '3m':
          priority = 80;
          break;
        case '6-9m':
          priority = 70;
          break;
        case '9-12m':
          priority = 60;
          break;
        case '1-1.5y':
          priority = 50;
          break;
        default:
          priority = 49;
        }
      }
      onSubmit({ ...formData, priority });
    }
  };

  const handleChange = (field: keyof CompanyInfoData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  return (
    <Dialog open={open} onOpenChange={() => onCancel()}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5" />
            Start New Assessment
          </DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="companyName">Company Name *</Label>
            <Input
              id="companyName"
              value={formData.companyName}
              onChange={(e) => handleChange('companyName', e.target.value)}
              placeholder="Enter company name"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="dueDate">Due Date (Optional)</Label>
            <Input
              id="dueDate"
              type="date"
              value={formData.dueDate || ''}
              onChange={(e) => handleChange('dueDate', e.target.value)}
              placeholder="Enter due date"
            />
          </div>
 

          <div className="space-y-2">
            <Label htmlFor="timeline">Timeline *</Label>
            <Select
              value={formData.timeline}
              onValueChange={(value) => handleChange('timeline', value)}
              required
            >
              <SelectTrigger>
                <SelectValue placeholder="Select a timeline" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="2-4w">2 weeks to 4 weeks</SelectItem>
                <SelectItem value="1-2m">1 month to 2 months</SelectItem>
                <SelectItem value="3m">3 months</SelectItem>
                <SelectItem value="6-9m">6 months to 9 months</SelectItem>
                <SelectItem value="9-12m">9 to 12 months</SelectItem>
                <SelectItem value="1-1.5y">1 year to 1.5 years</SelectItem>
                <SelectItem value="none">No timeline specified</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="assessmentType">Assessment Type</Label>
            <Select
              value={formData.assessmentType}
              onValueChange={(value: 'security' | 'general' | 'compliance') =>
                handleChange('assessmentType', value)
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="security">
                  <div className="flex items-center gap-2">
                    <FileText className="h-4 w-4" />
                    Security Assessment
                  </div>
                </SelectItem>
                <SelectItem value="compliance">
                  <div className="flex items-center gap-2">
                    <FileText className="h-4 w-4" />
                    Compliance Review
                  </div>
                </SelectItem>
                <SelectItem value="general">
                  <div className="flex items-center gap-2">
                    <FileText className="h-4 w-4" />
                    General Consultation
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="industry">Industry (Optional)</Label>
              <Input
                id="industry"
                value={formData.industry}
                onChange={(e) => handleChange('industry', e.target.value)}
                placeholder="e.g., Healthcare, Finance"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="companySize">Company Size (Optional)</Label>
              <Select 
                value={formData.companySize} 
                onValueChange={(value) => handleChange('companySize', value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select size" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="startup">Startup (1-10)</SelectItem>
                  <SelectItem value="small">Small (11-50)</SelectItem>
                  <SelectItem value="medium">Medium (51-200)</SelectItem>
                  <SelectItem value="large">Large (201-1000)</SelectItem>
                  <SelectItem value="enterprise">Enterprise (1000+)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="contactPerson">Contact Person (Optional)</Label>
            <Input
              id="contactPerson"
              value={formData.contactPerson}
              onChange={(e) => handleChange('contactPerson', e.target.value)}
              placeholder="Primary contact name"
            />
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="outline" onClick={onCancel}>
              Cancel
            </Button>
            <Button type="submit" disabled={!formData.companyName.trim()}>
              Start Assessment
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default CompanyInfoForm;