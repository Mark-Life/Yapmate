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
import { otpFormSchema } from "./schemas";

type OtpFormProps = {
  email: string;
  onSubmit: (otp: string) => Promise<void>;
  onBack: () => void;
  isPending?: boolean;
};

/**
 * OTP verification form component
 * Uses TanStack Form with Zod validation
 */
export const OtpForm = ({
  email,
  onSubmit,
  onBack,
  isPending = false,
}: OtpFormProps) => {
  const form = useForm({
    defaultValues: {
      otp: "",
    },
    validators: {
      onChange: otpFormSchema,
    },
    onSubmit: async ({ value }) => {
      await onSubmit(value.otp);
    },
  });

  return (
    <form
      className="space-y-4"
      onSubmit={(e) => {
        e.preventDefault();
        form.handleSubmit();
      }}
    >
      <FieldGroup>
        <div className="space-y-2">
          <Input className="bg-muted" disabled type="email" value={email} />
        </div>
        <form.Field
          children={(field) => {
            const isInvalid =
              field.state.meta.isTouched && !field.state.meta.isValid;

            return (
              <Field data-invalid={isInvalid}>
                <FieldLabel htmlFor={field.name}>Verification Code</FieldLabel>
                <Input
                  aria-invalid={isInvalid}
                  disabled={isPending}
                  id={field.name}
                  maxLength={8}
                  name={field.name}
                  onBlur={field.handleBlur}
                  onChange={(e) => {
                    const value = e.target.value.replace(/\D/g, "");
                    field.handleChange(value);
                  }}
                  placeholder="Enter 8-digit code"
                  required
                  type="text"
                  value={field.state.value}
                />
                {isInvalid ? (
                  <FieldError
                    errors={field.state.meta.errors.map((error) => ({
                      message:
                        typeof error === "string" ? error : error?.message,
                    }))}
                  />
                ) : null}
              </Field>
            );
          }}
          name="otp"
        />
      </FieldGroup>
      <div className="flex gap-3">
        <Button
          className="flex-1"
          disabled={isPending}
          onClick={onBack}
          type="button"
          variant="outline"
        >
          Back
        </Button>
        <Button className="flex-1" disabled={isPending} type="submit">
          {isPending ? (
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
          💡 You can also click the link in your email to sign in automatically.
        </p>
      </div>
    </form>
  );
};
