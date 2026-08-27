import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  ArrowLeft, 
  CreditCard, 
  UserCheck, 
  Mail, 
  BookOpen, 
  ShieldCheck, 
  Lock, 
  Sparkles,
  AlertCircle
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { DEMO_PRODUCT } from '../../data/demoProduct';
import { createPaymentAttempt } from '../../services/paymentEvents';
import { PaymentMethodSelector } from './PaymentMethodSelector';
import { PaymentScenarioSelector } from './PaymentScenarioSelector';
import { DEFAULT_SCENARIO } from '../../data/paymentScenarios';
import { simulatePaymentOutcome } from '../../services/paymentOutcomeEngine';
import { createPaymentResultEvent } from '../../services/paymentResultEvents.js';
import { createRevenueRiskContext } from '../../services/revenueRisk.js';
import { calculateRecoveryPriority } from '../../services/recoveryPriority.js';
import { getDemoCustomerRecoverySignals } from '../../data/demoCustomerHistory.js';
import { createRecoveryAssessment } from '../../services/recoveryAssessment.js';
import { decideRecoveryAction } from '../../services/recoveryAgentDecision.js';
import { planRecoveryAction } from '../../services/recoveryActionPlanner.js';
import { generateRecoveryOutreachMessage } from '../../services/recoveryOutreachMessage.js';
import { executeRecoveryAction } from '../../services/recoveryActionExecutor.js';
import { createCustomerRecoveryNotification } from '../../services/customerRecoveryNotification.js';
import { createRetryAttemptMetadata, createRetryContext } from '../../services/paymentRetry.js';
import { createRecoveryOutcome } from '../../services/recoveryOutcome.js';
import { SimulatedPaymentForm } from './SimulatedPaymentForm';
import { PayButton } from './PayButton';
import { PaymentProcessing } from './PaymentProcessing';
import { PaymentResult } from './PaymentResult';

const INITIAL_FORM_DATA = {
  upiId: '',
  cardNumber: '',
  cardholderName: '',
  expiryDate: '',
  cvv: '',
  selectedBank: ''
};

export function PaymentAmountCard({ product = DEMO_PRODUCT, onContinue, onBack }) {
  const navigate = useNavigate();
  const { user } = useAuth();
  
  // Page state: 'IDLE' | 'PROCESSING' | 'WAITING_FOR_RESULT'
  const [paymentState, setPaymentState] = useState('IDLE');
  
  const [selectedScenario, setSelectedScenario] = useState(DEFAULT_SCENARIO);
  const [selectedMethod, setSelectedMethod] = useState(null);
  const [formData, setFormData] = useState(INITIAL_FORM_DATA);
  const [formErrors, setFormErrors] = useState({});
  const [lastAttemptEvent, setLastAttemptEvent] = useState(null);
  const [paymentOutcome, setPaymentOutcome] = useState(null);
  const [paymentResultEvent, setPaymentResultEvent] = useState(null);
  const [revenueRiskContext, setRevenueRiskContext] = useState(null);
  const [customerRecoverySignals, setCustomerRecoverySignals] = useState(null);
  const [recoveryPriority, setRecoveryPriority] = useState(null);
  const [recoveryAssessment, setRecoveryAssessment] = useState(null);
  const [recoveryDecision, setRecoveryDecision] = useState(null);
  const [recoveryActionPlan, setRecoveryActionPlan] = useState(null);
  const [recoveryOutreachMessage, setRecoveryOutreachMessage] = useState(null);
  const [recoveryExecution, setRecoveryExecution] = useState(null);
  const [customerNotification, setCustomerNotification] = useState(null);

  // Recovery outcome state
  const [recoveryOutcome, setRecoveryOutcome] = useState(null);
  const [firstFailedAttempt, setFirstFailedAttempt] = useState(null);
  const [firstFailedResult, setFirstFailedResult] = useState(null);

  // Retry tracking state
  const [retryCount, setRetryCount] = useState(0);
  const [retryOfAttemptId, setRetryOfAttemptId] = useState(null);
  const [isRetryAttempt, setIsRetryAttempt] = useState(false);

  const handleSimulateExecution = () => {
    if (recoveryExecution) return; // Prevent duplicate simulation
    if (recoveryActionPlan && recoveryOutreachMessage) {
      const result = executeRecoveryAction(recoveryActionPlan, recoveryOutreachMessage);
      setRecoveryExecution(result);
    }
  };

  const handleRetryNavigation = () => {
    // Preserve original attempt ID for correlation
    if (lastAttemptEvent?.id) {
      setRetryOfAttemptId(lastAttemptEvent.id);
    }
    setRetryCount(prev => prev + 1);
    setIsRetryAttempt(true);
    setSelectedScenario('SUCCESS'); // Primary demo default for retries

    // Reset result state to IDLE form without auto-submitting payment
    setPaymentState('IDLE');
    setPaymentOutcome(null);
    setPaymentResultEvent(null);
    setRevenueRiskContext(null);
    setCustomerRecoverySignals(null);
    setRecoveryPriority(null);
    setRecoveryAssessment(null);
    setRecoveryDecision(null);
    setRecoveryActionPlan(null);
    setRecoveryOutreachMessage(null);
    setRecoveryExecution(null);
    setCustomerNotification(null);
    setRecoveryOutcome(null);
  };

  const handleBack = () => {
    if (paymentState === 'PROCESSING') return; // Prevent navigation while actively processing
    if (onBack) {
      onBack();
    } else {
      navigate('/customer/checkout');
    }
  };

  const handleMethodChange = (newMethod) => {
    if (paymentState !== 'IDLE') return; // Lock method change during processing/waiting
    setSelectedMethod(newMethod);
    setFormData(INITIAL_FORM_DATA);
    setFormErrors({});
    setLastAttemptEvent(null);
  };

  const handleFieldChange = (field, value) => {
    if (paymentState !== 'IDLE') return;
    setFormData(prev => ({ ...prev, [field]: value }));
    // Clear error for edited field
    if (formErrors[field]) {
      setFormErrors(prev => {
        const updated = { ...prev };
        delete updated[field];
        return updated;
      });
    }
  };

  const validateSimulatedForm = () => {
    const errors = {};
    if (selectedMethod === 'UPI') {
      if (!formData.upiId.trim()) errors.upiId = 'UPI ID is required';
      else if (!formData.upiId.includes('@')) errors.upiId = 'Invalid UPI ID format (e.g. user@bank)';
    } else if (selectedMethod === 'CARD') {
      if (!formData.cardNumber.trim()) errors.cardNumber = 'Card number is required';
      else if (formData.cardNumber.replace(/\s/g, '').length < 16) errors.cardNumber = 'Card number must be 16 digits';
      
      if (!formData.cardholderName.trim()) errors.cardholderName = 'Cardholder name is required';
      
      if (!formData.expiryDate.trim()) errors.expiryDate = 'Expiry date is required';
      else if (!/^\d{2}\/\d{2}$/.test(formData.expiryDate)) errors.expiryDate = 'Format MM/YY required';

      if (!formData.cvv.trim()) errors.cvv = 'CVV is required';
      else if (formData.cvv.length < 3) errors.cvv = 'CVV must be 3 digits';
    } else if (selectedMethod === 'NET_BANKING') {
      if (!formData.selectedBank) errors.selectedBank = 'Please select a bank';
    }
    return errors;
  };

  const handlePayAttempt = async () => {
    if (paymentState !== 'IDLE' || !selectedMethod) return;

    // 1. Validate form fields
    const errors = validateSimulatedForm();
    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      return;
    }

    setFormErrors({});
    setPaymentOutcome(null);
    setPaymentResultEvent(null);
    setRevenueRiskContext(null);
    setCustomerRecoverySignals(null);
    setRecoveryPriority(null);
    setRecoveryAssessment(null);
    setRecoveryDecision(null);
    setRecoveryActionPlan(null);
    setRecoveryOutreachMessage(null);
    setRecoveryExecution(null);
    setCustomerNotification(null);
    setRecoveryOutcome(null);

    // If starting a completely fresh payment attempt (not a retry), reset failure context
    if (!isRetryAttempt) {
      setFirstFailedAttempt(null);
      setFirstFailedResult(null);
    }

    // 2. Transition state to PROCESSING
    setPaymentState('PROCESSING');

    // 3. Create PAYMENT_ATTEMPTED event with safe metadata ONLY
    const attemptEvent = createPaymentAttempt({
      customerId: user?.id || user?.email || 'customer_demo',
      productId: product.id || 'ai-fullstack-program',
      amount: product.price || 2000,
      currency: product.currency || 'INR',
      paymentMethod: selectedMethod,
      retryCount: isRetryAttempt ? retryCount : 0,
      retryOfAttemptId: isRetryAttempt ? retryOfAttemptId : null
    });

    setLastAttemptEvent(attemptEvent);

    // 4. Simulate short processing delay (1200ms) for realistic loading feedback
    await new Promise(resolve => setTimeout(resolve, 1200));

    // 5. Evaluate deterministic payment outcome using outcome engine
    const outcome = simulatePaymentOutcome(selectedScenario);
    setPaymentOutcome(outcome);

    // 6. Generate structured result event (PAYMENT_SUCCESS or PAYMENT_FAILED)
    const resultEvent = createPaymentResultEvent({
      outcome,
      attemptEvent,
      customerId: user?.id || user?.email || 'customer_demo',
      productId: product.id || 'ai-fullstack-program',
      amount: product.price || 2000,
      currency: product.currency || 'INR',
      paymentMethod: selectedMethod
    });
    setPaymentResultEvent(resultEvent);

    // 7. Generate Revenue Risk, Signals, Priority, Assessment, Decision, Plan, Outreach Message & Notification if PAYMENT_FAILED
    if (resultEvent.type === 'PAYMENT_FAILED') {
      // Store first failure context for retry correlation if not already set
      if (!firstFailedAttempt) {
        setFirstFailedAttempt(attemptEvent);
        setFirstFailedResult(resultEvent);
      }

      const riskContext = createRevenueRiskContext(resultEvent);
      setRevenueRiskContext(riskContext);
      
      const activeCustomerId = user?.id || user?.email || resultEvent.customerId;
      const signals = getDemoCustomerRecoverySignals(activeCustomerId);
      setCustomerRecoverySignals(signals);

      const priority = calculateRecoveryPriority(riskContext);
      setRecoveryPriority(priority);

      const assessment = createRecoveryAssessment(riskContext, priority, signals);
      setRecoveryAssessment(assessment);

      const decision = decideRecoveryAction(assessment);
      setRecoveryDecision(decision);

      const plan = planRecoveryAction(decision, assessment);
      setRecoveryActionPlan(plan);

      const outreachMsg = generateRecoveryOutreachMessage(assessment, decision, plan, user);
      setRecoveryOutreachMessage(outreachMsg);
      setRecoveryExecution(null);

      const notif = createCustomerRecoveryNotification(assessment, decision, plan, outreachMsg);
      setCustomerNotification(notif);
      setRecoveryOutcome(null);
    } else {
      // PAYMENT_SUCCESS
      setRevenueRiskContext(null);
      setCustomerRecoverySignals(null);
      setRecoveryPriority(null);
      setRecoveryAssessment(null);
      setRecoveryDecision(null);
      setRecoveryActionPlan(null);
      setRecoveryOutreachMessage(null);
      setRecoveryExecution(null);
      setCustomerNotification(null);

      // Evaluate recovery outcome if this is a successful retry
      const origAttempt = firstFailedAttempt || (isRetryAttempt && lastAttemptEvent ? lastAttemptEvent : null);
      const origResult = firstFailedResult;
      
      if (isRetryAttempt && origAttempt && origResult) {
        const recoveryOutcomeObj = createRecoveryOutcome(origAttempt, origResult, attemptEvent, resultEvent);
        setRecoveryOutcome(recoveryOutcomeObj);
      } else {
        setRecoveryOutcome(null);
      }
    }

    // 8. Transition state to WAITING_FOR_RESULT
    setPaymentState('WAITING_FOR_RESULT');


    if (onContinue) {
      onContinue(selectedMethod, formData, attemptEvent, outcome, resultEvent);
    }
  };



  const amount = Number(product?.price) || 2000;
  const formattedAmount = new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: product?.currency || 'INR',
    maximumFractionDigits: 0
  }).format(amount);

  const customerName = user?.full_name || 'Customer Account';
  const customerEmail = user?.email || 'customer@example.com';

  // Render processing loading view while actively processing
  if (paymentState === 'PROCESSING') {
    return (
      <PaymentProcessing 
        status="PROCESSING"
        formattedAmount={formattedAmount}
        currency={product?.currency || 'INR'}
        paymentMethod={selectedMethod}
        attemptId={lastAttemptEvent?.id}
        productName={product.name}
        paymentOutcome={paymentOutcome}
        paymentResultEvent={paymentResultEvent}
      />
    );
  }

  // Render PaymentResult view once result event is generated
  if (paymentState === 'WAITING_FOR_RESULT') {
    if (paymentResultEvent) {
      return (
        <PaymentResult 
          paymentResultEvent={paymentResultEvent}
          productName={product.name}
          customerRecoverySignals={customerRecoverySignals}
          recoveryAssessment={recoveryAssessment}
          recoveryDecision={recoveryDecision}
          recoveryActionPlan={recoveryActionPlan}
          recoveryOutreachMessage={recoveryOutreachMessage}
          recoveryExecution={recoveryExecution}
          customerNotification={customerNotification}
          recoveryOutcome={recoveryOutcome}
          onSimulateExecution={handleSimulateExecution}
          onRetryPayment={handleRetryNavigation}
          onReturnPortal={() => navigate('/customer')}
        />
      );
    }

    return (
      <PaymentProcessing 
        status="WAITING_FOR_RESULT"
        formattedAmount={formattedAmount}
        currency={product?.currency || 'INR'}
        paymentMethod={selectedMethod}
        attemptId={lastAttemptEvent?.id}
        productName={product.name}
        paymentOutcome={paymentOutcome}
        paymentResultEvent={paymentResultEvent}
      />
    );
  }




  return (
    <div className="w-full max-w-6xl mx-auto space-y-6">
      
      {/* Navigation Header / Back Button */}
      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={handleBack}
          aria-label="Return to purchase summary"
          className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-slate-900/80 hover:bg-slate-800 text-xs sm:text-sm font-medium text-slate-300 hover:text-white border border-slate-800 transition-all focus:outline-none focus:ring-2 focus:ring-cyan-400 focus:ring-offset-2 focus:ring-offset-slate-950 cursor-pointer"
        >
          <ArrowLeft className="h-4 w-4 text-cyan-400" />
          <span>Back to Checkout Summary</span>
        </button>

        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-cyan-950/80 text-cyan-400 border border-cyan-800/60">
          <Sparkles className="h-3.5 w-3.5" />
          Payment — Step 2 of 2
        </span>
      </div>

      {/* Main Payment Container Card */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6 sm:p-8 shadow-2xl backdrop-blur-xl space-y-8">
        
        {/* Header Section */}
        <div className="border-b border-slate-800/80 pb-5">
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-cyan-400 mb-1">
            <CreditCard className="h-4 w-4" />
            RecoverAI Payment Portal
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white">
            Simulated Payment Experience
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            Select a simulated payment method, fill in demo details, and submit your payment attempt.
          </p>
        </div>

        {/* Retry Attempt Indicator Banner */}
        {isRetryAttempt && retryCount > 0 && (
          <div className="bg-amber-950/40 border border-amber-800/60 rounded-xl p-3.5 flex items-center justify-between text-xs text-amber-300 relative z-10 flex-wrap gap-2">
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded text-[11px] font-extrabold bg-amber-900 text-amber-200 border border-amber-700/80">
                Retry attempt #{retryCount}
              </span>
              <span className="font-semibold text-amber-200">RecoverAI recovery retry</span>
            </div>
            {retryOfAttemptId && (
              <span className="font-mono text-[10px] text-amber-400/80 truncate max-w-[220px]" title={`Retry of ${retryOfAttemptId}`}>
                Ref: {retryOfAttemptId}
              </span>
            )}
          </div>
        )}

        {/* Selected Product Summary Box */}
        <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-5 space-y-3">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <span className="inline-flex items-center gap-1.5 text-xs font-medium text-cyan-400">
              <BookOpen className="h-3.5 w-3.5" />
              {product.category}
            </span>
            <span className="inline-flex items-center gap-1 text-[11px] text-slate-400 bg-slate-900 px-2.5 py-0.5 rounded-full border border-slate-800">
              <Lock className="h-3 w-3 text-cyan-400" /> Fixed Demo Product
            </span>
          </div>

          <h2 className="text-lg sm:text-xl font-bold text-white tracking-tight">
            {product.name}
          </h2>
        </div>

        {/* Visually Prominent Amount to Pay Section */}
        <div className="rounded-2xl border border-cyan-500/30 bg-gradient-to-b from-cyan-950/30 to-slate-950/80 p-6 sm:p-8 text-center space-y-3 relative overflow-hidden shadow-lg shadow-cyan-950/20">
          <div className="absolute top-0 right-0 p-4 opacity-10 pointer-events-none">
            <CreditCard className="h-32 w-32 text-cyan-400" />
          </div>

          <span className="text-xs font-semibold uppercase tracking-wider text-cyan-400 block">
            Amount to Pay
          </span>

          <div className="text-4xl sm:text-5xl font-extrabold text-white tracking-tight flex items-center justify-center gap-2">
            <span>{formattedAmount}</span>
            <span className="text-xs sm:text-sm font-semibold text-slate-400 bg-slate-900/90 px-2.5 py-1 rounded-lg border border-slate-800">
              {product.currency || 'INR'}
            </span>
          </div>

          <p className="text-xs text-slate-400 max-w-sm mx-auto pt-1">
            Non-editable price derived directly from demo product data.
          </p>
        </div>

        {/* Demo Payment Scenario Selector Section */}
        <PaymentScenarioSelector 
          selectedScenario={selectedScenario}
          onSelectScenario={setSelectedScenario}
          disabled={paymentState !== 'IDLE'}
        />

        {/* Payment Method Selector Section */}
        <PaymentMethodSelector 
          selectedMethod={selectedMethod} 
          onSelectMethod={handleMethodChange} 
        />

        {/* Simulated Payment Form Section */}
        {selectedMethod && (
          <SimulatedPaymentForm 
            selectedMethod={selectedMethod}
            formData={formData}
            errors={formErrors}
            onChange={handleFieldChange}
          />
        )}

        {/* Customer Account Summary */}
        <div className="rounded-xl border border-slate-800 bg-slate-950/40 p-5 space-y-3">
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-400 border-b border-slate-800/60 pb-2">
            <UserCheck className="h-4 w-4 text-cyan-400" />
            Payer Details
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs sm:text-sm pt-1">
            <div>
              <span className="text-slate-500 text-xs block mb-0.5">Full Name</span>
              <span className="font-semibold text-white truncate block">
                {customerName}
              </span>
            </div>

            <div>
              <span className="text-slate-500 text-xs block mb-0.5">Email Address</span>
              <span className="font-medium text-slate-300 flex items-center gap-1.5 truncate">
                <Mail className="h-3.5 w-3.5 text-slate-500 shrink-0" />
                <span className="truncate">{customerEmail}</span>
              </span>
            </div>
          </div>
        </div>

        {/* Helper text when no method is selected */}
        {!selectedMethod && (
          <div className="flex items-center gap-2 text-xs text-amber-400 bg-amber-950/40 border border-amber-900/60 px-4 py-2.5 rounded-xl">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>Select a payment method to continue.</span>
          </div>
        )}

        {/* Safety Notice */}
        <div className="text-center text-[11px] text-slate-500 flex items-center justify-center gap-1.5">
          <ShieldCheck className="h-3.5 w-3.5 text-cyan-400" />
          <span>Simulated Environment — No real financial transaction or payment provider contacted.</span>
        </div>

        {/* Action Buttons: Back & Pay Button */}
        <div className="flex flex-col-reverse sm:flex-row items-center justify-between gap-4 pt-2">
          
          <button
            type="button"
            onClick={handleBack}
            className="w-full sm:w-auto px-6 py-3 rounded-xl bg-slate-800/80 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-700/60 text-xs sm:text-sm font-semibold transition-all focus:outline-none focus:ring-2 focus:ring-cyan-400 cursor-pointer"
          >
            Back
          </button>

          <PayButton
            formattedAmount={formattedAmount}
            disabled={!selectedMethod}
            loading={false}
            onClick={handlePayAttempt}
          />

        </div>

      </div>
    </div>
  );
}
