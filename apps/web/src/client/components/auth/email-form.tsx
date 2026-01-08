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
import { magicLinkFormSchema } from "./schemas";

type EmailFormProps = {
  onSubmit: (email: string) => Promise<void>;
  isPending?: boolean;
  defaultEmail?: string;
};

/**
 * Email form component for magic link authentication
 * Uses TanStack Form with Zod validation
 */
export const EmailForm = ({
  onSubmit,
  isPending = false,
  defaultEmail = "",
}: EmailFormProps) => {
  const form = useForm({
    defaultValues: {
      email: defaultEmail,
    },
    validators: {
      onChange: magicLinkFormSchema,
    },
    onSubmit: async ({ value }) => {
      await onSubmit(value.email);
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
                      message:
                        typeof error === "string" ? error : error?.message,
                    }))}
                  />
                ) : null}
              </Field>
            );
          }}
          name="email"
        />
      </FieldGroup>
      <Button className="w-full" disabled={isPending} type="submit">
        {isPending ? (
          <>
            <Loader2 className="animate-spin" />
            Sending...
          </>
        ) : (
          "Send login link"
        )}
      </Button>
    </form>
  );
};
