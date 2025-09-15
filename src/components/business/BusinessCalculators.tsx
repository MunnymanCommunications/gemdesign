import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { DollarSign, Calculator, Target, Clock } from 'lucide-react';

const BusinessCalculators = () => {
  const [profitMargin, setProfitMargin] = useState({ costPrice: '', sellingPrice: '', result: 0 });
  const [tax, setTax] = useState({ grossIncome: '', taxRate: '', result: 0 });
  const [roi, setRoi] = useState({ initialInvestment: '', finalValue: '', result: 0 });
  const [breakEven, setBreakEven] = useState({ fixedCosts: '', pricePerUnit: '', variableCostPerUnit: '', result: 0 });

  const calculateProfitMargin = () => {
    const cost = parseFloat(profitMargin.costPrice);
    const selling = parseFloat(profitMargin.sellingPrice);
    
    if (cost > 0 && selling > 0) {
      const margin = ((selling - cost) / selling) * 100;
      setProfitMargin(prev => ({ ...prev, result: margin }));
    }
  };

  const calculateTax = () => {
    const gross = parseFloat(tax.grossIncome);
    const rate = parseFloat(tax.taxRate);
    
    if (gross > 0 && rate >= 0) {
      const netIncome = gross - (gross * (rate / 100));
      setTax(prev => ({ ...prev, result: netIncome }));
    }
  };

  const calculateROI = () => {
    const initial = parseFloat(roi.initialInvestment);
    const final = parseFloat(roi.finalValue);
    
    if (initial > 0 && final > 0) {
      const roiPercent = ((final - initial) / initial) * 100;
      setRoi(prev => ({ ...prev, result: roiPercent }));
    }
  };

  const calculateBreakEven = () => {
    const fixed = parseFloat(breakEven.fixedCosts);
    const price = parseFloat(breakEven.pricePerUnit);
    const variable = parseFloat(breakEven.variableCostPerUnit);
    
    if (fixed > 0 && price > 0 && variable >= 0 && price > variable) {
      const units = fixed / (price - variable);
      setBreakEven(prev => ({ ...prev, result: units }));
    }
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <DollarSign className="h-5 w-5" />
            Profit Margin Calculator
          </CardTitle>
          <CardDescription>Calculate your profit margins and markup</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="costPrice">Cost Price</Label>
              <Input 
                id="costPrice"
                type="number" 
                value={profitMargin.costPrice}
                onChange={(e) => setProfitMargin(prev => ({ ...prev, costPrice: e.target.value }))}
                placeholder="0.00" 
              />
            </div>
            <div>
              <Label htmlFor="sellingPrice">Selling Price</Label>
              <Input 
                id="sellingPrice"
                type="number" 
                value={profitMargin.sellingPrice}
                onChange={(e) => setProfitMargin(prev => ({ ...prev, sellingPrice: e.target.value }))}
                placeholder="0.00" 
              />
            </div>
          </div>
          <div className="p-4 bg-muted rounded-lg">
            <div className="text-2xl font-bold">{profitMargin.result.toFixed(2)}%</div>
            <div className="text-sm text-muted-foreground">Profit Margin</div>
          </div>
          <Button className="w-full" onClick={calculateProfitMargin}>Calculate</Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calculator className="h-5 w-5" />
            Tax Calculator
          </CardTitle>
          <CardDescription>Calculate taxes and net income</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="grossIncome">Gross Income</Label>
            <Input 
              id="grossIncome"
              type="number" 
              value={tax.grossIncome}
              onChange={(e) => setTax(prev => ({ ...prev, grossIncome: e.target.value }))}
              placeholder="0.00" 
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="taxRate">Tax Rate (%)</Label>
            <Input 
              id="taxRate"
              type="number" 
              value={tax.taxRate}
              onChange={(e) => setTax(prev => ({ ...prev, taxRate: e.target.value }))}
              placeholder="8.5" 
            />
          </div>
          <div className="p-4 bg-muted rounded-lg">
            <div className="text-2xl font-bold">${tax.result.toFixed(2)}</div>
            <div className="text-sm text-muted-foreground">Net Income</div>
          </div>
          <Button className="w-full" onClick={calculateTax}>Calculate</Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="h-5 w-5" />
            ROI Calculator
          </CardTitle>
          <CardDescription>Calculate return on investment</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="initialInvestment">Initial Investment</Label>
              <Input 
                id="initialInvestment"
                type="number" 
                value={roi.initialInvestment}
                onChange={(e) => setRoi(prev => ({ ...prev, initialInvestment: e.target.value }))}
                placeholder="0.00" 
              />
            </div>
            <div>
              <Label htmlFor="finalValue">Final Value</Label>
              <Input 
                id="finalValue"
                type="number" 
                value={roi.finalValue}
                onChange={(e) => setRoi(prev => ({ ...prev, finalValue: e.target.value }))}
                placeholder="0.00" 
              />
            </div>
          </div>
          <div className="p-4 bg-muted rounded-lg">
            <div className="text-2xl font-bold">{roi.result.toFixed(2)}%</div>
            <div className="text-sm text-muted-foreground">Return on Investment</div>
          </div>
          <Button className="w-full" onClick={calculateROI}>Calculate</Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Break-Even Calculator
          </CardTitle>
          <CardDescription>Calculate break-even point</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="fixedCosts">Fixed Costs</Label>
            <Input 
              id="fixedCosts"
              type="number" 
              value={breakEven.fixedCosts}
              onChange={(e) => setBreakEven(prev => ({ ...prev, fixedCosts: e.target.value }))}
              placeholder="0.00" 
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="pricePerUnit">Price per Unit</Label>
              <Input 
                id="pricePerUnit"
                type="number" 
                value={breakEven.pricePerUnit}
                onChange={(e) => setBreakEven(prev => ({ ...prev, pricePerUnit: e.target.value }))}
                placeholder="0.00" 
              />
            </div>
            <div>
              <Label htmlFor="variableCostPerUnit">Variable Cost per Unit</Label>
              <Input 
                id="variableCostPerUnit"
                type="number" 
                value={breakEven.variableCostPerUnit}
                onChange={(e) => setBreakEven(prev => ({ ...prev, variableCostPerUnit: e.target.value }))}
                placeholder="0.00" 
              />
            </div>
          </div>
          <div className="p-4 bg-muted rounded-lg">
            <div className="text-2xl font-bold">{Math.ceil(breakEven.result).toLocaleString()}</div>
            <div className="text-sm text-muted-foreground">Units to Break Even</div>
          </div>
          <Button className="w-full" onClick={calculateBreakEven}>Calculate</Button>
        </CardContent>
      </Card>
    </div>
  );
};

export default BusinessCalculators;