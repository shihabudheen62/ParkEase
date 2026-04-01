import React, { useState } from 'react';
import {
  PaymentElement,
  useStripe,
  useElements
} from '@stripe/react-stripe-js';
import { AutorenewRounded as Loader2, VerifiedUserRounded as ShieldCheck } from '@mui/icons-material';
import { toast } from 'sonner';

interface CheckoutFormProps {
  onSuccess: () => void;
  onCancel: () => void;
  amount: number;
  isMock?: boolean;
}

const CheckoutForm: React.FC<CheckoutFormProps> = ({ onSuccess, onCancel, amount, isMock = false }) => {
  const stripe = useStripe();
  const elements = useElements();
  const [isProcessing, setIsProcessing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleMockSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsProcessing(true);
    // Simulate a delay
    await new Promise(resolve => setTimeout(resolve, 1500));
    toast.success("Demo Payment successful!");
    onSuccess();
    setIsProcessing(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (isMock) {
      return handleMockSubmit(e);
    }

    if (!stripe || !elements) {
      return;
    }

    setIsProcessing(true);
    setErrorMessage(null);

    const { error, paymentIntent } = await stripe.confirmPayment({
      elements,
      confirmParams: {
        // No return_url needed for most payment methods if handled via state
        // but Stripe requires it for some. We'll use the current URL.
        return_url: window.location.href,
      },
      redirect: 'if_required',
    });

    if (error) {
      setErrorMessage(error.message || "An unexpected error occurred.");
      toast.error(error.message || "Payment failed");
    } else if (paymentIntent && paymentIntent.status === 'succeeded') {
      toast.success("Payment successful!");
      onSuccess();
    }

    setIsProcessing(false);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="bg-blue-50 p-4 rounded-2xl flex items-center gap-3 mb-6">
        <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center text-[#007AFF]">
          <ShieldCheck className="w-6 h-6" />
        </div>
        <div>
          <p className="text-xs font-bold text-blue-900">{isMock ? 'Demo Mode' : 'Secure Payment'}</p>
          <p className="text-[10px] text-blue-700 font-medium">
            {isMock ? 'Stripe is not configured. Using demo mode.' : 'Your transaction is encrypted and secure.'}
          </p>
        </div>
      </div>

      {isMock ? (
        <div className="p-6 bg-gray-50 rounded-2xl border border-gray-100 space-y-4">
          <div className="flex items-center justify-between text-xs font-bold text-gray-500">
            <span>Payment Method</span>
            <span className="text-gray-900">Demo Card (•••• 4242)</span>
          </div>
          <div className="h-px bg-gray-200" />
          <p className="text-[10px] text-gray-400 text-center italic">
            This is a simulated payment for demonstration purposes.
          </p>
        </div>
      ) : (
        <PaymentElement id="payment-element" />
      )}

      {errorMessage && (
        <div className="p-4 bg-red-50 text-red-600 text-xs font-bold rounded-xl border border-red-100">
          {errorMessage}
        </div>
      )}

      <div className="flex flex-col gap-3 pt-4">
        <button
          disabled={isProcessing || (!isMock && (!stripe || !elements))}
          className="w-full bg-[#007AFF] text-white font-bold py-4 rounded-full shadow-xl shadow-blue-100 flex items-center justify-center gap-2 active:scale-[0.98] transition-transform disabled:opacity-50"
        >
          {isProcessing ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              <span>{isMock ? 'Processing Demo...' : 'Processing...'}</span>
            </>
          ) : (
            `Pay ₹${amount.toFixed(2)}`
          )}
        </button>
        <button
          type="button"
          onClick={onCancel}
          disabled={isProcessing}
          className="w-full py-4 text-gray-500 font-bold text-sm active:scale-[0.98] transition-transform"
        >
          Cancel
        </button>
      </div>
    </form>
  );
};

export default CheckoutForm;
