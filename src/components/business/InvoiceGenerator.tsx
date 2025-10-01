import { useState, useRef, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { Plus, Trash2, Download, Upload } from 'lucide-react';
import jsPDF from 'jspdf';

interface InvoiceItem {
  id: string;
  description: string;
  quantity: number;
  rate: number;
  amount: number;
}

interface CompanyInfo {
  name: string;
  address: string;
  city: string;
  state: string;
  zip: string;
  phone: string;
  email: string;
  logo?: string;
}

interface ClientInfo {
  name: string;
  address: string;
  city: string;
  state: string;
  zip: string;
  email: string;
}

const InvoiceGenerator = () => {
  const { user } = useAuth();
  const [invoiceNumber, setInvoiceNumber] = useState(`INV-${Date.now()}`);
  const [invoiceDate, setInvoiceDate] = useState(new Date().toISOString().split('T')[0]);
  const [dueDate, setDueDate] = useState('');
  const [companyInfo, setCompanyInfo] = useState<CompanyInfo>({
    name: '',
    address: '',
    city: '',
    state: '',
    zip: '',
    phone: '',
    email: '',
  });
  const [clientInfo, setClientInfo] = useState<ClientInfo>({
    name: '',
    address: '',
    city: '',
    state: '',
    zip: '',
    email: '',
  });
  const [items, setItems] = useState<InvoiceItem[]>([
    { id: '1', description: '', quantity: 1, rate: 0, amount: 0 }
  ]);
  const [notes, setNotes] = useState('');
  const [taxRate, setTaxRate] = useState(0.08);
  const loadImageAsBase64 = (url: string): Promise<string> => {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('Failed to get canvas context'));
          return;
        }
        canvas.width = img.width;
        canvas.height = img.height;
        ctx.drawImage(img, 0, 0);
        resolve(canvas.toDataURL('image/png'));
      };
      img.onerror = () => reject(new Error('Failed to load image'));
      img.src = url;
    });
  };
  
  // Load company info from profile
  useEffect(() => {
    if (user) {
      loadCompanyFromProfile();
    }
  }, [user]);
  
  const logoInputRef = useRef<HTMLInputElement>(null);

  const loadCompanyFromProfile = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user?.id)
        .maybeSingle();

      if (error) throw error;
      
      if (data) {
        const logoUrl = data.logo_url ? supabase.storage.from('user-logos').getPublicUrl(data.logo_url).data.publicUrl : '';
        setCompanyInfo(prev => ({
          ...prev,
          name: data.company || '',
          address: data.address || '',
          city: data.city || '',
          state: data.state || '',
          zip: data.zip_code || '',
          phone: data.phone || '',
          email: data.email || '',
          logo: logoUrl,
        }));
      }
    } catch (error) {
      console.error('Error loading company info:', error);
    }
  };

  const addItem = () => {
    const newItem: InvoiceItem = {
      id: Date.now().toString(),
      description: '',
      quantity: 1,
      rate: 0,
      amount: 0
    };
    setItems([...items, newItem]);
  };

  const removeItem = (id: string) => {
    setItems(items.filter(item => item.id !== id));
  };

  const updateItem = (id: string, field: keyof InvoiceItem, value: string | number) => {
    setItems(items.map(item => {
      if (item.id === id) {
        const updatedItem = { ...item, [field]: value };
        if (field === 'quantity' || field === 'rate') {
          updatedItem.amount = Number(updatedItem.quantity) * Number(updatedItem.rate);
        }
        return updatedItem;
      }
      return item;
    }));
  };

  const handleLogoUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) {
        toast.error('Logo file size must be less than 2MB');
        return;
      }
  
      try {
        const fileExt = file.name.split('.').pop();
        const fileName = `${user?.id}.${fileExt}`;
  
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('user-logos')
          .upload(fileName, file, {
            cacheControl: '3600',
            upsert: true
          });
  
        if (uploadError) throw uploadError;
  
        const { error: updateError } = await supabase
          .from('profiles')
          .update({ logo_url: fileName })
          .eq('id', user?.id);
  
        if (updateError) throw updateError;
  
        const publicUrl = supabase.storage.from('user-logos').getPublicUrl(fileName).data.publicUrl;
        setCompanyInfo(prev => ({
          ...prev,
          logo: publicUrl
        }));
        toast.success('Logo uploaded successfully');
      } catch (error) {
        console.error('Error uploading logo:', error);
        toast.error('Failed to upload logo');
      }
    }
  };

  const calculateSubtotal = () => {
    return items.reduce((sum, item) => sum + item.amount, 0);
  };

  const calculateTax = (subtotal: number) => {
    return subtotal * taxRate;
  };

  const calculateTotal = () => {
    const subtotal = calculateSubtotal();
    const tax = calculateTax(subtotal);
    return subtotal + tax;
  };

  const generateInvoice = async () => {
    try {
      const doc = new jsPDF();
      let yPosition = 20;
  
      // Add logo if available
      if (companyInfo.logo) {
        try {
          const logoBase64 = await loadImageAsBase64(companyInfo.logo);
          doc.addImage(logoBase64, 'PNG', 15, yPosition, 30, 15);
          yPosition += 20;
        } catch (imgError) {
          console.warn('Could not add logo to PDF:', imgError);
        }
      }
  
      // Company information
      doc.setFontSize(16);
      doc.text(companyInfo.name, 50, yPosition);
      yPosition += 10;
  
      doc.setFontSize(10);
      doc.text(companyInfo.address, 50, yPosition);
      yPosition += 7;
      doc.text(`${companyInfo.city}, ${companyInfo.state} ${companyInfo.zip}`, 50, yPosition);
      yPosition += 7;
      doc.text(companyInfo.phone, 50, yPosition);
      yPosition += 7;
      doc.text(companyInfo.email, 50, yPosition);
      yPosition += 15;
  
      // Invoice details
      doc.setFontSize(12);
      doc.text(`Invoice #${invoiceNumber}`, 140, 30);
      doc.text(`Date: ${invoiceDate}`, 140, 40);
      const due = dueDate || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
      doc.text(`Due Date: ${due}`, 140, 50);
  
      // Bill To
      yPosition = 80;
      doc.setFontSize(14);
      doc.text('Bill To:', 15, yPosition);
      yPosition += 10;
  
      doc.setFontSize(10);
      doc.text(clientInfo.name, 15, yPosition);
      yPosition += 7;
      doc.text(`${clientInfo.address}, ${clientInfo.city}, ${clientInfo.state} ${clientInfo.zip}`, 15, yPosition);
      yPosition += 7;
      doc.text(clientInfo.email, 15, yPosition);
      yPosition += 15;
  
      // Line items header
      doc.setFontSize(12);
      doc.text('Description', 15, yPosition);
      doc.text('Qty', 90, yPosition);
      doc.text('Rate', 110, yPosition);
      doc.text('Amount', 140, yPosition);
      yPosition += 10;
  
      // Line items
      const filteredItems = items.filter(item => item.description.trim());
      let subtotal = 0;
      filteredItems.forEach(item => {
        doc.setFontSize(10);
        const descLines = doc.splitTextToSize(item.description, 75);
        doc.text(descLines, 15, yPosition);
        
        doc.text(item.quantity.toString(), 90, yPosition);
        doc.text(`$${item.rate.toFixed(2)}`, 110, yPosition);
        doc.text(`$${item.amount.toFixed(2)}`, 140, yPosition);
        
        subtotal += item.amount;
        yPosition += 10;
        
        if (yPosition > 250 && filteredItems.indexOf(item) < filteredItems.length - 1) {
          doc.addPage();
          yPosition = 20;
        }
      });
  
      // Totals
      yPosition += 10;
      const tax = subtotal * taxRate;
      const total = subtotal + tax;
  
      doc.setFontSize(12);
      doc.text(`Subtotal: $${subtotal.toFixed(2)}`, 110, yPosition, { align: 'right' });
      yPosition += 10;
      doc.text(`Tax (${(taxRate * 100).toFixed(1)}%): $${tax.toFixed(2)}`, 110, yPosition, { align: 'right' });
      yPosition += 10;
      doc.setFont('helvetica', 'bold');
      doc.text(`Total: $${total.toFixed(2)}`, 110, yPosition, { align: 'right' });
      doc.setFont('helvetica', 'normal');
  
      // Notes
      if (notes.trim()) {
        yPosition += 20;
        doc.setFontSize(12);
        doc.text('Notes:', 15, yPosition);
        yPosition += 10;
        doc.setFontSize(10);
        const noteLines = doc.splitTextToSize(notes, 180);
        noteLines.forEach(line => {
          doc.text(line, 15, yPosition);
          yPosition += 7;
          if (yPosition > 280) {
            doc.addPage();
            yPosition = 20;
          }
        });
      }
  
      // Generate PDF blob for upload
      const pdfBlob = doc.output('blob');
      const fileName = `invoice_${invoiceNumber}_${Date.now()}.pdf`;
  
      // Upload to Supabase storage
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('generated_documents')
        .upload(fileName, pdfBlob, {
          contentType: 'application/pdf',
          upsert: false
        });
  
      if (uploadError) throw uploadError;
  
      const filePath = uploadData.path;
  
      // Insert into generated_documents table
      const insertData = {
        user_id: user?.id,
        document_type: 'invoice',
        document_category: 'invoices',
        title: `Invoice #${invoiceNumber}`,
        content: '', // PDF, so no text content
        client_name: clientInfo.name,
        amount: total,
        file_path: filePath
      };
  
      const { data: docData, error: insertError } = await supabase
        .from('generated_documents')
        .insert(insertData)
        .select()
        .single();
  
      if (insertError) {
        console.error('Error saving to database:', insertError);
        // Continue with download even if DB save fails
      }
  
      // Download the PDF
      doc.save(`Invoice_${invoiceNumber}.pdf`);
      toast.success('PDF Invoice generated, saved, and downloaded');
    } catch (error) {
      console.error('Error generating PDF invoice:', error);
      toast.error('Failed to generate PDF invoice');
    }
  };

  const saveTemplate = () => {
    const template = {
      companyInfo,
      notes,
      items: items.filter(item => item.description)
    };
    localStorage.setItem('invoiceTemplate', JSON.stringify(template));
    toast.success('Invoice template saved successfully');
  };

  const loadTemplate = () => {
    const saved = localStorage.getItem('invoiceTemplate');
    if (saved) {
      const template = JSON.parse(saved);
      setCompanyInfo(template.companyInfo || companyInfo);
      setNotes(template.notes || '');
      if (template.items && template.items.length > 0) {
        setItems(template.items);
      }
      toast.success('Invoice template loaded successfully');
    } else {
      toast.error('No saved template found');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">Invoice Generator</h2>
          <p className="text-muted-foreground">Create professional invoices for your business</p>
        </div>
        <div className="flex gap-2">
          <Button onClick={loadCompanyFromProfile} variant="ghost" size="sm">
            <Upload className="h-4 w-4 mr-2" />
            Load from Profile
          </Button>
          <Button onClick={loadTemplate} variant="outline">Load Template</Button>
          <Button onClick={saveTemplate} variant="outline">Save Template</Button>
          <Button onClick={generateInvoice}>
            <Download className="h-4 w-4 mr-2" />
            Generate PDF Invoice
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Company Information */}
        <Card>
          <CardHeader>
            <CardTitle>Your Company Information</CardTitle>
            <CardDescription>Enter your business details</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-4">
              <div className="flex-1">
                <Label htmlFor="companyName">Company Name</Label>
                <Input
                  id="companyName"
                  value={companyInfo.name}
                  onChange={(e) => setCompanyInfo(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="Your Company Name"
                />
              </div>
              <div>
                <Label>Logo</Label>
                <div className="flex items-center gap-2">
                  {companyInfo.logo && (
                    <img src={companyInfo.logo} alt="Logo" className="h-12 w-12 object-contain border rounded" />
                  )}
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => logoInputRef.current?.click()}
                  >
                    <Upload className="h-4 w-4 mr-2" />
                    Upload
                  </Button>
                  <input
                    ref={logoInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleLogoUpload}
                    className="hidden"
                  />
                </div>
              </div>
            </div>
            
            <div>
              <Label htmlFor="companyAddress">Address</Label>
              <Input
                id="companyAddress"
                value={companyInfo.address}
                onChange={(e) => setCompanyInfo(prev => ({ ...prev, address: e.target.value }))}
                placeholder="123 Business St"
              />
            </div>
            
            <div className="grid grid-cols-3 gap-2">
              <div>
                <Label htmlFor="companyCity">City</Label>
                <Input
                  id="companyCity"
                  value={companyInfo.city}
                  onChange={(e) => setCompanyInfo(prev => ({ ...prev, city: e.target.value }))}
                  placeholder="City"
                />
              </div>
              <div>
                <Label htmlFor="companyState">State</Label>
                <Input
                  id="companyState"
                  value={companyInfo.state}
                  onChange={(e) => setCompanyInfo(prev => ({ ...prev, state: e.target.value }))}
                  placeholder="State"
                />
              </div>
              <div>
                <Label htmlFor="companyZip">ZIP</Label>
                <Input
                  id="companyZip"
                  value={companyInfo.zip}
                  onChange={(e) => setCompanyInfo(prev => ({ ...prev, zip: e.target.value }))}
                  placeholder="ZIP"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label htmlFor="companyPhone">Phone</Label>
                <Input
                  id="companyPhone"
                  value={companyInfo.phone}
                  onChange={(e) => setCompanyInfo(prev => ({ ...prev, phone: e.target.value }))}
                  placeholder="(555) 123-4567"
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
            </div>
          </CardContent>
        </Card>

        {/* Client Information */}
        <Card>
          <CardHeader>
            <CardTitle>Bill To</CardTitle>
            <CardDescription>Enter client details</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
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
              <Label htmlFor="clientAddress">Address</Label>
              <Input
                id="clientAddress"
                value={clientInfo.address}
                onChange={(e) => setClientInfo(prev => ({ ...prev, address: e.target.value }))}
                placeholder="123 Client St"
              />
            </div>
            
            <div className="grid grid-cols-3 gap-2">
              <div>
                <Label htmlFor="clientCity">City</Label>
                <Input
                  id="clientCity"
                  value={clientInfo.city}
                  onChange={(e) => setClientInfo(prev => ({ ...prev, city: e.target.value }))}
                  placeholder="City"
                />
              </div>
              <div>
                <Label htmlFor="clientState">State</Label>
                <Input
                  id="clientState"
                  value={clientInfo.state}
                  onChange={(e) => setClientInfo(prev => ({ ...prev, state: e.target.value }))}
                  placeholder="State"
                />
              </div>
              <div>
                <Label htmlFor="clientZip">ZIP</Label>
                <Input
                  id="clientZip"
                  value={clientInfo.zip}
                  onChange={(e) => setClientInfo(prev => ({ ...prev, zip: e.target.value }))}
                  placeholder="ZIP"
                />
              </div>
            </div>

            <div>
              <Label htmlFor="clientEmail">Email</Label>
              <Input
                id="clientEmail"
                type="email"
                value={clientInfo.email}
                onChange={(e) => setClientInfo(prev => ({ ...prev, email: e.target.value }))}
                placeholder="client@email.com"
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label htmlFor="invoiceDate">Invoice Date</Label>
                <Input
                  id="invoiceDate"
                  type="date"
                  value={invoiceDate}
                  onChange={(e) => setInvoiceDate(e.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="dueDate">Due Date</Label>
                <Input
                  id="dueDate"
                  type="date"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Invoice Items */}
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <div>
              <CardTitle>Invoice Items</CardTitle>
              <CardDescription>Add products or services</CardDescription>
            </div>
            <Button onClick={addItem}>
              <Plus className="h-4 w-4 mr-2" />
              Add Item
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {items.map((item, index) => (
              <div key={item.id} className="grid grid-cols-12 gap-2 items-end">
                <div className="col-span-5">
                  <Label>Description</Label>
                  <Input
                    value={item.description}
                    onChange={(e) => updateItem(item.id, 'description', e.target.value)}
                    placeholder="Service or product description"
                  />
                </div>
                <div className="col-span-2">
                  <Label>Quantity</Label>
                  <Input
                    type="number"
                    value={item.quantity}
                    onChange={(e) => updateItem(item.id, 'quantity', Number(e.target.value))}
                    min="1"
                  />
                </div>
                <div className="col-span-2">
                  <Label>Rate</Label>
                  <Input
                    type="number"
                    value={item.rate}
                    onChange={(e) => updateItem(item.id, 'rate', Number(e.target.value))}
                    min="0"
                    step="0.01"
                    placeholder="0.00"
                  />
                </div>
                <div className="col-span-2">
                  <Label>Amount</Label>
                  <div className="text-lg font-medium p-2">
                    ${item.amount.toFixed(2)}
                  </div>
                </div>
                <div className="col-span-1">
                  {items.length > 1 && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => removeItem(item.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Tax Rate */}
          <div className="flex justify-between items-center mt-4">
            <Label htmlFor="taxRate">Tax Rate (%)</Label>
            <Input
              id="taxRate"
              type="number"
              step="0.01"
              value={taxRate * 100}
              onChange={(e) => setTaxRate(Number(e.target.value) / 100)}
              className="w-24"
              placeholder="8.0"
            />
          </div>

          {/* Totals */}
          <div className="mt-8 space-y-2 max-w-sm ml-auto">
            <div className="flex justify-between">
              <span>Subtotal:</span>
              <span>${calculateSubtotal().toFixed(2)}</span>
            </div>
            <div className="flex justify-between">
              <span>Tax ({(taxRate * 100).toFixed(1)}%):</span>
              <span>${calculateTax(calculateSubtotal()).toFixed(2)}</span>
            </div>
            <div className="flex justify-between font-bold text-lg border-t pt-2">
              <span>Total:</span>
              <span>${calculateTotal().toFixed(2)}</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Notes */}
      <Card>
        <CardHeader>
          <CardTitle>Notes</CardTitle>
          <CardDescription>Additional information for your client</CardDescription>
        </CardHeader>
        <CardContent>
          <Textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Payment terms, thank you message, etc."
            rows={4}
          />
        </CardContent>
      </Card>
    </div>
  );
};

export default InvoiceGenerator;