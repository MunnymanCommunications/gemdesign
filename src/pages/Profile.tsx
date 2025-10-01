import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import Layout from '@/components/layout/Layout';
import SEO from '@/components/seo/SEO';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { User, Mail, Building, Save, Key, Shield, Upload } from 'lucide-react';
import { useRoles } from '@/hooks/useRoles';
import { Switch } from '@/components/ui/switch';

interface Profile {
  id: string;
  email: string;
  full_name: string;
  company: string;
  website: string;
  phone: string;
  address: string;
  city: string;
  state: string;
  zip_code: string;
  business_type: string;
  tax_id: string;
  created_at: string;
  updated_at: string;
  has_free_access: boolean;
  logo_url?: string | null;
}

const Profile = () => {
  console.log('Profile component rendering - start'); // Debug log
  const { user } = useAuth();
  console.log('Profile - user:', user); // Debug log
  const { isAdmin } = useRoles();
  console.log('Profile - isAdmin:', isAdmin); // Debug log
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);

  useEffect(() => {
    console.log('Profile useEffect - user changed:', user); // Debug log
    if (user) {
      fetchProfile();
    }
  }, [user]);

  const fetchProfile = async () => {
    console.log('Profile - fetchProfile called'); // Debug log
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user?.id)
        .maybeSingle();
      
      console.log('Profile - fetch data:', data, 'error:', error); // Debug log
  
      if (error) {
        console.log('Profile - fetch error, code:', error.code); // Debug log
        // If profile doesn't exist, create one
        if (error.code === 'PGRST116' || !data) {
          await createProfile();
        } else {
          throw error;
        }
      } else if (data) {
        console.log('Profile - setting profile:', data); // Debug log
        setProfile(data);
        setLogoPreview(data.logo_url || null);
      } else {
        console.log('Profile - no data, creating profile'); // Debug log
        await createProfile();
      }
    } catch (error) {
      console.error('Error fetching profile:', error);
      toast.error('Failed to load profile');
    } finally {
      console.log('Profile - fetch finally, loading false'); // Debug log
      setLoading(false);
    }
  };

  const createProfile = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .insert({
          id: user?.id,
          email: user?.email || '',
          full_name: '',
          company: '',
          website: '',
          phone: '',
          address: '',
          city: '',
          state: '',
          zip_code: '',
          business_type: '',
          tax_id: ''
        })
        .select()
        .single();

      if (error) throw error;
      setProfile(data);
      setLogoPreview(data.logo_url || null);
    } catch (error) {
      console.error('Error creating profile:', error);
      toast.error('Failed to create profile');
    }
  };

  const updateProfile = async () => {
    console.log('Profile - updateProfile called'); // Debug log
    if (!profile) return;
  
    setSaving(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          full_name: profile.full_name,
          company: profile.company,
          website: profile.website,
          phone: profile.phone,
          address: profile.address,
          city: profile.city,
          state: profile.state,
          zip_code: profile.zip_code,
          business_type: profile.business_type,
          tax_id: profile.tax_id,
          logo_url: profile.logo_url
        })
        .eq('id', user?.id);
      
      console.log('Profile - update error:', error); // Debug log
  
      if (error) throw error;
      toast.success('Profile updated successfully');
    } catch (error) {
      console.error('Error updating profile:', error);
      toast.error('Failed to update profile');
    } finally {
      setSaving(false);
    }
  };

  const toggleFreeAccess = async () => {
    if (!profile) return;

    setSaving(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ has_free_access: !profile.has_free_access })
        .eq('id', user?.id);

      if (error) throw error;
      
      setProfile(prev => prev ? { ...prev, has_free_access: !prev.has_free_access } : null);
      toast.success('Free access status updated');
    } catch (error) {
      console.error('Error toggling free access:', error);
      toast.error('Failed to update free access status');
    } finally {
      setSaving(false);
    }
  };

  const getInitials = (name: string, email: string) => {
    if (name) {
      return name.split(' ').map(n => n[0]).join('').toUpperCase();
    }
    return email.charAt(0).toUpperCase();
  };

  if (loading) {
    return (
      <Layout>
        <div className="max-w-4xl mx-auto">
          <div className="text-center py-8">
            <h2 className="text-2xl font-semibold mb-2">Loading Profile...</h2>
          </div>
        </div>
      </Layout>
    );
  }

  if (!profile) {
    return (
      <Layout>
        <div className="max-w-4xl mx-auto">
          <div className="text-center py-8">
            <h2 className="text-2xl font-semibold mb-2">Profile Not Found</h2>
            <Button onClick={createProfile}>Create Profile</Button>
          </div>
        </div>
      </Layout>
    );
  }

  const handleLogoUpload = async (file: File) => {
    if (!file) return;
  
    setUploadingLogo(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${user?.id}.${fileExt}`;
  
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('logos')
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
  
      const publicUrl = supabase.storage.from('logos').getPublicUrl(fileName).data.publicUrl;
      setProfile(prev => prev ? { ...prev, logo_url: fileName } : null);
      setLogoPreview(publicUrl);
      toast.success('Logo uploaded successfully');
    } catch (error) {
      console.error('Error uploading logo:', error);
      toast.error('Failed to upload logo');
    } finally {
      setUploadingLogo(false);
      setLogoFile(null);
    }
  };

  const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setLogoFile(file);
      const reader = new FileReader();
      reader.onload = (e) => setLogoPreview(e.target?.result as string);
      reader.readAsDataURL(file);
    }
  };

  return (
    <Layout>
      <SEO
        title="Profile Settings — Design Rite AI"
        description="Manage your account, company, and preferences."
        canonical="/profile"
      />
      <div className="max-w-4xl mx-auto space-y-6">
        <header>
          <h1 className="text-3xl font-bold">Profile Settings</h1>
          <p className="text-muted-foreground mt-2">
            Manage your account information and preferences
          </p>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Profile Overview */}
          <Card className="lg:col-span-1">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="h-5 w-5" />
                Profile Overview
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="text-center">
                {logoPreview ? (
                  <img
                    src={logoPreview}
                    alt="Company Logo"
                    className="w-20 h-20 mx-auto mb-4 rounded-full object-cover border-2 border-border"
                  />
                ) : (
                  <Avatar className="w-20 h-20 mx-auto mb-4">
                    <AvatarFallback className="text-lg">
                      {getInitials(profile.full_name, profile.email)}
                    </AvatarFallback>
                  </Avatar>
                )}
                <h3 className="text-lg font-semibold">
                  {profile.full_name || 'No name set'}
                </h3>
                <p className="text-muted-foreground">{profile.email}</p>
                {profile.company && (
                  <Badge variant="secondary" className="mt-2">
                    {profile.company}
                  </Badge>
                )}
              </div>

              <div className="space-y-2 pt-4 border-t">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Member since</span>
                  <span className="text-sm">
                    {new Date(profile.created_at).toLocaleDateString()}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Last updated</span>
                  <span className="text-sm">
                    {new Date(profile.updated_at).toLocaleDateString()}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Logo Upload Section */}
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Upload className="h-5 w-5" />
                Company Logo
              </CardTitle>
              <CardDescription>
                Upload your company logo to use in documents and branding
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex flex-col md:flex-row gap-4 items-center">
                <div className="flex-1">
                  <Input
                    type="file"
                    accept="image/*"
                    onChange={handleLogoChange}
                    disabled={uploadingLogo}
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Supported formats: PNG, JPG, GIF. Max size: 2MB
                  </p>
                </div>
                {logoPreview && (
                  <img
                    src={logoPreview}
                    alt="Logo Preview"
                    className="h-16 w-16 object-contain rounded border"
                  />
                )}
                <Button
                  onClick={() => logoFile && handleLogoUpload(logoFile)}
                  disabled={!logoFile || uploadingLogo}
                  className="w-full md:w-auto"
                >
                  {uploadingLogo ? 'Uploading...' : 'Upload Logo'}
                </Button>
              </div>
              {profile.logo_url && !logoFile && (
                <div className="text-center">
                  <p className="text-sm text-muted-foreground">Current Logo:</p>
                  <img
                    src={profile.logo_url}
                    alt="Current Logo"
                    className="h-20 w-20 mx-auto object-contain rounded border mt-2"
                  />
                </div>
              )}
            </CardContent>
          </Card>

          {/* Personal Information */}
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="h-5 w-5" />
                Personal Information
              </CardTitle>
              <CardDescription>
                Update your personal details and contact information
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="email">Email Address</Label>
                  <Input
                    id="email"
                    type="email"
                    value={profile.email}
                    disabled
                    className="bg-muted"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Email cannot be changed
                  </p>
                </div>
                
                <div>
                  <Label htmlFor="fullName">Full Name</Label>
                  <Input
                    id="fullName"
                    value={profile.full_name}
                    onChange={(e) => setProfile(prev => prev ? { ...prev, full_name: e.target.value } : null)}
                    placeholder="Enter your full name"
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="company">Company Name</Label>
                <Input
                  id="company"
                  value={profile.company}
                  onChange={(e) => setProfile(prev => prev ? { ...prev, company: e.target.value } : null)}
                  placeholder="Enter your company name"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="website">Website</Label>
                  <Input
                    id="website"
                    value={profile.website || ''}
                    onChange={(e) => setProfile(prev => prev ? { ...prev, website: e.target.value } : null)}
                    placeholder="https://www.yourcompany.com"
                  />
                </div>
                
                <div>
                  <Label htmlFor="phone">Phone</Label>
                  <Input
                    id="phone"
                    value={profile.phone || ''}
                    onChange={(e) => setProfile(prev => prev ? { ...prev, phone: e.target.value } : null)}
                    placeholder="+1 (555) 123-4567"
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="address">Street Address</Label>
                <Input
                  id="address"
                  value={profile.address || ''}
                  onChange={(e) => setProfile(prev => prev ? { ...prev, address: e.target.value } : null)}
                  placeholder="123 Business Street"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <Label htmlFor="city">City</Label>
                  <Input
                    id="city"
                    value={profile.city || ''}
                    onChange={(e) => setProfile(prev => prev ? { ...prev, city: e.target.value } : null)}
                    placeholder="City"
                  />
                </div>
                
                <div>
                  <Label htmlFor="state">State</Label>
                  <Input
                    id="state"
                    value={profile.state || ''}
                    onChange={(e) => setProfile(prev => prev ? { ...prev, state: e.target.value } : null)}
                    placeholder="State"
                  />
                </div>
                
                <div>
                  <Label htmlFor="zipCode">ZIP Code</Label>
                  <Input
                    id="zipCode"
                    value={profile.zip_code || ''}
                    onChange={(e) => setProfile(prev => prev ? { ...prev, zip_code: e.target.value } : null)}
                    placeholder="12345"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="businessType">Business Type</Label>
                  <Input
                    id="businessType"
                    value={profile.business_type || ''}
                    onChange={(e) => setProfile(prev => prev ? { ...prev, business_type: e.target.value } : null)}
                    placeholder="e.g., LLC, Corporation, Partnership"
                  />
                </div>
                
                <div>
                  <Label htmlFor="taxId">Tax ID (Optional)</Label>
                  <Input
                    id="taxId"
                    value={profile.tax_id || ''}
                    onChange={(e) => setProfile(prev => prev ? { ...prev, tax_id: e.target.value } : null)}
                    placeholder="XX-XXXXXXX"
                  />
                </div>
              </div>

              <Button onClick={updateProfile} disabled={saving} className="w-full md:w-auto">
                <Save className="h-4 w-4 mr-2" />
                {saving ? 'Saving...' : 'Save Changes'}
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Preferences */}
        <Card>
          <CardHeader>
            <CardTitle>Preferences</CardTitle>
            <CardDescription>
              Customize your platform experience
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-medium">Analytics Tracking</h4>
                  <p className="text-sm text-muted-foreground">
                    Help us improve the platform with usage analytics
                  </p>
                </div>
                <Badge variant="secondary">Enabled</Badge>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Danger Zone */}
        <Card className="border-destructive">
          <CardHeader>
            <CardTitle className="text-destructive">Danger Zone</CardTitle>
            <CardDescription>
              Irreversible and destructive actions
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-medium">Delete Account</h4>
                  <p className="text-sm text-muted-foreground">
                    Permanently delete your account and all associated data
                  </p>
                </div>
                <Button variant="destructive" disabled>
                  Delete Account
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

      </div>
    </Layout>
  );
};

export default Profile;