import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/components/ui/use-toast';
import { FileText, Download, Mail, Edit, Calendar, DollarSign, Clock, User } from 'lucide-react';

interface ProposalItem {
  id: number;
  service: string;
  description: string;
  timeline: string;
  price: number;
}

interface ClientInfo {
  name: string;
  email: string;
  company: string;
  address: string;
  phone: string;
}

interface CompanyInfo {
  name: string;
  address: string;
  phone: string;
  email: string;
  website: string;
  logo: string;
}

const ProposalGenerator = () => {
  const { toast } = useToast();
  const { user } = useAuth();
  const [proposalNumber, setProposalNumber] = useState(`PROP-${Date.now()}`);
  const [issueDate, setIssueDate] = useState(new Date().toISOString().split('T')[0]);
  const [validUntil, setValidUntil] = useState(
    new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
  );

  const [companyInfo, setCompanyInfo] = useState<CompanyInfo>({
    name: '',
    address: '',
    phone: '',
    email: '',
    website: '',
    logo: '',
  });

  const [clientInfo, setClientInfo] = useState<ClientInfo>({
    name: '',
    email: '',
    company: '',
    address: '',
    phone: '',
  });

  const [proposalItems, setProposalItems] = useState<ProposalItem[]>([
    { id: 1, service: '', description: '', timeline: '', price: 0 },
  ]);

  const [projectOverview, setProjectOverview] = useState('');
  const [terms, setTerms] = useState('Payment terms: 50% upfront, 50% on completion.\nDelivery timeline as specified above.\nAll prices are in USD.');

  // Load company info from profile
  useEffect(() => {
    if (user) {
      loadCompanyFromProfile();
    }
  }, [user]);

  const loadCompanyFromProfile = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user?.id)
        .maybeSingle();

      if (error) throw error;
      
      if (data) {
        const fullAddress = [data.address, data.city, data.state, data.zip_code]
          .filter(Boolean)
          .join(', ');
          
        setCompanyInfo(prev => ({
          ...prev,
          name: data.company || '',
          address: fullAddress,
          phone: data.phone || '',
          email: data.email || '',
          website: data.website || '',
          logo: data.logo_url || '',
        }));
      }
    } catch (error) {
      console.error('Error loading company info:', error);
    }
  };

  const addItem = () => {
    const newItem: ProposalItem = {
      id: Date.now(),
      service: '',
      description: '',
      timeline: '',
      price: 0,
    };
    setProposalItems([...proposalItems, newItem]);
  };

  const removeItem = (id: number) => {
    setProposalItems(proposalItems.filter(item => item.id !== id));
  };

  const updateItem = (id: number, field: keyof ProposalItem, value: string | number) => {
    setProposalItems(proposalItems.map(item => 
      item.id === id ? { ...item, [field]: value } : item
    ));
  };

  const handleLogoUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        setCompanyInfo(prev => ({ ...prev, logo: e.target?.result as string }));
      };
      reader.readAsDataURL(file);
    }
  };

  const calculateTotal = () => {
    return proposalItems.reduce((sum, item) => sum + item.price, 0);
  };

  const generateProposal = async () => {
    try {
      const { data, error } = await supabase.functions.invoke('generate-proposal', {
        body: {
          proposalNumber,
          issueDate,
          validUntil,
          companyInfo,
          clientInfo,
          proposalItems: proposalItems.filter(item => item.service.trim()),
          projectOverview,
          terms
        }
      });

      if (error) throw error;

      // Assume data.content is the generated content
      const content = data.content;
      const blob = new Blob([content], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Proposal_${proposalNumber}.txt`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast({
        title: "Success",
        description: "Proposal generated and downloaded",
      });
    } catch (error) {
      console.error('Error generating proposal:', error);
      toast({
        title: "Error",
        description: "Failed to generate proposal",
        variant: "destructive"
      });
    }
  };

  const saveTemplate = () => {
    const template = {
      companyInfo,
      terms,
    };
    localStorage.setItem('proposalTemplate', JSON.stringify(template));
    toast({
      title: "Success",
      description: "Template saved successfully!",
    });
  };

  const loadTemplate = () => {
    const saved = localStorage.getItem('proposalTemplate');
    if (saved) {
      const template = JSON.parse(saved);
      setCompanyInfo(template.companyInfo);
      setTerms(template.terms);
    }
  };

  const emailProposal = () => {
    const subject = encodeURIComponent(`Proposal ${proposalNumber} from ${companyInfo.name}`);
    const body = encodeURIComponent(`Dear ${clientInfo.name},\n\nPlease find attached our proposal for your project.\n\nBest regards,\n${companyInfo.name}`);
    window.open(`mailto:${clientInfo.email}?subject=${subject}&body=${body}`, '_blank');
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">Proposal Generator</h2>
          <p className="text-muted-foreground">Create professional proposals for your clients</p>
        </div>
        <div className="flex gap-2">
          <Button variant="ghost" onClick={loadCompanyFromProfile}>
            Load from Profile
          </Button>
          <Button variant="outline" onClick={loadTemplate}>
            Load Template
          </Button>
          <Button variant="outline" onClick={saveTemplate}>
            Save Template
          </Button>
        </div>
      </div>

      {/* Proposal Header */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Proposal Details
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <Label htmlFor="proposalNumber">Proposal Number</Label>
              <Input
                id="proposalNumber"
                value={proposalNumber}
                onChange={(e) => setProposalNumber(e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="issueDate">Issue Date</Label>
              <Input
                id="issueDate"
                type="date"
                value={issueDate}
                onChange={(e) => setIssueDate(e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="validUntil">Valid Until</Label>
              <Input
                id="validUntil"
                type="date"
                value={validUntil}
                onChange={(e) => setValidUntil(e.target.value)}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Company Information */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            Your Company Information
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="companyName">Company Name</Label>
              <Input
                id="companyName"
                value={companyInfo.name}
                onChange={(e) => setCompanyInfo(prev => ({ ...prev, name: e.target.value }))}
                placeholder="Your Company Name"
              />
            </div>
            <div>
              <Label htmlFor="companyEmail">Email</Label>
              <Input
                id="companyEmail"
                type="email"
                value={companyInfo.email}
                onChange={(e) => setCompanyInfo(prev => ({ ...prev, email: e.target.value }))}
                placeholder="contact@company.com"
              />
            </div>
            <div>
              <Label htmlFor="companyPhone">Phone</Label>
              <Input
                id="companyPhone"
                value={companyInfo.phone}
                onChange={(e) => setCompanyInfo(prev => ({ ...prev, phone: e.target.value }))}
                placeholder="+1 (555) 123-4567"
              />
            </div>
            <div>
              <Label htmlFor="companyWebsite">Website</Label>
              <Input
                id="companyWebsite"
                value={companyInfo.website}
                onChange={(e) => setCompanyInfo(prev => ({ ...prev, website: e.target.value }))}
                placeholder="www.company.com"
              />
            </div>
          </div>
          <div>
            <Label htmlFor="companyAddress">Address</Label>
            <Textarea
              id="companyAddress"
              value={companyInfo.address}
              onChange={(e) => setCompanyInfo(prev => ({ ...prev, address: e.target.value }))}
              placeholder="123 Business St, City, State 12345"
              rows={2}
            />
          </div>
          <div>
            <Label htmlFor="logo">Company Logo</Label>
            <Input
              id="logo"
              type="file"
              accept="image/*"
              onChange={handleLogoUpload}
              className="cursor-pointer"
            />
            {companyInfo.logo && (
              <div className="mt-2">
                <img src={companyInfo.logo} alt="Company Logo" className="h-16 w-auto" />
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Client Information */}
      <Card>
        <CardHeader>
          <CardTitle>Client Information</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="clientName">Client Name</Label>
              <Input
                id="clientName"
                value={clientInfo.name}
                onChange={(e) => setClientInfo(prev => ({ ...prev, name: e.target.value }))}
                placeholder="Client Name"
              />
            </div>
            <div>
              <Label htmlFor="clientEmail">Email</Label>
              <Input
                id="clientEmail"
                type="email"
                value={clientInfo.email}
                onChange={(e) => setClientInfo(prev => ({ ...prev, email: e.target.value }))}
                placeholder="client@company.com"
              />
            </div>
            <div>
              <Label htmlFor="clientCompany">Company</Label>
              <Input
                id="clientCompany"
                value={clientInfo.company}
                onChange={(e) => setClientInfo(prev => ({ ...prev, company: e.target.value }))}
                placeholder="Client Company Name"
              />
            </div>
            <div>
              <Label htmlFor="clientPhone">Phone</Label>
              <Input
                id="clientPhone"
                value={clientInfo.phone}
                onChange={(e) => setClientInfo(prev => ({ ...prev, phone: e.target.value }))}
                placeholder="+1 (555) 987-6543"
              />
            </div>
          </div>
          <div>
            <Label htmlFor="clientAddress">Address</Label>
            <Textarea
              id="clientAddress"
              value={clientInfo.address}
              onChange={(e) => setClientInfo(prev => ({ ...prev, address: e.target.value }))}
              placeholder="456 Client Ave, City, State 67890"
              rows={2}
            />
          </div>
        </CardContent>
      </Card>

      {/* Project Overview */}
      <Card>
        <CardHeader>
          <CardTitle>Project Overview</CardTitle>
        </CardHeader>
        <CardContent>
          <Textarea
            value={projectOverview}
            onChange={(e) => setProjectOverview(e.target.value)}
            placeholder="Describe the project scope, objectives, and key deliverables..."
            rows={4}
          />
        </CardContent>
      </Card>

      {/* Services/Items */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <DollarSign className="h-5 w-5" />
            Proposed Services
          </CardTitle>
          <CardDescription>Add the services and deliverables you're proposing</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {proposalItems.map((item, index) => (
            <div key={item.id} className="p-4 border rounded-lg space-y-4">
              <div className="flex justify-between items-center">
                <Badge variant="outline">Service {index + 1}</Badge>
                {proposalItems.length > 1 && (
                  <Button variant="ghost" size="sm" onClick={() => removeItem(item.id)}>
                    Remove
                  </Button>
                )}
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label>Service Name</Label>
                  <Input
                    value={item.service}
                    onChange={(e) => updateItem(item.id, 'service', e.target.value)}
                    placeholder="e.g., Website Development"
                  />
                </div>
                <div>
                  <Label>Price</Label>
                  <Input
                    type="number"
                    value={item.price}
                    onChange={(e) => updateItem(item.id, 'price', parseFloat(e.target.value) || 0)}
                    placeholder="0.00"
                  />
                </div>
              </div>
              <div>
                <Label>Description</Label>
                <Textarea
                  value={item.description}
                  onChange={(e) => updateItem(item.id, 'description', e.target.value)}
                  placeholder="Detailed description of the service..."
                  rows={2}
                />
              </div>
              <div>
                <Label>Timeline</Label>
                <Input
                  value={item.timeline}
                  onChange={(e) => updateItem(item.id, 'timeline', e.target.value)}
                  placeholder="e.g., 2-3 weeks"
                />
              </div>
            </div>
          ))}
          
          <Button variant="outline" onClick={addItem} className="w-full">
            Add Service
          </Button>

          <Separator />

          <div className="flex justify-between items-center text-lg font-semibold">
            <span>Total Proposal Value:</span>
            <span>${calculateTotal().toFixed(2)}</span>
          </div>
        </CardContent>
      </Card>

      {/* Terms and Conditions */}
      <Card>
        <CardHeader>
          <CardTitle>Terms and Conditions</CardTitle>
        </CardHeader>
        <CardContent>
          <Textarea
            value={terms}
            onChange={(e) => setTerms(e.target.value)}
            placeholder="Payment terms, delivery schedule, etc..."
            rows={4}
          />
        </CardContent>
      </Card>

      {/* Actions */}
      <div className="flex gap-4">
        <Button onClick={generateProposal} className="flex-1">
          <Download className="h-4 w-4 mr-2" />
          Generate Proposal
        </Button>
        <Button variant="outline" onClick={emailProposal} className="flex-1">
          <Mail className="h-4 w-4 mr-2" />
          Email to Client
        </Button>
      </div>
    </div>
  );
};

export default ProposalGenerator;