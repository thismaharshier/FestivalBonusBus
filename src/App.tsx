/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/// <reference types="vite/client" />

import React from 'react';
import { useState, useEffect, Component, ErrorInfo, ReactNode } from 'react';
import { ErrorBoundary } from 'react-error-boundary';
import { 
  onAuthStateChanged, 
  User as FirebaseUser 
} from 'firebase/auth';
import { 
  doc, 
  getDoc, 
  setDoc, 
  collection, 
  addDoc, 
  query, 
  where, 
  onSnapshot, 
  orderBy, 
  Timestamp,
  serverTimestamp,
  getDocFromServer
} from 'firebase/firestore';
import { auth, db } from './firebase';
import { 
  Bus, 
  Coins, 
  User as UserIcon, 
  History, 
  Plus, 
  CheckCircle2, 
  AlertCircle,
  TrendingUp,
  Users,
  ShieldAlert,
  DollarSign,
  Loader2,
  Heart,
  Mail,
  Send,
  Handshake,
  Smartphone,
  QrCode,
  Copy
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { loadStripe } from '@stripe/stripe-js';
import {
  Elements,
  PaymentElement,
  useStripe,
  useElements,
} from '@stripe/react-stripe-js';

// Initialize Stripe
const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY || '');

// --- Error Handling Spec ---
enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId: string | undefined;
    email: string | null | undefined;
    emailVerified: boolean | undefined;
    isAnonymous: boolean | undefined;
    tenantId: string | null | undefined;
    providerInfo: {
      providerId: string;
      displayName: string | null;
      email: string | null;
      photoUrl: string | null;
    }[];
  }
}

function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData.map(provider => ({
        providerId: provider.providerId,
        displayName: provider.displayName,
        email: provider.email,
        photoUrl: provider.photoURL
      })) || []
    },
    operationType,
    path
  }
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

// --- Support Page Component ---
function SupportPage({ 
  user, 
  profile,
  totalFund, 
  contributionsCount,
  onContribute,
  isCreatingIntent,
  nameInput, setNameInput,
  emailInput, setEmailInput,
  phoneInput, setPhoneInput,
  amountInput, setAmountInput,
  busInput, setBusInput,
  purposeInput, setPurposeInput,
  goalType, setGoalType,
  paymentMethod, setPaymentMethod
}: { 
  user: FirebaseUser | null, 
  profile: UserProfile | null,
  totalFund: number, 
  contributionsCount: number,
  onContribute: (e: React.FormEvent) => void,
  isCreatingIntent: boolean,
  nameInput: string, setNameInput: (v: string) => void,
  emailInput: string, setEmailInput: (v: string) => void,
  phoneInput: string, setPhoneInput: (v: string) => void,
  amountInput: string, setAmountInput: (v: string) => void,
  busInput: string, setBusInput: (v: string) => void,
  purposeInput: string, setPurposeInput: (v: string) => void,
  goalType: 'General' | 'Festival Bonus', setGoalType: (v: 'General' | 'Festival Bonus') => void,
  paymentMethod: 'stripe' | 'upi', setPaymentMethod: (v: 'stripe' | 'upi') => void
}) {
  const [pledgeName, setPledgeName] = useState(user?.displayName || '');
  const [pledgeEmail, setPledgeEmail] = useState(user?.email || '');
  const [pledgePhone, setPledgePhone] = useState('');
  const [pledgeAmount, setPledgeAmount] = useState('');
  const [pledgeGoal, setPledgeGoal] = useState('Festival Bonus');
  const [isPledging, setIsPledging] = useState(false);
  
  const [contactEmail, setContactEmail] = useState(user?.email || '');
  const [contactMessage, setContactMessage] = useState('');
  const [isSending, setIsSending] = useState(false);
  
  const [success, setSuccess] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handlePledge = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pledgeName || !pledgeEmail || !pledgeAmount) {
      setError("Please fill in all required fields.");
      return;
    }
    
    setIsPledging(true);
    try {
      await addDoc(collection(db, 'pledges'), {
        name: pledgeName,
        email: pledgeEmail,
        phone: pledgePhone,
        amount: parseFloat(pledgeAmount),
        goal: pledgeGoal,
        timestamp: serverTimestamp()
      });
      setSuccess("Pledge submitted! We will contact you soon.");
      setPledgeAmount('');
      setPledgePhone('');
      setTimeout(() => setSuccess(null), 5000);
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, 'pledges');
    } finally {
      setIsPledging(false);
    }
  };

  const handleContact = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!contactEmail || !contactMessage) {
      setError("Please fill in all fields.");
      return;
    }
    
    setIsSending(true);
    try {
      await addDoc(collection(db, 'messages'), {
        email: contactEmail,
        message: contactMessage,
        timestamp: serverTimestamp()
      });
      setSuccess("Message sent! We'll get back to you shortly.");
      setContactMessage('');
      setTimeout(() => setSuccess(null), 5000);
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, 'messages');
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-16 py-12">
      {/* Contribution Section (For Students or Unauthenticated) */}
      {(!profile || profile.role === 'student') && (
        <section className="space-y-8">
          <div className="text-center space-y-2">
            <h2 className="text-4xl font-bold flex items-center justify-center gap-3">
              Contribute Now
            </h2>
            <p className="text-gray-500 font-sans">
              Make a direct contribution to your bus fund.
            </p>
          </div>
          
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="bg-[#5A5A40] rounded-[48px] p-8 md:p-12 shadow-2xl text-white"
          >
            <form onSubmit={onContribute} className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-sans font-semibold uppercase tracking-widest mb-2 opacity-70">Your Details</label>
                  <div className="space-y-2">
                    <input 
                      type="text" 
                      value={nameInput}
                      onChange={(e) => setNameInput(e.target.value)}
                      placeholder="Full Name"
                      className="w-full p-4 bg-white/10 border border-white/20 rounded-2xl focus:outline-none focus:ring-2 focus:ring-white/50 text-white placeholder:text-white/30"
                    />
                    <input 
                      type="email" 
                      value={emailInput}
                      onChange={(e) => setEmailInput(e.target.value)}
                      placeholder="Email Address"
                      className="w-full p-4 bg-white/10 border border-white/20 rounded-2xl focus:outline-none focus:ring-2 focus:ring-white/50 text-white placeholder:text-white/30"
                    />
                    <input 
                      type="tel" 
                      value={phoneInput}
                      onChange={(e) => setPhoneInput(e.target.value)}
                      placeholder="Phone Number"
                      className="w-full p-4 bg-white/10 border border-white/20 rounded-2xl focus:outline-none focus:ring-2 focus:ring-white/50 text-white placeholder:text-white/30"
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-sans font-semibold uppercase tracking-widest mb-2 opacity-70">Contribution Details</label>
                  <div className="space-y-2">
                    <div className="relative">
                      <span className="absolute left-4 top-1/2 -translate-y-1/2 text-white/50 font-sans font-bold">₹</span>
                      <input 
                        type="number" 
                        value={amountInput}
                        onChange={(e) => setAmountInput(e.target.value)}
                        placeholder="Amount"
                        className="w-full p-4 pl-8 bg-white/10 border border-white/20 rounded-2xl focus:outline-none focus:ring-2 focus:ring-white/50 text-white placeholder:text-white/30"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <button 
                        type="button"
                        onClick={() => setGoalType('General')}
                        className={`p-3 rounded-xl text-xs font-bold transition-all ${goalType === 'General' ? 'bg-white text-[#5A5A40]' : 'bg-white/10 text-white hover:bg-white/20'}`}
                      >
                        General
                      </button>
                      <button 
                        type="button"
                        onClick={() => setGoalType('Festival Bonus')}
                        className={`p-3 rounded-xl text-xs font-bold transition-all ${goalType === 'Festival Bonus' ? 'bg-white text-[#5A5A40]' : 'bg-white/10 text-white hover:bg-white/20'}`}
                      >
                        Festival Bonus
                      </button>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <button 
                        type="button"
                        onClick={() => setPaymentMethod('upi')}
                        className={`p-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 ${paymentMethod === 'upi' ? 'bg-white text-[#5A5A40]' : 'bg-white/10 text-white hover:bg-white/20'}`}
                      >
                        <Smartphone className="w-4 h-4" />
                        UPI
                      </button>
                      <button 
                        type="button"
                        onClick={() => setPaymentMethod('stripe')}
                        className={`p-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 ${paymentMethod === 'stripe' ? 'bg-white text-[#5A5A40]' : 'bg-white/10 text-white hover:bg-white/20'}`}
                      >
                        <DollarSign className="w-4 h-4" />
                        Card
                      </button>
                    </div>
                    <input 
                      type="text" 
                      value={busInput}
                      onChange={(e) => setBusInput(e.target.value)}
                      placeholder="Bus Number (e.g. 42)"
                      className="w-full p-4 bg-white/10 border border-white/20 rounded-2xl focus:outline-none focus:ring-2 focus:ring-white/50 text-white placeholder:text-white/30"
                    />
                    <input 
                      type="text" 
                      value={purposeInput}
                      onChange={(e) => setPurposeInput(e.target.value)}
                      placeholder={goalType === 'Festival Bonus' ? 'e.g. Festival Bonus' : 'e.g. Field Trip'}
                      className="w-full p-4 bg-white/10 border border-white/20 rounded-2xl focus:outline-none focus:ring-2 focus:ring-white/50 text-white placeholder:text-white/30"
                    />
                  </div>
                </div>
                <button 
                  type="submit"
                  disabled={isCreatingIntent}
                  className={`w-full py-4 rounded-full font-bold transition-all shadow-lg mt-4 flex items-center justify-center gap-2 group disabled:opacity-50 ${paymentMethod === 'upi' ? 'bg-blue-500 hover:bg-blue-600 shadow-blue-500/20' : 'bg-emerald-500 hover:bg-emerald-600 shadow-emerald-500/20'}`}
                >
                  {isCreatingIntent ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    <>
                      <span>{paymentMethod === 'upi' ? 'Pay via UPI' : 'Pay via Card'}</span>
                      {paymentMethod === 'upi' ? (
                        <Smartphone className="w-5 h-5 group-hover:scale-110 transition-transform" />
                      ) : (
                        <DollarSign className="w-5 h-5 group-hover:scale-110 transition-transform" />
                      )}
                    </>
                  )}
                </button>
              </div>
            </form>
          </motion.div>
        </section>
      )}

      {/* Dashboard Summary Section */}
      <section className="space-y-8">
        <div className="text-center space-y-2">
          <h2 className="text-4xl font-bold flex items-center justify-center gap-3">
            Fund Dashboard 📊
          </h2>
          <p className="text-gray-500 font-sans">
            Live overview of the Festival Bonus Bus Drive progress.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <motion.div 
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="bg-white rounded-[32px] p-8 shadow-xl border border-gray-100 flex flex-col items-center text-center"
          >
            <div className="p-4 bg-emerald-50 rounded-2xl mb-4">
              <TrendingUp className="w-8 h-8 text-emerald-600" />
            </div>
            <h3 className="text-sm text-gray-400 font-sans uppercase tracking-widest mb-1">Total Fund Raised</h3>
            <p className="text-5xl font-bold text-gray-900">₹{totalFund.toLocaleString()}</p>
            <p className="text-xs text-emerald-600 font-sans font-bold mt-2 uppercase tracking-widest">Live Updates</p>
          </motion.div>

          <motion.div 
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="bg-white rounded-[32px] p-8 shadow-xl border border-gray-100 flex flex-col items-center text-center"
          >
            <div className="p-4 bg-blue-50 rounded-2xl mb-4">
              <Users className="w-8 h-8 text-blue-600" />
            </div>
            <h3 className="text-sm text-gray-400 font-sans uppercase tracking-widest mb-1">Total Contributors</h3>
            <p className="text-5xl font-bold text-gray-900">{contributionsCount}</p>
            <p className="text-xs text-blue-600 font-sans font-bold mt-2 uppercase tracking-widest">Active Supporters</p>
          </motion.div>
        </div>
      </section>

      {/* Pledge Section */}
      <section className="text-center space-y-8">
        <div className="space-y-2">
          <h2 className="text-4xl font-bold flex items-center justify-center gap-3">
            Festival Bonus Bus Drive
          </h2>
          <p className="text-gray-500 font-sans">
            Fill out the form below and we will contact you to complete your donation.
          </p>
        </div>

        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-[32px] p-10 shadow-xl border border-gray-100 text-left"
        >
          <form onSubmit={handlePledge} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-sm font-semibold text-gray-600 ml-1">Your Name</label>
                <input 
                  type="text" 
                  value={pledgeName}
                  onChange={(e) => setPledgeName(e.target.value)}
                  placeholder="John Doe"
                  className="w-full p-4 bg-gray-50 border border-gray-100 rounded-2xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-semibold text-gray-600 ml-1">Your Email</label>
                <input 
                  type="email" 
                  value={pledgeEmail}
                  onChange={(e) => setPledgeEmail(e.target.value)}
                  placeholder="john.doe@example.com"
                  className="w-full p-4 bg-gray-50 border border-gray-100 rounded-2xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-semibold text-gray-600 ml-1">Phone Number</label>
              <input 
                type="tel" 
                value={pledgePhone}
                onChange={(e) => setPledgePhone(e.target.value)}
                placeholder="Your phone number"
                className="w-full p-4 bg-gray-50 border border-gray-100 rounded-2xl focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div className="space-y-4">
              <label className="text-sm font-semibold text-gray-600 ml-1">Choose an Amount (INR)</label>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {[500, 1000, 2500, 5000].map((amt) => (
                  <button
                    key={amt}
                    type="button"
                    onClick={() => setPledgeAmount(amt.toString())}
                    className={`py-3 rounded-xl font-bold transition-all border ${pledgeAmount === amt.toString() ? 'bg-blue-500 text-white border-blue-500' : 'bg-white text-gray-600 border-gray-100 hover:border-blue-200'}`}
                  >
                    ₹{amt.toLocaleString()}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-semibold text-gray-600 ml-1">Or Enter a Custom Amount (INR)</label>
              <input 
                type="number" 
                value={pledgeAmount}
                onChange={(e) => setPledgeAmount(e.target.value)}
                placeholder="e.g., 10000"
                className="w-full p-4 bg-gray-50 border border-gray-100 rounded-2xl focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-semibold text-gray-600 ml-1">Festival Bonus Goal</label>
              <select 
                value={pledgeGoal}
                onChange={(e) => setPledgeGoal(e.target.value)}
                className="w-full p-4 bg-gray-50 border border-gray-100 rounded-2xl focus:outline-none focus:ring-2 focus:ring-blue-500 appearance-none"
              >
                <option value="Festival Bonus">Festival Bonus</option>
              </select>
            </div>

            <button 
              type="submit"
              disabled={isPledging}
              className="w-full bg-blue-600 text-white py-4 rounded-2xl font-bold hover:bg-blue-700 transition-all shadow-lg shadow-blue-500/20 flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {isPledging ? <Loader2 className="w-5 h-5 animate-spin" /> : "Submit Pledge"}
            </button>
          </form>
        </motion.div>
      </section>

      {/* Contact Section */}
      <section className="text-center space-y-8">
        <div className="space-y-2">
          <h2 className="text-4xl font-bold flex items-center justify-center gap-3">
            Let's Connect 🤝
          </h2>
          <p className="text-gray-500 font-sans">
            We'd love to hear from you. Send us a message below.
          </p>
        </div>

        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-[32px] p-10 shadow-xl border border-gray-100 text-left"
        >
          <form onSubmit={handleContact} className="space-y-6">
            <div className="space-y-2">
              <label className="text-sm font-semibold text-gray-600 ml-1">Your Email:</label>
              <input 
                type="email" 
                value={contactEmail}
                onChange={(e) => setContactEmail(e.target.value)}
                placeholder="john.doe@example.com"
                className="w-full p-4 bg-gray-50 border border-gray-100 rounded-2xl focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-semibold text-gray-600 ml-1">Your Message:</label>
              <textarea 
                rows={4}
                value={contactMessage}
                onChange={(e) => setContactMessage(e.target.value)}
                placeholder="How can we help?"
                className="w-full p-4 bg-gray-50 border border-gray-100 rounded-2xl focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
              />
            </div>

            <button 
              type="submit"
              disabled={isSending}
              className="w-full bg-blue-600 text-white py-4 rounded-2xl font-bold hover:bg-blue-700 transition-all shadow-lg shadow-blue-500/20 flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {isSending ? <Loader2 className="w-5 h-5 animate-spin" /> : (
                <>
                  <span>Send</span>
                  <Send className="w-5 h-5" />
                </>
              )}
            </button>
          </form>
        </motion.div>
      </section>

      {/* Notifications */}
      <AnimatePresence>
        {success && (
          <motion.div 
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 50 }}
            className="fixed bottom-8 left-1/2 -translate-x-1/2 bg-emerald-500 text-white px-6 py-3 rounded-full shadow-lg font-bold flex items-center gap-2 z-50"
          >
            <CheckCircle2 className="w-5 h-5" />
            {success}
          </motion.div>
        )}
        {error && (
          <motion.div 
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 50 }}
            className="fixed bottom-8 left-1/2 -translate-x-1/2 bg-red-500 text-white px-6 py-3 rounded-full shadow-lg font-bold flex items-center gap-2 z-50"
          >
            <AlertCircle className="w-5 h-5" />
            {error}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
function ErrorFallback({ error, resetErrorBoundary }: { error: Error, resetErrorBoundary: () => void }) {
  let displayError = "Something went wrong.";
  try {
    const parsed = JSON.parse(error.message || "");
    if (parsed.error && parsed.error.includes("insufficient permissions")) {
      displayError = `Security Error: You don't have permission to ${parsed.operationType} at ${parsed.path}.`;
    }
  } catch (e) {
    displayError = error.message || displayError;
  }

  return (
    <div className="min-h-screen bg-red-50 flex items-center justify-center p-6 font-sans">
      <div className="bg-white p-8 rounded-3xl shadow-xl max-w-md w-full text-center border border-red-100">
        <ShieldAlert className="w-16 h-16 text-red-500 mx-auto mb-4" />
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Application Error</h2>
        <p className="text-gray-600 mb-6">{displayError}</p>
        <button 
          onClick={resetErrorBoundary}
          className="bg-red-500 text-white px-8 py-3 rounded-full font-bold hover:bg-red-600 transition-colors"
        >
          Reload Application
        </button>
      </div>
    </div>
  );
}

// Types
type Role = 'student' | 'driver' | 'admin';

interface UserProfile {
  uid: string;
  email: string;
  displayName: string;
  role: Role;
  busNumber?: string;
}

interface Contribution {
  id: string;
  studentUid: string;
  studentName: string;
  studentEmail: string;
  studentPhone: string;
  amount: number;
  busNumber: string;
  purpose: string;
  goalType: 'General' | 'Festival Bonus';
  timestamp: Timestamp;
}

// --- Stripe Checkout Form ---
function CheckoutForm({ amount, onPaymentSuccess, onCancel }: { amount: number, onPaymentSuccess: () => void, onCancel: () => void }) {
  const stripe = useStripe();
  const elements = useElements();
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!stripe || !elements) return;

    setIsProcessing(true);

    const { error } = await stripe.confirmPayment({
      elements,
      confirmParams: {
        return_url: window.location.origin,
      },
      redirect: 'if_required',
    });

    if (error) {
      setErrorMessage(error.message || "An unexpected error occurred.");
      setIsProcessing(false);
    } else {
      onPaymentSuccess();
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="bg-white p-4 rounded-2xl border border-gray-100">
        <PaymentElement />
      </div>
      {errorMessage && (
        <div className="text-red-500 text-sm bg-red-50 p-3 rounded-xl flex items-center gap-2">
          <AlertCircle className="w-4 h-4" />
          {errorMessage}
        </div>
      )}
      <div className="flex gap-3">
        <button
          type="button"
          onClick={onCancel}
          className="flex-1 py-3 border border-gray-200 rounded-full font-bold hover:bg-gray-50 transition-colors"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={!stripe || isProcessing}
          className="flex-1 bg-emerald-500 text-white py-3 rounded-full font-bold hover:bg-emerald-600 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
        >
          {isProcessing ? (
            <Loader2 className="w-5 h-5 animate-spin" />
          ) : (
            `Pay ₹${amount.toLocaleString()}`
          )}
        </button>
      </div>
    </form>
  );
}

function UpiModal({ amount, upiId, onComplete, onCancel }: { amount: number, upiId: string, onComplete: () => void, onCancel: () => void }) {
  const upiLink = `upi://pay?pa=${upiId}&pn=FestivalBonus&cu=INR&am=${amount}`;
  
  const copyToClipboard = () => {
    navigator.clipboard.writeText(upiId);
    alert("UPI ID copied to clipboard!");
  };

  return (
    <div className="space-y-6 text-center">
      <div className="bg-blue-50 p-6 rounded-3xl border border-blue-100 space-y-4">
        <Smartphone className="w-12 h-12 text-blue-600 mx-auto" />
        <div>
          <h3 className="text-xl font-bold text-gray-900">Pay via UPI</h3>
          <p className="text-sm text-gray-500">Scan or use the UPI ID below to pay ₹{amount.toLocaleString()}</p>
        </div>
      </div>

      <div className="p-4 bg-gray-50 rounded-2xl border border-gray-100 flex items-center justify-between gap-3">
        <code className="text-sm font-mono font-bold text-blue-600 truncate">{upiId}</code>
        <button 
          onClick={copyToClipboard}
          className="p-2 hover:bg-gray-200 rounded-lg transition-colors"
          title="Copy UPI ID"
        >
          <Copy className="w-4 h-4 text-gray-400" />
        </button>
      </div>

      <div className="space-y-3">
        <a 
          href={upiLink}
          className="w-full bg-blue-600 text-white py-4 rounded-full font-bold hover:bg-blue-700 transition-all shadow-lg flex items-center justify-center gap-3"
        >
          <Smartphone className="w-5 h-5" />
          Open UPI App
        </a>
        <p className="text-[10px] text-gray-400 uppercase tracking-widest">Works with GPay, PhonePe, Paytm, etc.</p>
      </div>

      <div className="pt-4 border-t border-gray-100 flex gap-3">
        <button
          onClick={onCancel}
          className="flex-1 py-3 border border-gray-200 rounded-full font-bold hover:bg-gray-50 transition-colors"
        >
          Cancel
        </button>
        <button
          onClick={onComplete}
          className="flex-1 bg-emerald-500 text-white py-3 rounded-full font-bold hover:bg-emerald-600 transition-all shadow-lg"
        >
          I've Paid
        </button>
      </div>
    </div>
  );
}

function AppContent() {
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'dashboard' | 'support'>('dashboard');
  const [contributions, setContributions] = useState<Contribution[]>([]);
  const totalFund = contributions.reduce((acc, curr) => acc + curr.amount, 0);
  const [amountInput, setAmountInput] = useState('');
  const [busInput, setBusInput] = useState('');
  const [purposeInput, setPurposeInput] = useState('Field Trip');
  const [nameInput, setNameInput] = useState('');
  const [emailInput, setEmailInput] = useState('');
  const [phoneInput, setPhoneInput] = useState('');
  const [goalType, setGoalType] = useState<'General' | 'Festival Bonus'>('Festival Bonus');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [stripeClientSecret, setStripeClientSecret] = useState<string | null>(null);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [showCelebration, setShowCelebration] = useState(false);
  const [isCreatingIntent, setIsCreatingIntent] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<'stripe' | 'upi'>('upi');
  const [showUpiModal, setShowUpiModal] = useState(false);
  const UPI_ID = "ramuluankireddy96-1@oksbi";

  // Connection Test
  useEffect(() => {
    async function testConnection() {
      try {
        await getDocFromServer(doc(db, 'test', 'connection'));
      } catch (error) {
        if(error instanceof Error && error.message.includes('the client is offline')) {
          console.error("Please check your Firebase configuration.");
          setError("Firebase is offline. Please check your connection or configuration.");
        }
      }
    }
    testConnection();
  }, []);

  // Auth Listener (Optional now, but keeping it for admin check if user happens to be logged in)
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (u) => {
      setUser(u);
      if (u) {
        setNameInput(u.displayName || '');
        setEmailInput(u.email || '');
        const path = `users/${u.uid}`;
        try {
          const docRef = doc(db, 'users', u.uid);
          const docSnap = await getDoc(docRef);
          if (docSnap.exists()) {
            setProfile(docSnap.data() as UserProfile);
          } else {
            setProfile(null);
          }
        } catch (err) {
          handleFirestoreError(err, OperationType.GET, path);
        }
      } else {
        setProfile(null);
      }
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  // Contributions Listener
  useEffect(() => {
    const path = 'contributions';
    let q;
    if (profile) {
      if (profile.role === 'student') {
        q = query(
          collection(db, 'contributions'),
          where('studentUid', '==', profile.uid)
        );
      } else if (profile.role === 'driver') {
        q = query(
          collection(db, 'contributions'),
          where('busNumber', '==', profile.busNumber)
        );
      } else {
        // Admin sees all
        q = query(
          collection(db, 'contributions')
        );
      }
    } else {
      // Public dashboard sees all (for stats)
      q = query(
        collection(db, 'contributions')
      );
    }

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Contribution[];
      // Sort in memory since we removed orderBy to fix permission/index issues
      data.sort((a, b) => {
        const timeA = a.timestamp?.toMillis() || 0;
        const timeB = b.timestamp?.toMillis() || 0;
        return timeB - timeA;
      });
      setContributions(data);
    }, (err) => {
      handleFirestoreError(err, OperationType.LIST, path);
    });

    return () => unsubscribe();
  }, [profile]);

  const handleContribute = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const amount = parseFloat(amountInput);
    if (isNaN(amount) || amount <= 0) {
      setError("Please enter a valid amount.");
      return;
    }

    if (!busInput) {
      setError("Please enter the bus number.");
      return;
    }

    if (!nameInput || !emailInput || !phoneInput) {
      setError("Please fill in all details (Name, Email, Phone).");
      return;
    }

    if (paymentMethod === 'upi') {
      setShowUpiModal(true);
      return;
    }

    // Step 1: Create Payment Intent
    setIsCreatingIntent(true);
    try {
      const response = await fetch('/api/create-payment-intent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount, currency: 'inr' }),
      });

      if (!response.ok) {
        throw new Error('Failed to create payment intent');
      }

      const { clientSecret } = await response.json();
      setStripeClientSecret(clientSecret);
      setShowPaymentModal(true);
      setError(null);
    } catch (err: any) {
      setError(err.message || "Failed to initiate payment.");
    } finally {
      setIsCreatingIntent(false);
    }
  };

  const finalizeContribution = async () => {
    const amount = parseFloat(amountInput);
    const path = 'contributions';
    try {
      await addDoc(collection(db, 'contributions'), {
        studentUid: user?.uid || 'guest',
        studentName: nameInput,
        studentEmail: emailInput,
        studentPhone: phoneInput,
        amount,
        busNumber: busInput,
        purpose: purposeInput,
        goalType: goalType,
        timestamp: serverTimestamp()
      });
      setAmountInput('');
      setBusInput('');
      setPhoneInput('');
      setPurposeInput('Field Trip');
      setSuccess("Contribution sent! Thank you.");
      setShowPaymentModal(false);
      setStripeClientSecret(null);
      setShowCelebration(true);
      setTimeout(() => {
        setSuccess(null);
        setShowCelebration(false);
      }, 4000);
      setError(null);
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, path);
    }
  };

  return (
    <div className="min-h-screen bg-[#F5F5F0] font-serif text-[#1A1A1A]">
      {/* Header */}
      <header className="bg-white border-b border-gray-100 px-6 py-4 sticky top-0 z-10">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-8">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-[#5A5A40] rounded-full flex items-center justify-center">
                <Bus className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="font-bold text-lg leading-tight">Festival Bonus Bus Drive</h1>
                <p className="text-xs text-[#5A5A40] font-sans uppercase tracking-widest">
                  Public Dashboard
                </p>
              </div>
            </div>
            
            <nav className="hidden md:flex items-center gap-6 font-sans text-sm font-semibold uppercase tracking-widest">
              <button 
                onClick={() => setActiveTab('dashboard')}
                className={`transition-colors ${activeTab === 'dashboard' ? 'text-[#5A5A40]' : 'text-gray-400 hover:text-[#5A5A40]'}`}
              >
                Dashboard
              </button>
              <button 
                onClick={() => setActiveTab('support')}
                className={`transition-colors ${activeTab === 'support' ? 'text-[#5A5A40]' : 'text-gray-400 hover:text-[#5A5A40]'}`}
              >
                Support
              </button>
            </nav>
          </div>
        </div>
      </header>

      {activeTab === 'dashboard' ? (
        <main className="max-w-5xl mx-auto p-6 grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column: Stats & Forms */}
        <div className="lg:col-span-1 space-y-8">
          {/* Stats Card */}
          <div className="bg-[#CCCCCC] p-4 rounded-[48px]">
            <motion.div 
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              className="bg-white rounded-[32px] p-8"
            >
              <div className="flex items-center justify-between mb-6">
                <div className="p-3 bg-emerald-50 rounded-2xl">
                  <TrendingUp className="w-6 h-6 text-emerald-600" />
                </div>
                <span className="text-[10px] font-sans font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-md uppercase tracking-widest">
                  Live
                </span>
              </div>
              <p className="text-xs text-[#5A5A40] font-sans font-bold uppercase tracking-widest mb-4">
                Total Collected
              </p>
              <div className="flex items-baseline gap-2 mb-2">
                <h2 className="text-6xl font-sans font-bold">
                  ₹{totalFund.toLocaleString()}
                </h2>
                <span className="text-2xl text-[#5A5A40] font-serif">INR</span>
              </div>
              <p className="text-xs text-gray-400 font-serif">
                From {contributions.length} total transactions
              </p>
            </motion.div>
          </div>

          {/* Driver Info (Driver Only) */}
          {profile.role === 'driver' && (
            <motion.div 
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.1 }}
              className="bg-[#5A5A40] rounded-[32px] p-8 shadow-lg text-white"
            >
              <div className="flex items-center gap-3 mb-4">
                <Bus className="w-6 h-6" />
                <h3 className="text-xl font-bold">Bus {profile.busNumber}</h3>
              </div>
              <p className="text-sm opacity-80 leading-relaxed">
                You are currently managing the fund for Bus {profile.busNumber}. 
                All contributions from students for this bus will appear in your history.
              </p>
            </motion.div>
          )}
        </div>

        {/* Right Column: History */}
        <div className="lg:col-span-2">
          <div className="bg-[#CCCCCC] p-4 rounded-[48px]">
            <div className="bg-white rounded-[32px] p-8 min-h-[600px]">
              <div className="flex items-center justify-between mb-8">
                <div className="flex items-center gap-3">
                  <div className="p-3 bg-gray-50 rounded-2xl">
                    <History className="w-6 h-6 text-[#5A5A40]" />
                  </div>
                  <h3 className="text-3xl font-serif">Transaction History</h3>
                </div>
                <span className="text-sm text-gray-400 font-sans">
                  {contributions.length} entries
                </span>
              </div>

            <div className="space-y-4">
              <AnimatePresence mode="popLayout">
                {contributions.length === 0 ? (
                  <motion.div 
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="flex flex-col items-center justify-center py-20 text-gray-400"
                  >
                    <Coins className="w-12 h-12 mb-4 opacity-20" />
                    <p>No transactions found yet.</p>
                  </motion.div>
                ) : (
                  contributions.map((c) => (
                    <motion.div 
                      key={c.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.95 }}
                      className="flex items-center justify-between p-6 rounded-2xl border border-gray-50 hover:border-gray-100 hover:bg-gray-50/50 transition-all group"
                    >
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-gray-50 rounded-full flex items-center justify-center group-hover:bg-white transition-colors">
                          <UserIcon className="w-6 h-6 text-gray-400" />
                        </div>
                        <div>
                          <p className="font-bold text-lg">
                            {c.studentName || 'Anonymous'}
                          </p>
                          <div className="flex items-center gap-2 text-sm text-[#5A5A40] italic mb-1">
                            <span>{c.purpose}</span>
                            {c.studentPhone && (
                              <span className="text-xs font-sans font-normal not-italic text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">
                                📞 {c.studentPhone}
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-gray-400 font-sans uppercase tracking-widest">
                            {c.timestamp?.toDate().toLocaleDateString()} at {c.timestamp?.toDate().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-xl font-bold text-[#5A5A40]">₹{c.amount.toLocaleString()}</p>
                        <p className="text-[10px] text-emerald-600 font-sans font-bold uppercase tracking-widest">{c.goalType || 'Contribution'}</p>
                      </div>
                    </motion.div>
                  ))
                )}
              </AnimatePresence>
            </div>
          </div>
        </div>
      </div>
    </main>
      ) : (
        <SupportPage 
          user={user} 
          profile={profile}
          totalFund={totalFund} 
          contributionsCount={contributions.length} 
          onContribute={handleContribute}
          isCreatingIntent={isCreatingIntent}
          nameInput={nameInput} setNameInput={setNameInput}
          emailInput={emailInput} setEmailInput={setEmailInput}
          phoneInput={phoneInput} setPhoneInput={setPhoneInput}
          amountInput={amountInput} setAmountInput={setAmountInput}
          busInput={busInput} setBusInput={setBusInput}
          purposeInput={purposeInput} setPurposeInput={setPurposeInput}
          goalType={goalType} setGoalType={setGoalType}
          paymentMethod={paymentMethod} setPaymentMethod={setPaymentMethod}
        />
      )}

      {/* Payment Modal (Stripe) */}
      <AnimatePresence>
        {showPaymentModal && stripeClientSecret && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-6">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowPaymentModal(false)}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ scale: 0.5, opacity: 0, y: 50 }}
              animate={{ 
                scale: [0.5, 1.2, 1],
                opacity: 1,
                y: 0
              }}
              transition={{ 
                duration: 0.6,
                times: [0, 0.7, 1],
                ease: "easeOut"
              }}
              className="relative bg-white rounded-[40px] p-8 w-full max-w-lg shadow-2xl border border-gray-100"
            >
              <div className="flex items-center gap-4 mb-8">
                <div className="w-12 h-12 bg-emerald-50 rounded-2xl flex items-center justify-center">
                  <DollarSign className="w-6 h-6 text-emerald-600" />
                </div>
                <div>
                  <h3 className="text-2xl font-bold">Secure Payment</h3>
                  <p className="text-sm text-gray-400 font-sans uppercase tracking-widest">Powered by Stripe (INR)</p>
                </div>
              </div>

              <Elements 
                stripe={stripePromise} 
                options={{ 
                  clientSecret: stripeClientSecret,
                  appearance: {
                    theme: 'stripe',
                    variables: {
                      colorPrimary: '#10b981',
                      borderRadius: '16px',
                    }
                  }
                }}
              >
                <CheckoutForm 
                  amount={parseFloat(amountInput)} 
                  onPaymentSuccess={finalizeContribution}
                  onCancel={() => setShowPaymentModal(false)}
                />
              </Elements>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* UPI Modal */}
      <AnimatePresence>
        {showUpiModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-6">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowUpiModal(false)}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ scale: 0.5, opacity: 0, y: 50 }}
              animate={{ 
                scale: [0.5, 1.2, 1],
                opacity: 1,
                y: 0
              }}
              transition={{ 
                duration: 0.6,
                times: [0, 0.7, 1],
                ease: "easeOut"
              }}
              className="relative bg-white rounded-[40px] p-10 w-full max-w-md shadow-2xl border border-gray-100"
            >
              <UpiModal 
                amount={parseFloat(amountInput)}
                upiId={UPI_ID}
                onComplete={() => {
                  setShowUpiModal(false);
                  finalizeContribution();
                }}
                onCancel={() => setShowUpiModal(false)}
              />
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Celebration Overlay */}
      <AnimatePresence>
        {showCelebration && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center pointer-events-none"
          >
            <div className="absolute inset-0 bg-emerald-500/10 backdrop-blur-[2px]" />
            
            <motion.div 
              initial={{ scale: 0.5, opacity: 0, y: 50 }}
              animate={{ 
                scale: [0.5, 1.2, 1],
                opacity: 1,
                y: 0
              }}
              transition={{ 
                duration: 0.6,
                times: [0, 0.7, 1],
                ease: "easeOut"
              }}
              className="relative bg-white rounded-[48px] p-12 shadow-2xl border-4 border-emerald-500 flex flex-col items-center text-center max-w-sm mx-6 pointer-events-auto"
            >
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.3, type: "spring", stiffness: 200 }}
                className="w-24 h-24 bg-emerald-500 rounded-full flex items-center justify-center mb-6 shadow-lg shadow-emerald-500/40"
              >
                <CheckCircle2 className="w-14 h-14 text-white" />
              </motion.div>
              
              <motion.h2 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.5 }}
                className="text-3xl font-bold text-gray-900 mb-2"
              >
                Success!
              </motion.h2>
              
              <motion.p 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.6 }}
                className="text-[#5A5A40] font-serif italic text-lg"
              >
                Your bones have been sent.
              </motion.p>

              {/* Particle Burst Simulation */}
              {[...Array(12)].map((_, i) => (
                <motion.div
                  key={i}
                  initial={{ scale: 0, x: 0, y: 0 }}
                  animate={{ 
                    scale: [0, 1, 0],
                    x: (Math.random() - 0.5) * 300,
                    y: (Math.random() - 0.5) * 300,
                    rotate: Math.random() * 360
                  }}
                  transition={{ 
                    duration: 1.5,
                    delay: 0.4,
                    ease: "easeOut"
                  }}
                  className="absolute w-4 h-4 text-emerald-500/40"
                >
                  <Coins className="w-full h-full" />
                </motion.div>
              ))}
              
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: "100%" }}
                transition={{ delay: 1, duration: 2.5 }}
                className="h-1 bg-emerald-100 rounded-full mt-8 overflow-hidden"
              >
                <motion.div 
                  initial={{ x: "-100%" }}
                  animate={{ x: "0%" }}
                  transition={{ delay: 1, duration: 2.5 }}
                  className="h-full bg-emerald-500"
                />
              </motion.div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Notifications */}
      <AnimatePresence>
        {error && (
          <motion.div 
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 50 }}
            className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-red-500 text-white px-6 py-3 rounded-full shadow-lg flex items-center gap-2 z-50"
          >
            <AlertCircle className="w-5 h-5" />
            <span className="font-sans font-semibold text-sm">{error}</span>
            <button onClick={() => setError(null)} className="ml-2 hover:opacity-70">×</button>
          </motion.div>
        )}
        {success && (
          <motion.div 
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 50 }}
            className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-emerald-500 text-white px-6 py-3 rounded-full shadow-lg flex items-center gap-2 z-50"
          >
            <CheckCircle2 className="w-5 h-5" />
            <span className="font-sans font-semibold text-sm">{success}</span>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default function App() {
  return (
    <ErrorBoundary FallbackComponent={ErrorFallback} onReset={() => window.location.reload()}>
      <AppContent />
    </ErrorBoundary>
  );
}
