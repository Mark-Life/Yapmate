import { Button } from "@yapmate/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@yapmate/components/ui/card";
import { Input } from "@yapmate/components/ui/input";
import { CheckCircle2, KeyRound, Loader2, Lock, Mail } from "lucide-react";
import { useEffect, useState } from "react";
import { z } from "zod";
import { useUser } from "../contexts/user-context";
import {
  sendMagicLink,
  signInWithPassword,
  signUpWithPassword,
  verifyOtp,
} from "../lib/auth";

type State = "idle" | "loading" | "success" | "error";
type Mode = "login" | "signup";
type AuthMethod = "password" | "magiclink";

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Password validation schema with security requirements
 */
const passwordSchema = z
  .string()
  .min(8, "Password must be at least 8 characters")
  .regex(/[a-z]/, "Password must contain at least one lowercase letter")
  .regex(/[0-9]/, "Password must contain at least one number")
  .regex(
    /[^a-zA-Z0-9]/,
    "Password must contain at least one special character"
  );

/**
 * Email input field component
 */
const EmailInput = ({
  email,
  error,
  onChange,
  disabled,
}: {
  email: string;
  error?: string;
  onChange: (value: string) => void;
  disabled?: boolean;
}) => (
  <div className="space-y-2">
    <Input
      autoComplete="email"
      autoFocus
      disabled={disabled}
      onChange={(e) => onChange(e.target.value)}
      placeholder="you@example.com"
      required
      type="email"
      value={email}
    />
    {error ? <p className="text-destructive text-sm">{error}</p> : null}
  </div>
);

/**
 * Password input field component
 */
const PasswordInput = ({
  password,
  error,
  onChange,
  disabled,
}: {
  password: string;
  error?: string;
  onChange: (value: string) => void;
  disabled?: boolean;
}) => (
  <div className="space-y-2">
    <Input
      autoComplete={password ? "current-password" : "new-password"}
      disabled={disabled}
      onChange={(e) => onChange(e.target.value)}
      placeholder="Password"
      required
      type="password"
      value={password}
    />
    {error ? <p className="text-destructive text-sm">{error}</p> : null}
  </div>
);

/**
 * Confirm password input field component
 */
const ConfirmPasswordInput = ({
  confirmPassword,
  error,
  onChange,
  disabled,
}: {
  confirmPassword: string;
  error?: string;
  onChange: (value: string) => void;
  disabled?: boolean;
}) => (
  <div className="space-y-2">
    <Input
      autoComplete="new-password"
      disabled={disabled}
      onChange={(e) => onChange(e.target.value)}
      placeholder="Confirm password"
      required
      type="password"
      value={confirmPassword}
    />
    {error ? <p className="text-destructive text-sm">{error}</p> : null}
  </div>
);

/**
 * OTP input field component
 */
const OtpInput = ({
  otp,
  error,
  onChange,
  disabled,
}: {
  otp: string;
  error?: string;
  onChange: (value: string) => void;
  disabled?: boolean;
}) => (
  <div className="space-y-2">
    <Input
      disabled={disabled}
      maxLength={8}
      onChange={(e) => {
        const value = e.target.value.replace(/\D/g, "");
        onChange(value);
      }}
      placeholder="Enter 8-digit code"
      required
      type="text"
      value={otp}
    />
    {error ? <p className="text-destructive text-sm">{error}</p> : null}
  </div>
);

/**
 * Login page with password and magic link authentication
 * Supports both login and signup modes
 * Redirects authenticated users to home page
 */
export const LoginPage = () => {
  const { user, isLoading } = useUser();
  const [mode, setMode] = useState<Mode>("login");
  const [authMethod, setAuthMethod] = useState<AuthMethod>("magiclink");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [otp, setOtp] = useState("");
  const [showOtpInput, setShowOtpInput] = useState(false);
  const [needsEmailConfirmation, setNeedsEmailConfirmation] = useState(false);
  const [state, setState] = useState<State>("idle");
  const [isPending, setIsPending] = useState(false);
  const [isVerifyingOtp, setIsVerifyingOtp] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<{
    email?: string;
    password?: string;
    confirmPassword?: string;
    otp?: string;
  }>({});

  /**
   * Redirect authenticated users to home page
   */
  useEffect(() => {
    if (!isLoading && user) {
      window.history.pushState(null, "", "/");
      window.dispatchEvent(new PopStateEvent("popstate"));
    }
  }, [isLoading, user]);

  /**
   * Validates email format
   */
  const validateEmail = (): boolean => {
    const errors: { email?: string } = {};

    if (!email.trim()) {
      errors.email = "Email is required";
    } else if (!EMAIL_REGEX.test(email)) {
      errors.email = "Please enter a valid email address";
    }

    setFieldErrors((prev) => ({ ...prev, ...errors }));
    return Object.keys(errors).length === 0;
  };

  /**
   * Validates password using Zod schema
   */
  const validatePasswordWithZod = (): string | null => {
    if (password.trim()) {
      const result = passwordSchema.safeParse(password);
      if (result.success) {
        return null;
      }
      return result.error.issues[0]?.message ?? "Invalid password";
    }
    return "Password is required";
  };

  /**
   * Validates confirm password matches
   */
  const validateConfirmPassword = (): string | null => {
    if (!confirmPassword.trim()) {
      return "Please confirm your password";
    }
    if (password !== confirmPassword) {
      return "Passwords do not match";
    }
    return null;
  };

  /**
   * Validates password requirements using Zod schema
   */
  const validatePassword = (): boolean => {
    const errors: { password?: string; confirmPassword?: string } = {};

    const passwordError = validatePasswordWithZod();
    if (passwordError) {
      errors.password = passwordError;
    }

    // For signup, validate confirm password
    if (mode === "signup") {
      const confirmError = validateConfirmPassword();
      if (confirmError) {
        errors.confirmPassword = confirmError;
      }
    }

    setFieldErrors((prev) => ({ ...prev, ...errors }));
    return Object.keys(errors).length === 0;
  };

  /**
   * Validates OTP code format
   */
  const validateOtp = (): boolean => {
    const errors: { otp?: string } = {};

    if (!otp.trim()) {
      errors.otp = "OTP code is required";
    } else if (otp.length !== 8) {
      errors.otp = "OTP code must be 8 digits";
    }

    setFieldErrors((prev) => ({ ...prev, ...errors }));
    return Object.keys(errors).length === 0;
  };

  /**
   * Handles password-based authentication
   */
  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!(validateEmail() && validatePassword())) {
      return;
    }

    setIsPending(true);
    setState("loading");
    setFieldErrors({});

    const result =
      mode === "login"
        ? await signInWithPassword(email.trim(), password)
        : await signUpWithPassword(email.trim(), password);

    if (result.success) {
      // Check if email confirmation is required (signup with confirm email enabled)
      if (result.needsEmailConfirmation) {
        setNeedsEmailConfirmation(true);
      }
      setState("success");
      // Redirect will happen via useEffect when user state updates (if session exists)
    } else {
      setState("error");
      setFieldErrors({ password: result.error });
    }
    setIsPending(false);
  };

  /**
   * Handles magic link submission
   */
  const handleMagicLinkSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateEmail()) {
      return;
    }

    setIsPending(true);
    setState("loading");
    setFieldErrors({});

    const result = await sendMagicLink(email.trim());

    if (result.success) {
      setState("success");
      setShowOtpInput(true);
    } else {
      setState("error");
      setFieldErrors({ email: result.error });
    }
    setIsPending(false);
  };

  /**
   * Handles OTP verification
   */
  const handleOtpVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateOtp()) {
      return;
    }

    setIsVerifyingOtp(true);
    setFieldErrors({});

    const result = await verifyOtp(email.trim(), otp.trim(), "email");

    if (result.success) {
      setState("success");
      // Redirect will happen via useEffect when user state updates
    } else {
      setFieldErrors({ otp: result.error });
    }
    setIsVerifyingOtp(false);
  };

  /**
   * Returns to email input from OTP view
   */
  const handleBackToEmail = () => {
    setShowOtpInput(false);
    setOtp("");
    setState("idle");
    setFieldErrors((prev) => ({ ...prev, otp: undefined }));
  };

  /**
   * Clears email error when user types
   */
  const handleEmailChange = (value: string) => {
    setEmail(value);
    if (fieldErrors.email) {
      setFieldErrors((prev) => ({ ...prev, email: undefined }));
    }
  };

  /**
   * Clears password error when user types
   */
  const handlePasswordChange = (value: string) => {
    setPassword(value);
    if (fieldErrors.password) {
      setFieldErrors((prev) => ({ ...prev, password: undefined }));
    }
    // Clear confirm password error if passwords now match
    if (
      fieldErrors.confirmPassword &&
      mode === "signup" &&
      value === confirmPassword
    ) {
      setFieldErrors((prev) => ({ ...prev, confirmPassword: undefined }));
    }
  };

  /**
   * Clears confirm password error when user types
   */
  const handleConfirmPasswordChange = (value: string) => {
    setConfirmPassword(value);
    if (fieldErrors.confirmPassword) {
      setFieldErrors((prev) => ({ ...prev, confirmPassword: undefined }));
    }
  };

  /**
   * Clears OTP error when user types
   */
  const handleOtpChange = (value: string) => {
    setOtp(value);
    if (fieldErrors.otp) {
      setFieldErrors((prev) => ({ ...prev, otp: undefined }));
    }
  };

  /**
   * Handles switching auth method and clears confirm password
   */
  const handleAuthMethodToggle = () => {
    setAuthMethod(authMethod === "password" ? "magiclink" : "password");
    setConfirmPassword("");
    setFieldErrors((prev) => ({
      ...prev,
      confirmPassword: undefined,
    }));
  };

  /**
   * Handles switching mode and clears confirm password
   */
  const handleModeToggle = () => {
    setMode(mode === "login" ? "signup" : "login");
    setConfirmPassword("");
    setFieldErrors((prev) => ({
      ...prev,
      confirmPassword: undefined,
    }));
  };

  /**
   * Gets the card description text based on mode and auth method
   */
  const getCardDescription = (): string => {
    if (mode === "login") {
      return authMethod === "password"
        ? "Sign in to your account"
        : "Enter your email to receive a link to sign in.";
    }
    return authMethod === "password"
      ? "Create a new account"
      : "Enter your email to receive a link to sign up.";
  };

  /**
   * Gets the button text based on state and auth method
   */
  const getButtonText = (): string => {
    if (isPending) {
      return authMethod === "password" ? buttonText : "Sending...";
    }
    return authMethod === "password" ? buttonText : "Send login link";
  };

  /**
   * Renders the OTP input view
   */
  const renderOtpView = () => (
    <div className="flex min-h-svh items-center justify-center bg-linear-to-br from-background via-background to-accent/20 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 flex size-16 items-center justify-center rounded-full bg-primary/10">
            <KeyRound className="size-8 text-primary" />
          </div>
          <CardTitle className="text-2xl">Enter verification code</CardTitle>
          <CardDescription className="text-base">
            We sent an 8-digit code to{" "}
            <span className="font-medium text-foreground">{email}</span>
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form className="space-y-4" onSubmit={handleOtpVerify}>
            <div className="space-y-2">
              <Input className="bg-muted" disabled type="email" value={email} />
            </div>
            <OtpInput
              disabled={isVerifyingOtp}
              error={fieldErrors.otp}
              onChange={handleOtpChange}
              otp={otp}
            />
            <div className="flex gap-3">
              <Button
                className="flex-1"
                disabled={isVerifyingOtp}
                onClick={handleBackToEmail}
                type="button"
                variant="outline"
              >
                Back
              </Button>
              <Button
                className="flex-1"
                disabled={isVerifyingOtp}
                type="submit"
              >
                {isVerifyingOtp ? (
                  <>
                    <Loader2 className="animate-spin" />
                    Verifying...
                  </>
                ) : (
                  "Verify OTP"
                )}
              </Button>
            </div>
            <div className="mt-4 rounded-lg bg-muted p-4">
              <p className="text-muted-foreground text-sm">
                💡 You can also click the link in your email to sign in
                automatically.
              </p>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );

  /**
   * Renders the success view for magic link
   */
  const renderSuccessView = () => (
    <div className="flex min-h-svh items-center justify-center bg-linear-to-br from-background via-background to-accent/20 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 flex size-16 items-center justify-center rounded-full bg-primary/10">
            <CheckCircle2 className="size-8 text-primary" />
          </div>
          <CardTitle className="text-2xl">Check your email</CardTitle>
          <CardDescription className="text-base">
            We sent a link to{" "}
            <span className="font-medium text-foreground">{email}</span>
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 text-center">
          <p className="text-muted-foreground text-sm">
            Click the link in your email to sign in. <br />
            The link expires in 1 hour.
          </p>
          <Button
            className="text-muted-foreground"
            onClick={() => {
              setState("idle");
              setEmail("");
              setShowOtpInput(true);
            }}
            variant="ghost"
          >
            Enter code instead
          </Button>
          <Button
            className="text-muted-foreground"
            onClick={() => {
              setState("idle");
              setEmail("");
            }}
            variant="ghost"
          >
            Use a different email
          </Button>
        </CardContent>
      </Card>
    </div>
  );

  /**
   * Renders the email confirmation required view (for password signup)
   */
  const renderEmailConfirmationView = () => (
    <div className="flex min-h-svh items-center justify-center bg-linear-to-br from-background via-background to-accent/20 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 flex size-16 items-center justify-center rounded-full bg-primary/10">
            <Mail className="size-8 text-primary" />
          </div>
          <CardTitle className="text-2xl">Confirm your email</CardTitle>
          <CardDescription className="text-base">
            We sent a confirmation link to{" "}
            <span className="font-medium text-foreground">{email}</span>
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 text-center">
          <p className="text-muted-foreground text-sm">
            Please check your inbox and click the link to verify your email
            address. After confirming, you can sign in with your password.
          </p>
          <Button
            className="text-muted-foreground"
            onClick={() => {
              setState("idle");
              setNeedsEmailConfirmation(false);
              setPassword("");
              setConfirmPassword("");
              setMode("login");
            }}
            variant="ghost"
          >
            Back to sign in
          </Button>
        </CardContent>
      </Card>
    </div>
  );

  // Show loading while checking auth or if already authenticated (redirecting)
  if (isLoading || user) {
    return null;
  }

  // OTP input view - shown after magic link is sent
  if (showOtpInput) {
    return renderOtpView();
  }

  // Email confirmation required (password signup with confirm email enabled)
  if (needsEmailConfirmation) {
    return renderEmailConfirmationView();
  }

  // Success state - show confirmation (only for magic link)
  if (state === "success" && authMethod === "magiclink") {
    return renderSuccessView();
  }

  // Default state - login form
  const buttonText = mode === "login" ? "Sign In" : "Sign Up";
  const toggleText =
    mode === "login" ? "Don't have an account?" : "Already have an account?";
  const toggleActionText = mode === "login" ? "Sign Up" : "Sign In";

  return (
    <div className="flex min-h-svh items-center justify-center bg-linear-to-br from-background via-background to-accent/20 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 flex size-16 items-center justify-center rounded-full bg-primary/10">
            {authMethod === "password" ? (
              <Lock className="size-8 text-primary" />
            ) : (
              <Mail className="size-8 text-primary" />
            )}
          </div>
          <CardTitle className="text-2xl">
            {mode === "login" ? "Welcome Back" : "Get Started"}
          </CardTitle>
          <CardDescription>{getCardDescription()}</CardDescription>
        </CardHeader>
        <CardContent>
          <form
            className="space-y-4"
            onSubmit={
              authMethod === "password"
                ? handlePasswordSubmit
                : handleMagicLinkSubmit
            }
          >
            <EmailInput
              disabled={isPending}
              email={email}
              error={fieldErrors.email}
              onChange={handleEmailChange}
            />
            {authMethod === "password" ? (
              <>
                <PasswordInput
                  disabled={isPending}
                  error={fieldErrors.password}
                  onChange={handlePasswordChange}
                  password={password}
                />
                {mode === "signup" ? (
                  <ConfirmPasswordInput
                    confirmPassword={confirmPassword}
                    disabled={isPending}
                    error={fieldErrors.confirmPassword}
                    onChange={handleConfirmPasswordChange}
                  />
                ) : null}
              </>
            ) : null}
            <Button className="w-full" disabled={isPending} type="submit">
              {isPending ? (
                <>
                  <Loader2 className="animate-spin" />
                  {getButtonText()}
                </>
              ) : (
                getButtonText()
              )}
            </Button>
          </form>
          <div className="mt-4 space-y-3">
            <Button
              className="w-full"
              onClick={handleAuthMethodToggle}
              type="button"
              variant="ghost"
            >
              {authMethod === "password"
                ? "Use login link instead"
                : "Use password instead"}
            </Button>
            <div className="flex items-center justify-center gap-2 text-sm">
              <span className="text-muted-foreground">{toggleText}</span>
              <Button
                className="h-auto p-0"
                onClick={handleModeToggle}
                type="button"
                variant="link"
              >
                {toggleActionText}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
