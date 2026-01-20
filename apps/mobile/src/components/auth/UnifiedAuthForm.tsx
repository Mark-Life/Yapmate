import { router } from "expo-router";
import { useState } from "react";
import { Alert, View } from "react-native";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Text } from "@/components/ui/text";
import { useSession } from "@/contexts/auth";
import { generateAPIUrl } from "@/lib/api-url";

interface UnifiedAuthFormProps {
  type: "login" | "signup";
}

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Email input field component
 */
function EmailInput({
  email,
  error,
  onChange,
}: {
  email: string;
  error?: string;
  onChange: (text: string) => void;
}) {
  return (
    <View>
      <Label className="mb-2">
        <Text className="font-medium text-foreground text-sm">Email</Text>
      </Label>
      <Input
        autoCapitalize="none"
        autoComplete="email"
        className={error ? "border-red-500" : ""}
        keyboardType="email-address"
        onChangeText={onChange}
        placeholder="your@email.com"
        textContentType="emailAddress"
        value={email}
      />
      {error ? (
        <Text className="mt-1 text-red-500 text-sm">{error}</Text>
      ) : null}
    </View>
  );
}

/**
 * Password input field component
 */
function PasswordInput({
  password,
  error,
  onChange,
}: {
  password: string;
  error?: string;
  onChange: (text: string) => void;
}) {
  return (
    <View>
      <Label className="mb-2">
        <Text className="font-medium text-foreground text-sm">Password</Text>
      </Label>
      <Input
        autoCapitalize="none"
        className={error ? "border-red-500" : ""}
        onChangeText={onChange}
        placeholder="Password"
        secureTextEntry
        value={password}
      />
      {error ? (
        <Text className="mt-1 text-red-500 text-sm">{error}</Text>
      ) : null}
    </View>
  );
}

/**
 * OTP input field component
 */
function OtpInput({
  otp,
  error,
  onChange,
}: {
  otp: string;
  error?: string;
  onChange: (text: string) => void;
}) {
  return (
    <View>
      <Label className="mb-2">
        <Text className="font-medium text-foreground text-sm">OTP Code</Text>
      </Label>
      <Input
        keyboardType="number-pad"
        maxLength={8}
        onChangeText={onChange}
        placeholder="Enter 8-digit code"
        value={otp}
      />
      {error ? (
        <Text className="mt-1 text-red-500 text-sm">{error}</Text>
      ) : null}
    </View>
  );
}

/**
 * Unified authentication form component
 * Supports both email/password and magic link authentication
 */
export function UnifiedAuthForm({ type }: UnifiedAuthFormProps) {
  const { signIn, signUp, sendMagicLink, verifyOtp } = useSession();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [otp, setOtp] = useState("");
  const [authMethod, setAuthMethod] = useState<"password" | "magiclink">(
    "magiclink"
  );
  const [showOtpInput, setShowOtpInput] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isVerifyingOtp, setIsVerifyingOtp] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<{
    email?: string;
    password?: string;
    otp?: string;
  }>({});

  const isLogin = type === "login";
  const buttonText = isLogin ? "Sign In" : "Sign Up";

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

  const validatePassword = (): boolean => {
    const errors: { password?: string } = {};

    if (!password.trim()) {
      errors.password = "Password is required";
    } else if (password.length < 8) {
      errors.password = "Password must be at least 8 characters";
    }

    setFieldErrors((prev) => ({ ...prev, ...errors }));
    return Object.keys(errors).length === 0;
  };

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

  const handlePasswordSubmit = async () => {
    if (!(validateEmail() && validatePassword())) {
      return;
    }

    setIsLoading(true);
    try {
      if (isLogin) {
        await signIn(email.trim(), password);
        Alert.alert("Success", "You have been successfully signed in!");
        router.replace("/");
      } else {
        const redirectTo = generateAPIUrl("/auth/mobile");
        await signUp(email.trim(), password, redirectTo);
        Alert.alert(
          "Success",
          "Account created! Please check your email for verification."
        );
      }
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "An error occurred";
      Alert.alert("Error", errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const handleMagicLinkSubmit = async () => {
    if (!validateEmail()) {
      return;
    }

    setIsLoading(true);
    try {
      // Get redirect URL for magic link using API URL
      const redirectTo = generateAPIUrl("/auth/mobile");

      await sendMagicLink(email.trim(), redirectTo);
      Alert.alert(
        "Check your email",
        "We've sent you a magic link. You can also enter the 8-digit code from the email."
      );
      setShowOtpInput(true);
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "An error occurred";
      Alert.alert("Error", errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const handleOtpVerify = async () => {
    if (!validateOtp()) {
      return;
    }

    setIsVerifyingOtp(true);
    try {
      await verifyOtp(email.trim(), otp.trim(), "email");
      Alert.alert("Success", "Successfully authenticated!");
      router.replace("/");
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "An error occurred";
      Alert.alert("Error", errorMessage);
    } finally {
      setIsVerifyingOtp(false);
    }
  };

  const handleBackToEmail = () => {
    setShowOtpInput(false);
    setOtp("");
    setFieldErrors((prev) => ({ ...prev, otp: undefined }));
  };

  const handleEmailChange = (text: string) => {
    setEmail(text);
    if (fieldErrors.email) {
      setFieldErrors({ ...fieldErrors, email: undefined });
    }
  };

  const handlePasswordChange = (text: string) => {
    setPassword(text);
    if (fieldErrors.password) {
      setFieldErrors({ ...fieldErrors, password: undefined });
    }
  };

  const handleOtpChange = (text: string) => {
    setOtp(text);
    if (fieldErrors.otp) {
      setFieldErrors({ ...fieldErrors, otp: undefined });
    }
  };

  const getButtonText = () => {
    if (isLoading) {
      return "Please wait...";
    }
    if (authMethod === "password") {
      return buttonText;
    }
    return "Send Login Link";
  };

  const getToggleText = () => {
    if (authMethod === "password") {
      return "Use Login Link instead";
    }
    return "Use password instead";
  };

  if (showOtpInput) {
    return (
      <View className="w-full gap-4 space-y-6 px-6">
        <View>
          <Label className="mb-2">
            <Text className="font-medium text-foreground text-sm">Email</Text>
          </Label>
          <Input className="bg-muted" editable={false} value={email} />
        </View>

        <OtpInput
          error={fieldErrors.otp}
          onChange={handleOtpChange}
          otp={otp}
        />

        <View className="flex-row gap-3">
          <Button
            className="flex-1"
            disabled={isVerifyingOtp}
            onPress={handleBackToEmail}
            variant="outline"
          >
            <Text className="font-medium text-foreground">Back</Text>
          </Button>
          <Button
            className="flex-1"
            disabled={isVerifyingOtp}
            onPress={handleOtpVerify}
          >
            <Text className="font-medium text-primary-foreground">
              {isVerifyingOtp ? "Verifying..." : "Verify OTP"}
            </Text>
          </Button>
        </View>

        <View className="mt-4 rounded-lg bg-muted p-4">
          <Text className="text-muted-foreground text-sm">
            💡 You can also click the link in your email to sign in
            automatically.
          </Text>
        </View>
      </View>
    );
  }

  return (
    <View className="w-full gap-4 space-y-6 px-6">
      <EmailInput
        email={email}
        error={fieldErrors.email}
        onChange={handleEmailChange}
      />

      {authMethod === "password" ? (
        <PasswordInput
          error={fieldErrors.password}
          onChange={handlePasswordChange}
          password={password}
        />
      ) : null}

      <Button
        className="mt-4 w-full"
        disabled={isLoading}
        onPress={
          authMethod === "password"
            ? handlePasswordSubmit
            : handleMagicLinkSubmit
        }
      >
        <Text className="font-medium text-primary-foreground">
          {getButtonText()}
        </Text>
      </Button>

      <View className="mt-4">
        <Button
          onPress={() =>
            setAuthMethod(authMethod === "password" ? "magiclink" : "password")
          }
          variant="ghost"
        >
          <Text className="text-muted-foreground">{getToggleText()}</Text>
        </Button>
      </View>
    </View>
  );
}

export default UnifiedAuthForm;
