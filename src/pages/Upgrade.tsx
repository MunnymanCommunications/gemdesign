import Layout from '@/components/layout/Layout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useNavigate } from 'react-router-dom';

const UpgradePage = () => {
  const navigate = useNavigate();

  return (
    <Layout>
      <div className="flex items-center justify-center h-full">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>Upgrade to Pro</CardTitle>
            <CardDescription>You have reached your usage limit for the Satellite Camera Assessment tool.</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="mb-4">Upgrade to a Pro account to get more uses and unlock additional features.</p>
            <Button onClick={() => navigate('/subscription')}>Upgrade Now</Button>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
};

export default UpgradePage;