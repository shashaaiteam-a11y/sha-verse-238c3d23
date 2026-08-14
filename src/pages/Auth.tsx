import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { lovable } from '@/integrations/lovable';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card } from '@/components/ui/card';
import { useToast } from '@/components/ui/use-toast';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import { InputOTP, InputOTPGroup, InputOTPSlot } from '@/components/ui/input-otp';
import { z } from 'zod';
import { Loader2, Mail, Phone, ArrowLeft, Eye, EyeOff } from 'lucide-react';
import { SEO } from '@/components/seo/SEO';
import AppLogoStatusRing from "@/components/promotions/AppLogoStatusRing";
import { shouldUseNativeGoogle, nativeGoogleSignIn } from "@/lib/auth/nativeGoogleAuth";
import { useAuth } from '@/contexts/AuthContext';

// Validation schemas
const emailSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});

const phoneSchema = z.object({
  phone: z.string().min(10, 'Enter a valid phone number').max(15, 'Phone number too long'),
});

const signupSchema = emailSchema.extend({
  username: z.string().min(3, 'Username must be at least 3 characters'),
  displayName: z.string().min(2, 'Display name must be at least 2 characters'),
});

type AuthMethod = 'email' | 'phone' | 'otp-verify';

// Toggle "Login with mobile no" (Phone OTP) visibility.
// Set to true to re-enable the Phone tab when requested.
const SHOW_PHONE_LOGIN = false;

const Auth = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [authMethod, setAuthMethod] = useState<AuthMethod>('email');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);
  const [countdown, setCountdown] = useState(0);
  const [showPassword, setShowPassword] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user } = useAuth();

  // If the user is already authenticated (e.g. after the post-login fresh-app
  // reload lands back on /auth), bounce them home instead of showing the login
  // form. This fixes the "first email login appears logged out" race where the
  // forced reload fired before navigation completed.
  useEffect(() => {
    if (user) navigate('/', { replace: true });
  }, [user, navigate]);


  // Countdown timer for OTP resend
  useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [countdown]);

  // Log login attempt
  const logAttempt = async (identifier: string, attemptType: string, success: boolean) => {
    try {
      await supabase.from('login_attempts').insert({
        identifier,
        attempt_type: attemptType,
        success,
        user_agent: navigator.userAgent,
      });
    } catch (error) {
      // Silent fail for logging
    }
  };

  // Email/Password authentication
  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const data = isLogin 
        ? { email, password }
        : { email, password, username, displayName };
      
      if (isLogin) {
        emailSchema.parse({ email, password });
      } else {
        signupSchema.parse(data);
      }

      if (isLogin) {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        void logAttempt(email, 'email', true);
        toast({ title: 'Welcome back!', description: 'Successfully logged in' });
        navigate('/');
      } else {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: { username, display_name: displayName },
            emailRedirectTo: `${window.location.origin}/`,
          },
        });
        if (error) throw error;
        await logAttempt(email, 'email', true);
        toast({ title: 'Account created!', description: 'Please check your email to verify your account' });
        navigate('/');
      }
    } catch (error: any) {
      await logAttempt(email, 'email', false);
      if (error instanceof z.ZodError) {
        toast({ title: 'Validation Error', description: error.errors[0].message, variant: 'destructive' });
      } else {
        toast({ title: 'Error', description: error.message || 'An error occurred', variant: 'destructive' });
      }
    } finally {
      setLoading(false);
    }
  };

  // Google OAuth
  const handleGoogleAuth = async () => {
    setLoading(true);
    try {
      // Native app (Android/iOS): use native Google account picker → idToken.
      // This avoids the /~oauth webview redirect that 404s in standalone builds.
      if (shouldUseNativeGoogle()) {
        try {
          await nativeGoogleSignIn();
          toast({ title: 'Welcome back!', description: 'Successfully logged in with Google' });
          navigate('/');
          return;
        } catch (nativeError: any) {
          const msg = String(nativeError?.message ?? nativeError ?? '');
          const pluginMissing =
            nativeError?.code === 'UNIMPLEMENTED' ||
            /not implemented|unimplemented|not available/i.test(msg);
          // Plugin missing in this build → fall through to the managed web OAuth
          // flow instead of dead-ending the user.
          if (!pluginMissing) throw nativeError;
        }
      }


      // Web: Lovable managed OAuth (unchanged).
      const result = await lovable.auth.signInWithOAuth('google', {
        redirect_uri: window.location.origin,
        extraParams: {
          prompt: 'select_account',
        },
      });

      if (result.error) throw result.error;
      if (result.redirected) return;

      toast({ title: 'Welcome back!', description: 'Successfully logged in with Google' });
      navigate('/');
    } catch (error: any) {
      toast({ title: 'Error', description: error.message || 'Failed to sign in with Google', variant: 'destructive' });
      setLoading(false);
    }
  };

  // Send OTP to phone
  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      phoneSchema.parse({ phone });
      
      // Format phone number (ensure it has country code)
      const formattedPhone = phone.startsWith('+') ? phone : `+${phone}`;
      
      const { error } = await supabase.auth.signInWithOtp({
        phone: formattedPhone,
      });
      
      if (error) throw error;
      
      setAuthMethod('otp-verify');
      setCountdown(60); // 60 seconds cooldown
      toast({ title: 'OTP Sent!', description: 'Check your phone for the verification code' });
    } catch (error: any) {
      await logAttempt(phone, 'phone', false);
      if (error instanceof z.ZodError) {
        toast({ title: 'Validation Error', description: error.errors[0].message, variant: 'destructive' });
      } else {
        toast({ title: 'Error', description: error.message || 'Failed to send OTP', variant: 'destructive' });
      }
    } finally {
      setLoading(false);
    }
  };

  // Verify OTP
  const handleVerifyOtp = async () => {
    if (otp.length !== 6) {
      toast({ title: 'Error', description: 'Please enter the complete 6-digit code', variant: 'destructive' });
      return;
    }

    setLoading(true);

    try {
      const formattedPhone = phone.startsWith('+') ? phone : `+${phone}`;
      
      const { error } = await supabase.auth.verifyOtp({
        phone: formattedPhone,
        token: otp,
        type: 'sms',
      });

      if (error) throw error;
      
      await logAttempt(phone, 'phone', true);
      toast({ title: 'Success!', description: 'Phone number verified successfully' });
      navigate('/');
    } catch (error: any) {
      await logAttempt(phone, 'phone', false);
      toast({ title: 'Error', description: error.message || 'Invalid OTP', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  // Resend OTP
  const handleResendOtp = async () => {
    if (countdown > 0) return;
    await handleSendOtp({ preventDefault: () => {} } as React.FormEvent);
  };

  const resetToMethodSelection = () => {
    setAuthMethod('email');
    setOtp('');
  };

  return (
    <>
      <SEO
        title="Sign in to Sha-Verse — Email, phone, or Google"
        description="Sign in or create your Sha-Verse account. Connect with friends, share posts, watch videos, read books, and chat with NovaChat AI."
        path="/auth"
      />
    <div className="min-h-screen bg-gradient-subtle flex items-center justify-center p-4 safe-all">
      <Card className="w-full max-w-md p-5 sm:p-8 shadow-glow">
        <div className="text-center mb-6">
          <div className="flex items-center justify-center gap-2 mb-2">
            <AppLogoStatusRing src="/sha-verse-logo.jpeg" alt="Sha-Verse" size="w-10 h-10" showPlus={false} />
            <h1 className="text-2xl sm:text-3xl font-bold bg-gradient-primary bg-clip-text text-transparent">
              Sha-Verse
              <span className="sr-only"> — Sign in to your social universe</span>
            </h1>
          </div>
          <p className="text-sm sm:text-base text-muted-foreground">
            {authMethod === 'otp-verify' ? 'Verify your phone' : isLogin ? 'Welcome back!' : 'Create your account'}
          </p>
        </div>

        {/* OTP Verification Screen */}
        {authMethod === 'otp-verify' ? (
          <div className="space-y-6">
            <button
              onClick={resetToMethodSelection}
              className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors touch-target"
            >
              <ArrowLeft className="w-4 h-4" />
              Back
            </button>

            <div className="text-center">
              <p className="text-sm text-muted-foreground mb-4">
                Enter the 6-digit code sent to <span className="font-medium text-foreground">{phone}</span>
              </p>
              
              <div className="flex justify-center mb-6">
                <InputOTP
                  maxLength={6}
                  value={otp}
                  onChange={setOtp}
                  className="gap-2"
                >
                  <InputOTPGroup>
                    <InputOTPSlot index={0} className="w-10 h-12 sm:w-12 sm:h-14 text-lg" />
                    <InputOTPSlot index={1} className="w-10 h-12 sm:w-12 sm:h-14 text-lg" />
                    <InputOTPSlot index={2} className="w-10 h-12 sm:w-12 sm:h-14 text-lg" />
                    <InputOTPSlot index={3} className="w-10 h-12 sm:w-12 sm:h-14 text-lg" />
                    <InputOTPSlot index={4} className="w-10 h-12 sm:w-12 sm:h-14 text-lg" />
                    <InputOTPSlot index={5} className="w-10 h-12 sm:w-12 sm:h-14 text-lg" />
                  </InputOTPGroup>
                </InputOTP>
              </div>

              <Button
                onClick={handleVerifyOtp}
                className="w-full bg-gradient-primary shadow-glow touch-target-lg h-12"
                disabled={loading || otp.length !== 6}
              >
                {loading ? (
                  <>
                    <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                    Verifying...
                  </>
                ) : (
                  'Verify OTP'
                )}
              </Button>

              <div className="mt-4">
                {countdown > 0 ? (
                  <p className="text-sm text-muted-foreground">
                    Resend code in <span className="font-medium text-primary">{countdown}s</span>
                  </p>
                ) : (
                  <button
                    onClick={handleResendOtp}
                    className="text-sm text-primary hover:underline touch-target py-2"
                    disabled={loading}
                  >
                    Resend OTP
                  </button>
                )}
              </div>
            </div>
          </div>
        ) : (
          <>
            {/* Auth Method Tabs */}
            <Tabs value={authMethod} onValueChange={(v) => setAuthMethod(v as AuthMethod)} className="mb-6">
              {SHOW_PHONE_LOGIN && (
                <TabsList className="grid w-full grid-cols-2 h-11">
                  <TabsTrigger value="email" className="flex items-center gap-2 touch-target">
                    <Mail className="w-4 h-4" />
                    <span>Email</span>
                  </TabsTrigger>
                  <TabsTrigger value="phone" className="flex items-center gap-2 touch-target">
                    <Phone className="w-4 h-4" />
                    <span>Phone</span>
                  </TabsTrigger>
                </TabsList>
              )}

              {/* Email Tab */}
              <TabsContent value="email" className="mt-4">
                <form onSubmit={handleEmailAuth} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="email" className="text-sm">Email</Label>
                    <Input
                      id="email"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                      className="input-mobile bg-secondary"
                      placeholder="you@example.com"
                      autoComplete="email"
                    />
                  </div>

                  {!isLogin && (
                    <>
                      <div className="space-y-2">
                        <Label htmlFor="username" className="text-sm">Username</Label>
                        <Input
                          id="username"
                          type="text"
                          value={username}
                          onChange={(e) => setUsername(e.target.value)}
                          required
                          className="input-mobile bg-secondary"
                          placeholder="johndoe"
                          autoComplete="username"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="displayName" className="text-sm">Display Name</Label>
                        <Input
                          id="displayName"
                          type="text"
                          value={displayName}
                          onChange={(e) => setDisplayName(e.target.value)}
                          required
                          className="input-mobile bg-secondary"
                          placeholder="John Doe"
                          autoComplete="name"
                        />
                      </div>
                    </>
                  )}

                  <div className="space-y-2">
                    <Label htmlFor="password" className="text-sm">Password</Label>
                    <div className="relative">
                      <Input
                        id="password"
                        type={showPassword ? 'text' : 'password'}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                        className="input-mobile bg-secondary pr-10"
                        placeholder="••••••••"
                        autoComplete={isLogin ? "current-password" : "new-password"}
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(v => !v)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                        tabIndex={-1}
                        aria-label={showPassword ? 'Hide password' : 'Show password'}
                      >
                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  <Button 
                    type="submit" 
                    className="w-full bg-gradient-primary shadow-glow touch-target-lg h-12"
                    disabled={loading}
                  >
                    {loading ? (
                      <>
                        <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                        Please wait...
                      </>
                    ) : (
                      <>
                        <Mail className="w-5 h-5 mr-2" />
                        {isLogin ? 'Sign In with Email' : 'Sign Up with Email'}
                      </>
                    )}
                  </Button>
                </form>
              </TabsContent>

              {/* Phone Tab */}
              {SHOW_PHONE_LOGIN && (
                <TabsContent value="phone" className="mt-4">
                  <form onSubmit={handleSendOtp} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="phone" className="text-sm">Phone Number</Label>
                      <Input
                        id="phone"
                        type="tel"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        required
                        className="input-mobile bg-secondary"
                        placeholder="+1234567890"
                        autoComplete="tel"
                      />
                      <p className="text-xs text-muted-foreground">Include country code (e.g., +1 for US, +91 for India)</p>
                    </div>

                    <Button 
                      type="submit" 
                      className="w-full bg-gradient-primary shadow-glow touch-target-lg h-12"
                      disabled={loading}
                    >
                      {loading ? (
                        <>
                          <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                          Sending OTP...
                        </>
                      ) : (
                        <>
                          <Phone className="w-5 h-5 mr-2" />
                          Continue with Phone
                        </>
                      )}
                    </Button>
                  </form>
                </TabsContent>
              )}
            </Tabs>

            {/* Divider */}
            <div className="relative my-6">
              <Separator />
              <span className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 bg-card px-3 text-xs text-muted-foreground">
                or continue with
              </span>
            </div>

            {/* Google OAuth Button */}
            <Button
              type="button"
              variant="outline"
              className="w-full touch-target-lg h-12 gap-3"
              onClick={handleGoogleAuth}
              disabled={loading}
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24">
                <path
                  fill="#4285F4"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="#34A853"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                />
                <path
                  fill="#EA4335"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                />
              </svg>
              Continue with Google
            </Button>

            {/* Toggle Login/Signup */}
            <div className="mt-6 text-center">
              <button
                onClick={() => setIsLogin(!isLogin)}
                className="text-sm text-muted-foreground hover:text-foreground transition-colors touch-target py-2"
              >
                {isLogin ? "Don't have an account? Sign up" : 'Already have an account? Sign in'}
              </button>
            </div>
          </>
        )}
      </Card>
    </div>
    </>
  );
};

export default Auth;
