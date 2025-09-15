-- Create voltage_calculations table for storing calculation results
CREATE TABLE public.voltage_calculations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  calculation_type TEXT NOT NULL DEFAULT 'voltage_drop',
  wire_size TEXT,
  distance NUMERIC,
  current_amps NUMERIC,
  voltage_drop_calculated NUMERIC,
  voltage_drop_percentage NUMERIC,
  material TEXT DEFAULT 'copper',
  system_voltage NUMERIC DEFAULT 12,
  calculation_details JSONB,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.voltage_calculations ENABLE ROW LEVEL SECURITY;

-- Create policies for voltage_calculations
CREATE POLICY "Users can view their own calculations" 
ON public.voltage_calculations 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own calculations" 
ON public.voltage_calculations 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own calculations" 
ON public.voltage_calculations 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own calculations" 
ON public.voltage_calculations 
FOR DELETE 
USING (auth.uid() = user_id);

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_voltage_calculations_updated_at
BEFORE UPDATE ON public.voltage_calculations
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();