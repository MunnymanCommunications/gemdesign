import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useTheme } from '@/contexts/ThemeContext';
import { useAuth } from '@/hooks/useAuth';
import Layout from '@/components/layout/Layout';
import SEO from '@/components/seo/SEO';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { 
  Palette, 
  Upload,
  Eye,
  Save,
  Smartphone,
  Monitor,
  Trash2,
  RefreshCw
} from 'lucide-react';

interface UserTheme {
  id?: string;
  user_id: string;
  logo_url?: string;
  primary_color: string;
  secondary_color: string;
  accent_color: string;
  background_color: string;
  text_color: string;
  created_at?: string;
  updated_at?: string;
}

const Theme = () => {
  const { user } = useAuth();
  const { theme, setTheme, loadTheme } = useTheme();
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [previewMode, setPreviewMode] = useState<'desktop' | 'mobile'>('desktop');

  const presetThemes = [
    {
      name: 'Purple Gradient',
      primary_color: '#8b5cf6',
      secondary_color: '#a855f7',
      accent_color: '#ec4899',
      background_color: '#ffffff',
      text_color: '#1f2937'
    },
    {
      name: 'Ocean Blue',
      primary_color: '#0ea5e9',
      secondary_color: '#0284c7',
      accent_color: '#06b6d4',
      background_color: '#ffffff',
      text_color: '#1e293b'
    },
    {
      name: 'Forest Green',
      primary_color: '#10b981',
      secondary_color: '#059669',
      accent_color: '#34d399',
      background_color: '#ffffff',
      text_color: '#1f2937'
    },
    {
      name: 'Sunset Orange',
      primary_color: '#f97316',
      secondary_color: '#ea580c',
      accent_color: '#fb923c',
      background_color: '#ffffff',
      text_color: '#1f2937'
    },
    {
      name: 'Dark Mode',
      primary_color: '#8b5cf6',
      secondary_color: '#a855f7',
      accent_color: '#ec4899',
      background_color: '#0f172a',
      text_color: '#f8fafc'
    }
  ];


  const handleColorChange = (colorType: keyof UserTheme, value: string) => {
    setTheme({ ...theme, [colorType]: value });
  };

  const applyPresetTheme = (preset: any) => {
    const newTheme = {
      ...theme,
      primary_color: preset.primary_color,
      secondary_color: preset.secondary_color,
      accent_color: preset.accent_color,
      background_color: preset.background_color,
      text_color: preset.text_color,
    };
    setTheme(newTheme);
    toast.success(`Applied ${preset.name} theme`);
  };

  const handleLogoUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) { // 2MB limit
        toast.error('Logo file must be smaller than 2MB');
        return;
      }
      setLogoFile(file);
      
      // Create preview URL
      const reader = new FileReader();
      reader.onload = (e) => {
        if (e.target?.result) {
          setTheme({ ...theme, logo_url: e.target!.result as string });
        }
      };
      reader.readAsDataURL(file);
      
      toast.success('Logo selected for upload');
    }
  };

  const saveTheme = async () => {
    if (!user) return;

    setSaving(true);
    try {
      let logoUrl = theme.logo_url;

      if (logoFile) {
        const fileExt = logoFile.name.split('.').pop();
        const fileName = `${user.id}/logo.${fileExt}`;
        
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('theme_assets')
          .upload(fileName, logoFile, { upsert: true });

        if (uploadError) {
          throw new Error('Failed to upload logo');
        }

        const { data: urlData } = supabase.storage
          .from('theme_assets')
          .getPublicUrl(uploadData.path);
        
        logoUrl = urlData.publicUrl;
      }

      const themeToSave = { ...theme, user_id: user.id, logo_url: logoUrl };
      
      const { error } = await supabase
        .from('user_themes')
        .upsert(themeToSave, { onConflict: 'user_id' });

      if (error) {
        throw new Error('Failed to save theme');
      }

      setTheme(themeToSave);
      
      setLogoFile(null);
      toast.success('Theme saved successfully!');
      console.log('Theme saved:', themeToSave);
    } catch (error) {
      console.error('Error saving theme:', error);
      toast.error('Failed to save theme');
    } finally {
      setSaving(false);
    }
  };

  const removeLogo = () => {
    setTheme({ ...theme, logo_url: undefined });
    setLogoFile(null);
    toast.success('Logo removed');
  };

  const resetToDefault = () => {
    const defaultTheme = {
      user_id: user?.id || '',
      primary_color: '#8b5cf6',
      secondary_color: '#a855f7',
      accent_color: '#ec4899',
      background_color: '#ffffff',
      text_color: '#1f2937',
      logo_url: undefined,
    };
    setTheme(defaultTheme);
    setLogoFile(null);
    toast.success('Reset to default theme');
  };

  if (loading) {
    return (
      <Layout>
        <div className="max-w-6xl mx-auto">
          <div className="text-center py-8">
            <h2 className="text-2xl font-semibold mb-2">Loading Theme Settings...</h2>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <SEO
        title="Theme Customization — DesignR AI"
        description="Customize your personal theme with colors and logo"
        canonical="/theme"
      />
      <div className="max-w-6xl mx-auto space-y-6">
        <header className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold">Theme Customization</h1>
            <p className="text-muted-foreground mt-2">
              Personalize your platform experience with custom colors and logo
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={resetToDefault}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Reset
            </Button>
            <Button onClick={saveTheme} disabled={saving}>
              <Save className="h-4 w-4 mr-2" />
              {saving ? 'Saving...' : 'Save Theme'}
            </Button>
          </div>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Customization Panel */}
          <div className="space-y-6">
            {/* Logo Upload */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Upload className="h-5 w-5" />
                  Logo
                </CardTitle>
                <CardDescription>Upload your personal or company logo</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {theme.logo_url && (
                  <div className="flex items-center gap-4">
                    <img 
                      src={theme.logo_url} 
                      alt="Current logo" 
                      className="h-12 w-12 object-contain rounded border"
                    />
                    <Button variant="outline" size="sm" onClick={removeLogo}>
                      <Trash2 className="h-4 w-4 mr-2" />
                      Remove
                    </Button>
                  </div>
                )}
                
                <div>
                  <Label htmlFor="logo-upload">Upload New Logo</Label>
                  <Input
                    id="logo-upload"
                    type="file"
                    accept="image/*"
                    onChange={handleLogoUpload}
                    className="mt-1"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    PNG, JPG, SVG up to 2MB. Recommended: 200x200px
                  </p>
                </div>
                
                {logoFile && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Upload className="h-4 w-4" />
                    Ready to upload: {logoFile.name}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Color Customization */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Palette className="h-5 w-5" />
                  Colors
                </CardTitle>
                <CardDescription>Customize your theme colors</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="primary">Primary Color</Label>
                    <div className="flex gap-2">
                      <Input
                        id="primary"
                        type="color"
                        value={theme.primary_color}
                        onChange={(e) => handleColorChange('primary_color', e.target.value)}
                        className="w-16 h-10"
                      />
                      <Input
                        value={theme.primary_color}
                        onChange={(e) => handleColorChange('primary_color', e.target.value)}
                        placeholder="#8b5cf6"
                      />
                    </div>
                  </div>
                  
                  <div>
                    <Label htmlFor="secondary">Secondary Color</Label>
                    <div className="flex gap-2">
                      <Input
                        id="secondary"
                        type="color"
                        value={theme.secondary_color}
                        onChange={(e) => handleColorChange('secondary_color', e.target.value)}
                        className="w-16 h-10"
                      />
                      <Input
                        value={theme.secondary_color}
                        onChange={(e) => handleColorChange('secondary_color', e.target.value)}
                        placeholder="#a855f7"
                      />
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="accent">Accent Color</Label>
                    <div className="flex gap-2">
                      <Input
                        id="accent"
                        type="color"
                        value={theme.accent_color}
                        onChange={(e) => handleColorChange('accent_color', e.target.value)}
                        className="w-16 h-10"
                      />
                      <Input
                        value={theme.accent_color}
                        onChange={(e) => handleColorChange('accent_color', e.target.value)}
                        placeholder="#ec4899"
                      />
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="background">Background Color</Label>
                    <div className="flex gap-2">
                      <Input
                        id="background"
                        type="color"
                        value={theme.background_color}
                        onChange={(e) => handleColorChange('background_color', e.target.value)}
                        className="w-16 h-10"
                      />
                      <Input
                        value={theme.background_color}
                        onChange={(e) => handleColorChange('background_color', e.target.value)}
                        placeholder="#ffffff"
                      />
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Preset Themes */}
            <Card>
              <CardHeader>
                <CardTitle>Preset Themes</CardTitle>
                <CardDescription>Quick start with pre-designed color schemes</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 gap-2">
                  {presetThemes.map((preset, index) => (
                    <Button
                      key={index}
                      variant="outline"
                      className="justify-start h-auto p-3"
                      onClick={() => applyPresetTheme(preset)}
                    >
                      <div className="flex items-center gap-3">
                        <div className="flex gap-1">
                          <div 
                            className="w-4 h-4 rounded-full border"
                            style={{ backgroundColor: preset.primary_color }}
                          />
                          <div 
                            className="w-4 h-4 rounded-full border"
                            style={{ backgroundColor: preset.secondary_color }}
                          />
                          <div 
                            className="w-4 h-4 rounded-full border"
                            style={{ backgroundColor: preset.accent_color }}
                          />
                        </div>
                        <span className="font-medium">{preset.name}</span>
                      </div>
                    </Button>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Preview Panel */}
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Eye className="h-5 w-5" />
                  Preview
                </CardTitle>
                <CardDescription>See how your theme will look</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex gap-2">
                    <Button 
                      variant={previewMode === 'desktop' ? 'default' : 'outline'} 
                      size="sm"
                      onClick={() => setPreviewMode('desktop')}
                    >
                      <Monitor className="h-4 w-4 mr-2" />
                      Desktop
                    </Button>
                    <Button 
                      variant={previewMode === 'mobile' ? 'default' : 'outline'} 
                      size="sm"
                      onClick={() => setPreviewMode('mobile')}
                    >
                      <Smartphone className="h-4 w-4 mr-2" />
                      Mobile
                    </Button>
                  </div>
                  
                  <div className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-4 bg-muted/5">
                    <div 
                      className={`mx-auto bg-white rounded-lg shadow-lg overflow-hidden ${
                        previewMode === 'mobile' ? 'max-w-sm' : 'max-w-lg'
                      }`}
                      style={{ backgroundColor: theme.background_color, color: theme.text_color }}
                    >
                      <div 
                        className="h-3" 
                        style={{ backgroundColor: theme.primary_color }}
                      />
                      <div className="p-6">
                        <div className="flex items-center gap-3 mb-4">
                          {theme.logo_url && (
                            <img 
                              src={theme.logo_url} 
                              alt="Logo" 
                              className="h-8 w-8 object-contain"
                            />
                          )}
                          <h3 className="text-lg font-semibold">DesignR AI Platform</h3>
                        </div>
                        <p className="text-sm opacity-75 mb-4">
                          Welcome to your personalized AI assistant platform
                        </p>
                        <div className="space-y-2">
                          <div 
                            className="h-10 rounded text-white flex items-center justify-center text-sm font-medium"
                            style={{ backgroundColor: theme.primary_color }}
                          >
                            Primary Button
                          </div>
                          <div 
                            className="h-10 rounded border-2 text-sm flex items-center justify-center font-medium"
                            style={{ 
                              borderColor: theme.secondary_color,
                              color: theme.secondary_color
                            }}
                          >
                            Secondary Button
                          </div>
                          <div 
                            className="h-10 rounded text-white flex items-center justify-center text-sm font-medium"
                            style={{ backgroundColor: theme.accent_color }}
                          >
                            Accent Button
                          </div>
                        </div>
                        <div className="mt-4 pt-4 border-t opacity-60">
                          <div className="flex items-center justify-between text-xs">
                            <span>Sample card content</span>
                            <Badge 
                              className="text-white"
                              style={{ backgroundColor: theme.primary_color }}
                            >
                              Active
                            </Badge>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="text-xs text-muted-foreground bg-yellow-50 dark:bg-yellow-900/20 p-3 rounded border">
                    <strong>Note:</strong> Theme customization is currently in preview mode. 
                    Your theme settings are saved locally and will be fully integrated with the 
                    platform in the next update.
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default Theme;