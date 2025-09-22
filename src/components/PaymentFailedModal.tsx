import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

const PaymentFailedModal = ({ open }: { open: boolean }) => {
  const redirectToCustomerPortal = () => {
    // Logic to redirect to Stripe customer portal
  };

  return (
    <AlertDialog open={open}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Payment Failed</AlertDialogTitle>
          <AlertDialogDescription>
            Your recent payment failed. Please update your billing information to continue using our services.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogAction onClick={redirectToCustomerPortal}>
            Update Billing Information
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};

export default PaymentFailedModal;