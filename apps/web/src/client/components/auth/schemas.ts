import { z } from "zod";

/**
 * Email validation schema
 */
export const emailSchema = z
  .string()
  .email("Please enter a valid email address");

/**
 * Password validation schema with security requirements
 */
export const passwordSchema = z
  .string()
  .min(8, "Password must be at least 8 characters")
  .regex(/[a-z]/, "Password must contain at least one lowercase letter")
  .regex(/[0-9]/, "Password must contain at least one number")
  .regex(
    /[^a-zA-Z0-9]/,
    "Password must contain at least one special character"
  );

/**
 * OTP validation schema (8 digits)
 */
export const otpSchema = z
  .string()
  .length(8, "OTP code must be 8 digits")
  .regex(/^\d+$/, "OTP code must contain only digits");

/**
 * Magic link form schema
 */
export const magicLinkFormSchema = z.object({
  email: emailSchema,
});

/**
 * Password login form schema
 */
export const passwordLoginFormSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, "Password is required"),
});

/**
 * Password signup form schema
 */
export const passwordSignupFormSchema = z
  .object({
    email: emailSchema,
    password: passwordSchema,
    confirmPassword: z.string().min(1, "Please confirm your password"),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

/**
 * OTP verification form schema
 */
export const otpFormSchema = z.object({
  otp: otpSchema,
});
