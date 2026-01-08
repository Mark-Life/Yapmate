import { useForm } from "@tanstack/react-form";
import { Button } from "@yapmate/components/ui/button";
import {
  Field,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@yapmate/components/ui/field";
import { Input } from "@yapmate/components/ui/input";
import { Loader2 } from "lucide-react";
import { passwordLoginFormSchema, passwordSignupFormSchema } from "./schemas";

type PasswordFormProps = {
  mode: "login" | "signup";
  onSubmit: (values: { email: string; password: string }) => Promise<void>;
  isPending?: boolean;
  defaultEmail?: string;
};

/**
 * Extracts error message from TanStack Form error
 */
const getErrorMessage = (error: unknown): string | undefined => {
  if (typeof error === "string") {
    return error;
  }
  if (error && typeof error === "object" && "message" in error) {
    return String(error.message);
  }
};

/**
 * Password form component for login/signup authentication
 * Uses TanStack Form with Zod validation
 */
export const PasswordForm = ({
  mode,
  onSubmit,
  isPending = false,
  defaultEmail = "",
}: PasswordFormProps) => {
  const isLogin = mode === "login";
  const schema = isLogin ? passwordLoginFormSchema : passwordSignupFormSchema;

  const form = useForm({
    defaultValues: isLogin
      ? {
          email: defaultEmail,
          password: "",
        }
      : {
          email: defaultEmail,
          password: "",
          confirmPassword: "",
        },
    validators: {
      onChange: schema,
    },
    onSubmit: async ({ value }) => {
      await onSubmit({
        email: value.email,
        password: value.password,
      });
    },
  });

  const buttonText = isLogin ? "Sign In" : "Sign Up";

  return (
    <form
      className="space-y-4"
      onSubmit={(e) => {
        e.preventDefault();
        form.handleSubmit();
      }}
    >
      <FieldGroup>
        <form.Field
          children={(field) => {
            const isInvalid =
              field.state.meta.isTouched && !field.state.meta.isValid;

            return (
              <Field data-invalid={isInvalid}>
                <FieldLabel htmlFor={field.name}>Email</FieldLabel>
                <Input
                  aria-invalid={isInvalid}
                  autoComplete="email"
                  autoFocus
                  disabled={isPending}
                  id={field.name}
                  name={field.name}
                  onBlur={field.handleBlur}
                  onChange={(e) => field.handleChange(e.target.value)}
                  placeholder="you@example.com"
                  required
                  type="email"
                  value={field.state.value}
                />
                {isInvalid ? (
                  <FieldError
                    errors={field.state.meta.errors.map((error) => ({
                      message: getErrorMessage(error),
                    }))}
                  />
                ) : null}
              </Field>
            );
          }}
          name="email"
        />
        <form.Field
          children={(field) => {
            const isInvalid =
              field.state.meta.isTouched && !field.state.meta.isValid;

            return (
              <Field data-invalid={isInvalid}>
                <FieldLabel htmlFor={field.name}>Password</FieldLabel>
                <Input
                  aria-invalid={isInvalid}
                  autoComplete={isLogin ? "current-password" : "new-password"}
                  disabled={isPending}
                  id={field.name}
                  name={field.name}
                  onBlur={field.handleBlur}
                  onChange={(e) => field.handleChange(e.target.value)}
                  placeholder="Password"
                  required
                  type="password"
                  value={field.state.value}
                />
                {isInvalid ? (
                  <FieldError
                    errors={field.state.meta.errors.map((error) => ({
                      message: getErrorMessage(error),
                    }))}
                  />
                ) : null}
              </Field>
            );
          }}
          name="password"
        />
        {!isLogin && (
          <form.Field
            children={(field) => {
              const isInvalid =
                field.state.meta.isTouched && !field.state.meta.isValid;

              return (
                <Field data-invalid={isInvalid}>
                  <FieldLabel htmlFor={field.name}>Confirm Password</FieldLabel>
                  <Input
                    aria-invalid={isInvalid}
                    autoComplete="new-password"
                    disabled={isPending}
                    id={field.name}
                    name={field.name}
                    onBlur={field.handleBlur}
                    onChange={(e) => field.handleChange(e.target.value)}
                    placeholder="Confirm password"
                    required
                    type="password"
                    value={field.state.value}
                  />
                  {isInvalid ? (
                    <FieldError
                      errors={field.state.meta.errors.map((error) => ({
                        message: getErrorMessage(error),
                      }))}
                    />
                  ) : null}
                </Field>
              );
            }}
            name="confirmPassword"
          />
        )}
      </FieldGroup>
      <Button className="w-full" disabled={isPending} type="submit">
        {isPending ? (
          <>
            <Loader2 className="animate-spin" />
            {buttonText}
          </>
        ) : (
          buttonText
        )}
      </Button>
    </form>
  );
};
