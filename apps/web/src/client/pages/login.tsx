import { Turnstile, type TurnstileInstance } from "@marsidev/react-turnstile";
import { Button } from "@yapmate/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@yapmate/components/ui/card";
import { Lock, Mail } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { EmailConfirmationView } from "../components/auth/email-confirmation-view";
import { EmailForm } from "../components/auth/email-form";
import { OtpForm } from "../components/auth/otp-form";
import { PasswordForm } from "../components/auth/password-form";
import { SuccessView } from "../components/auth/success-view";
import { useUser } from "../contexts/user-context";
import {
  sendMagicLink,
  signInWithPassword,
  signUpWithPassword,
  verifyOtp,
} from "../lib/auth";
import { createClient } from "../lib/supabase/client";

type Mode = "login" | "signup";
type AuthMethod = "password" | "magiclink";

/**
 * Login page with password and magic link authentication
 * Supports both login and signup modes
 * Redirects authenticated users to home page
 */
const TURNSTILE_SITE_KEY = process.env.PUBLIC_TURNSTILE_SITE_KEY;

/**
 * Gets URL scheme for mobile deep link redirect
 */
const getMobileScheme = () => {
  const searchParams = new URLSearchParams(window.location.search);
  const scheme = searchParams.get("scheme");
  return scheme || "yapmate";
};

/**
 * Checks if this is a mobile auth flow
 */
const isMobileAuth = () => {
  const searchParams = new URLSearchParams(window.location.search);
  return searchParams.get("mobile") === "true";
};

/**
 * Redirects to mobile app with session tokens
 */
const redirectToMobileApp = async () => {
  const supabase = createClient();
  const { data } = await supabase.auth.getSession();
  if (data.session) {
    const scheme = getMobileScheme();
    const redirectUrl = `${scheme}://auth/callback?access_token=${data.session.access_token}&refresh_token=${data.session.refresh_token}&expires_in=${data.session.expires_in}`;
    window.location.href = redirectUrl;
  }
};

export const LoginPage = () => {
  const { user, isLoading } = useUser();
  const [mode, setMode] = useState<Mode>("login");
  const [authMethod, setAuthMethod] = useState<AuthMethod>("magiclink");
  const [email, setEmail] = useState("");
  const [showOtpInput, setShowOtpInput] = useState(false);
  const [needsEmailConfirmation, setNeedsEmailConfirmation] = useState(false);
  const [isPending, setIsPending] = useState(false);
  const [isVerifyingOtp, setIsVerifyingOtp] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [captchaToken, setCaptchaToken] = useState<string>();
  const turnstileRef = useRef<TurnstileInstance>(null);

  /**
   * Redirect authenticated users to home page, redirect URL, or mobile app
   */
  useEffect(() => {
    if (!isLoading && user) {
      if (isMobileAuth()) {
        redirectToMobileApp();
        return;
      }

      const urlParams = new URLSearchParams(window.location.search);
      const redirect = urlParams.get("redirect");
      const redirectPath = redirect || "/";

      window.history.pushState(null, "", redirectPath);
      window.dispatchEvent(new PopStateEvent("popstate"));
    }
  }, [isLoading, user]);

  /**
   * Resets captcha widget for retry
   */
  const resetCaptcha = () => {
    turnstileRef.current?.reset();
    setCaptchaToken(undefined);
  };

  /**
   * Handles password-based authentication
   */
  const handlePasswordSubmit = async (values: {
    email: string;
    password: string;
  }) => {
    setIsPending(true);
    setAuthError(null);
    sessionStorage.setItem("auth_method", "password");

    const result =
      mode === "login"
        ? await signInWithPassword(
            values.email.trim(),
            values.password,
            captchaToken
          )
        : await signUpWithPassword(
            values.email.trim(),
            values.password,
            captchaToken
          );

    if (result.success) {
      if (result.needsEmailConfirmation) {
        setNeedsEmailConfirmation(true);
      } else if (isMobileAuth()) {
        await redirectToMobileApp();
        return;
      }
      // Redirect will happen via useEffect when user state updates
    } else {
      setAuthError(result.error ?? "An error occurred");
      resetCaptcha();
    }
    setIsPending(false);
  };

  /**
   * Handles magic link submission
   */
  const handleMagicLinkSubmit = async (emailValue: string) => {
    setIsPending(true);
    setAuthError(null);
    setEmail(emailValue.trim());
    sessionStorage.setItem("auth_method", "magic_link");

    const result = await sendMagicLink(
      emailValue.trim(),
      undefined,
      captchaToken
    );

    if (result.success) {
      setShowSuccess(true);
    } else {
      setAuthError(result.error ?? "An error occurred");
      resetCaptcha();
    }
    setIsPending(false);
  };

  /**
   * Handles OTP verification
   */
  const handleOtpVerify = async (otp: string) => {
    setIsVerifyingOtp(true);
    setAuthError(null);

    const result = await verifyOtp(email.trim(), otp.trim(), "email");

    if (result.success) {
      if (isMobileAuth()) {
        await redirectToMobileApp();
        return;
      }
      // Redirect will happen via useEffect when user state updates
    } else {
      setAuthError(result.error ?? "An error occurred");
    }
    setIsVerifyingOtp(false);
  };

  /**
   * Returns to email input from OTP view
   */
  const handleBackToEmail = () => {
    setShowOtpInput(false);
    setShowSuccess(false);
    setAuthError(null);
  };

  /**
   * Handles switching auth method
   */
  const handleAuthMethodToggle = () => {
    setAuthMethod(authMethod === "password" ? "magiclink" : "password");
    setAuthError(null);
  };

  /**
   * Handles switching mode
   */
  const handleModeToggle = () => {
    setMode(mode === "login" ? "signup" : "login");
    setAuthError(null);
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

  // Show loading while checking auth or if already authenticated (redirecting)
  if (isLoading || user) {
    return null;
  }

  // Email confirmation required (password signup with confirm email enabled)
  if (needsEmailConfirmation) {
    return (
      <EmailConfirmationView
        email={email}
        onBackToSignIn={() => {
          setNeedsEmailConfirmation(false);
          setMode("login");
          setEmail("");
        }}
      />
    );
  }

  // Success state - show confirmation (only for magic link)
  if (showSuccess && authMethod === "magiclink") {
    return (
      <SuccessView
        email={email}
        onEnterCode={() => {
          setShowSuccess(false);
          setShowOtpInput(true);
        }}
        onUseDifferentEmail={() => {
          setShowSuccess(false);
          setEmail("");
        }}
      />
    );
  }

  // OTP input view - shown after magic link is sent
  if (showOtpInput) {
    return (
      <div className="flex min-h-svh items-center justify-center bg-linear-to-br from-background via-background to-accent/20 p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 flex size-16 items-center justify-center rounded-full bg-primary/10">
              <Mail className="size-8 text-primary" />
            </div>
            <CardTitle className="text-2xl">Enter verification code</CardTitle>
            <CardDescription className="text-base">
              We sent an 8-digit code to{" "}
              <span className="font-medium text-foreground">{email}</span>
            </CardDescription>
          </CardHeader>
          <CardContent>
            {authError ? (
              <div className="mb-4 rounded-lg bg-destructive/10 p-3">
                <p className="text-destructive text-sm">{authError}</p>
              </div>
            ) : null}
            <OtpForm
              email={email}
              isPending={isVerifyingOtp}
              onBack={handleBackToEmail}
              onSubmit={handleOtpVerify}
            />
          </CardContent>
        </Card>
      </div>
    );
  }

  // Default state - login form
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
          {authError ? (
            <div className="mb-4 rounded-lg bg-destructive/10 p-3">
              <p className="text-destructive text-sm">{authError}</p>
            </div>
          ) : null}
          {authMethod === "password" ? (
            <PasswordForm
              defaultEmail={email}
              isPending={isPending}
              mode={mode}
              onSubmit={handlePasswordSubmit}
            />
          ) : (
            <EmailForm
              defaultEmail={email}
              isPending={isPending}
              onSubmit={handleMagicLinkSubmit}
            />
          )}
          {TURNSTILE_SITE_KEY ? (
            <div className="mt-4 flex justify-center">
              <Turnstile
                onExpire={resetCaptcha}
                onSuccess={setCaptchaToken}
                ref={turnstileRef}
                siteKey={TURNSTILE_SITE_KEY}
              />
            </div>
          ) : null}
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
