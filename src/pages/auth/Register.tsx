import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { BookOpen, CheckCircle, AlertCircle, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const Register = () => {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: ""
  });
  const [password, setPassword] = useState("");
  const [step, setStep] = useState(1); // 1: Form, 2: OTP, 3: Success
  const [otp, setOtp] = useState("");
  const [loading, setLoading] = useState(false);
  const [duplicateErrors, setDuplicateErrors] = useState({ email: false, phone: false });
  const [showDuplicatePopup, setShowDuplicatePopup] = useState(false);
  const [duplicateMessage, setDuplicateMessage] = useState("");
  const navigate = useNavigate();
  const { toast } = useToast();
  const { register, logout } = useAuth();

  // API base URL
  const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "/api";

  // Check for duplicates
  const checkDuplicate = async (field: 'email' | 'phone', value: string) => {
    if (!value.trim()) return;

    try {
      const params = new URLSearchParams();
      params.append(field, value);

      const response = await fetch(`${API_BASE_URL}/users/check-duplicate?${params}`);
      const data = await response.json();

      if (!data.available) {
        const fieldName = field === 'email' ? 'Email' : 'Phone number';
        setDuplicateMessage(`${fieldName} is already registered. Please use a different ${field}.`);
        setShowDuplicatePopup(true);
        setDuplicateErrors(prev => ({ ...prev, [field]: true }));
        return false;
      } else {
        setDuplicateErrors(prev => ({ ...prev, [field]: false }));
        return true;
      }
    } catch (error) {
      console.error('Error checking duplicates:', error);
      return true; // Allow if check fails
    }
  };

  // Handle input changes with duplicate checking
  const handleInputChange = async (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));

    // Clear duplicate error for this field
    if (duplicateErrors[field as keyof typeof duplicateErrors]) {
      setDuplicateErrors(prev => ({ ...prev, [field]: false }));
    }

    // Check for duplicates on blur (when user finishes typing)
    if (field === 'email' || field === 'phone') {
      // Debounce the check
      setTimeout(() => {
        if (value.trim() && formData[field as keyof typeof formData] === value) {
          checkDuplicate(field as 'email' | 'phone', value);
        }
      }, 1000);
    }
  };

  // Step 1: Send OTP
  const handleSendOTP = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validate all fields
    if (!formData.name || !formData.email || !formData.phone) {
      toast({
        title: "Missing Information",
        description: "Please fill in all fields.",
        variant: "destructive"
      });
      return;
    }

    // Check for duplicates before sending OTP
    const emailAvailable = await checkDuplicate('email', formData.email);
    const phoneAvailable = await checkDuplicate('phone', formData.phone);

    if (!emailAvailable || !phoneAvailable) {
      return; // Stop if duplicates found
    }

    setLoading(true);
    try {
      const response = await fetch(`${API_BASE_URL}/users/send-otp`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(formData),
      });

      const result = await response.json();

      if (!response.ok) {
        if (response.status === 400 && result.error.includes('already registered')) {
          setDuplicateMessage(result.error);
          setShowDuplicatePopup(true);
          return;
        }
        throw new Error(result.error || "Failed to send OTP");
      }

      toast({
        title: "OTP Sent!",
        description: "Check your email for the verification code.",
      });
      setStep(2); // Move to OTP step

    } catch (error: any) {
      console.error("OTP Error:", error);
      toast({
        title: "Failed to send OTP",
        description: error.message || "Please try again.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  // Step 2: Verify OTP
  const handleVerifyOTP = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!otp.trim()) {
      toast({
        title: "OTP Required",
        description: "Please enter the verification code.",
        variant: "destructive"
      });
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(`${API_BASE_URL}/users/verify-otp`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: formData.email,
          otp: otp.trim()
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Invalid OTP");
      }

      // OTP verified, now complete registration
      await completeRegistration();

    } catch (error: any) {
      console.error("OTP Verification Error:", error);
      toast({
        title: "Verification Failed",
        description: error.message || "Invalid OTP code.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  // Step 3: Complete registration
  const completeRegistration = async () => {
    try {
      // Register locally first
      await register(formData.name, formData.email, password);

      // Complete backend registration
      const response = await fetch(`${API_BASE_URL}/users/complete-registration`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(formData),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Failed to complete registration");
      }

      // Log out user until approved
      if (logout) {
        await logout();
      }

      toast({
        title: "Registration Complete!",
        description: "Your library card has been sent to your email.",
      });

      setStep(3); // Success step

    } catch (error: any) {
      console.error("Registration Error:", error);
      toast({
        title: "Registration Failed",
        description: error.message || "Please try again.",
        variant: "destructive"
      });
    }
  };

  // Resend OTP
  const handleResendOTP = async () => {
    setOtp("");
    await handleSendOTP({ preventDefault: () => {} } as any);
  };

  // Close duplicate popup
  const closeDuplicatePopup = () => {
    setShowDuplicatePopup(false);
    setDuplicateMessage("");
  };

  return (
    <>
      <div className="container flex min-h-[70vh] items-center justify-center py-12">
        <div className="w-full max-w-md">
          <div className="mb-8 text-center">
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-xl bg-primary">
              <BookOpen className="h-7 w-7 text-primary-foreground" />
            </div>
            <h1 className="font-display text-2xl font-bold text-foreground">
              {step === 1 && "Join the Fellowship"}
              {step === 2 && "Verify Your Email"}
              {step === 3 && "Welcome!"}
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              {step === 1 && "Create your DLCF account"}
              {step === 2 && "Enter the 6-digit code sent to your email"}
              {step === 3 && "Your account has been created successfully"}
            </p>
          </div>

          {step === 1 && (
            <form onSubmit={handleSendOTP} className="space-y-4 rounded-xl border border-border bg-card p-6 shadow-sm">
              <div className="space-y-2">
                <Label htmlFor="name">Full Name</Label>
                <Input
                  id="name"
                  placeholder="Grace Adeola"
                  value={formData.name}
                  onChange={(e) => handleInputChange('name', e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="you@example.com"
                  value={formData.email}
                  onChange={(e) => handleInputChange('email', e.target.value)}
                  className={duplicateErrors.email ? "border-red-500" : ""}
                  required
                />
                {duplicateErrors.email && (
                  <p className="text-sm text-red-500 flex items-center gap-1">
                    <AlertCircle className="h-4 w-4" />
                    Email already registered
                  </p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone">Phone Number</Label>
                <Input
                  id="phone"
                  type="tel"
                  placeholder="08012345678"
                  value={formData.phone}
                  onChange={(e) => handleInputChange('phone', e.target.value)}
                  className={duplicateErrors.phone ? "border-red-500" : ""}
                  required
                />
                {duplicateErrors.phone && (
                  <p className="text-sm text-red-500 flex items-center gap-1">
                    <AlertCircle className="h-4 w-4" />
                    Phone number already registered
                  </p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              </div>
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Sending OTP...
                  </>
                ) : (
                  "Send Verification Code"
                )}
              </Button>
            </form>
          )}

          {step === 2 && (
            <form onSubmit={handleVerifyOTP} className="space-y-4 rounded-xl border border-border bg-card p-6 shadow-sm">
              <div className="space-y-2">
                <Label htmlFor="otp">Verification Code</Label>
                <Input
                  id="otp"
                  type="text"
                  placeholder="123456"
                  value={otp}
                  onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  maxLength={6}
                  required
                />
                <p className="text-sm text-muted-foreground">
                  Enter the 6-digit code sent to {formData.email}
                </p>
              </div>
              <Button type="submit" className="w-full" disabled={loading || otp.length !== 6}>
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Verifying...
                  </>
                ) : (
                  "Verify & Complete Registration"
                )}
              </Button>
              <Button
                type="button"
                variant="outline"
                className="w-full"
                onClick={handleResendOTP}
                disabled={loading}
              >
                Resend Code
              </Button>
            </form>
          )}

          {step === 3 && (
            <div className="space-y-4 rounded-xl border border-border bg-card p-6 shadow-sm text-center">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-green-100">
                <CheckCircle className="h-8 w-8 text-green-600" />
              </div>
              <h3 className="text-lg font-semibold">Registration Successful!</h3>
              <p className="text-sm text-muted-foreground">
                Your library card has been sent to your email. Please wait for admin approval to access your account.
              </p>
              <Button onClick={() => navigate('/auth/login')} className="w-full">
                Go to Login
              </Button>
            </div>
          )}

          <p className="mt-4 text-center text-sm text-muted-foreground">
            Already have an account?{" "}
            <Link to="/auth/login" className="font-medium text-primary hover:underline">Sign In</Link>
          </p>
        </div>
      </div>

      {/* Duplicate Registration Popup */}
      {showDuplicatePopup && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="w-full max-w-md rounded-xl border border-red-200 bg-white p-6 shadow-2xl">
            <div className="mb-4 flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-red-100">
                <AlertCircle className="h-5 w-5 text-red-600" />
              </div>
              <h3 className="text-lg font-semibold text-red-900">Registration Error</h3>
            </div>
            <p className="mb-6 text-red-700">{duplicateMessage}</p>
            <Button onClick={closeDuplicatePopup} className="w-full bg-red-600 hover:bg-red-700">
              Try Different Details
            </Button>
          </div>
        </div>
      )}
    </>
  );
};

export default Register;
            <CheckCircle className="h-8 w-8 text-primary" />
          </div>
          <h2 className="font-display text-2xl font-bold text-foreground">Thank You for Registering!</h2>
          <p className="mt-4 text-muted-foreground">
            The admin will review your details and send your library card to your email after successful accreditation.
          </p>
          <div className="mt-6 rounded-lg bg-secondary/50 p-4 text-sm text-muted-foreground">
            <p><strong>Note:</strong> Some content on the website is still under progress. More updates are coming soon.</p>
          </div>
          <Button className="mt-8 w-full" onClick={() => navigate("/")}>
            Return to Home
          </Button>
        </div>
      </div>
    )}
    </>
  );
};

export default Register;
