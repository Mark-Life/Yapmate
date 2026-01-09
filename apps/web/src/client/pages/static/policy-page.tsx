import { StaticLayout } from "./static-layout";

/**
 * Hero section with title
 */
const HeroSection = () => (
  <section className="mx-auto max-w-3xl py-8">
    <div className="text-center">
      <h1 className="font-bold text-4xl tracking-tight md:text-5xl lg:text-6xl">
        Privacy Policy
      </h1>
    </div>
  </section>
);

/**
 * Privacy policy content section
 */
const ContentSection = () => (
  <section className="mx-auto max-w-3xl py-16">
    <div className="space-y-8 rounded-xl border border-border bg-card p-8">
      <div>
        <p className="mb-4 text-muted-foreground">
          <strong className="text-foreground">Last updated:</strong>{" "}
          {new Date().toLocaleDateString("en-US", {
            year: "numeric",
            month: "long",
            day: "numeric",
          })}
        </p>
        <p className="text-muted-foreground">
          This Privacy Policy describes how Mark Life Ltd ("we", "our", or "us")
          collects, uses, and protects your information when you use Yapmate
          (the "Service").
        </p>
      </div>

      <div>
        <h2 className="mb-3 font-semibold text-xl">
          1. Information We Collect
        </h2>
        <div className="space-y-3 text-muted-foreground">
          <p>
            <strong className="text-foreground">Email Address:</strong> We
            currently collect and store only your email address for account
            authentication and communication purposes. We do not collect or
            store your name or family name.
          </p>
          <p>
            <strong className="text-foreground">Usage Analytics:</strong> We
            collect anonymous user behavior data through PostHog using internal
            UUID identifiers only. No personal information such as email
            addresses is shared with PostHog. Data collected includes:
          </p>
          <ul className="ml-6 list-disc space-y-1">
            <li>Function usage patterns</li>
            <li>AI model selection choices</li>
            <li>Regenerate actions and other interaction patterns</li>
            <li>General usage statistics to improve the Service</li>
          </ul>
        </div>
      </div>

      <div>
        <h2 className="mb-3 font-semibold text-xl">
          2. How We Use Your Information
        </h2>
        <div className="space-y-2 text-muted-foreground">
          <p>We use the information we collect to:</p>
          <ul className="ml-6 list-disc space-y-1">
            <li>Provide, maintain, and improve the Service</li>
            <li>Authenticate your account and ensure security</li>
            <li>Communicate with you about the Service</li>
            <li>Analyze usage patterns to enhance user experience</li>
          </ul>
        </div>
      </div>

      <div>
        <h2 className="mb-3 font-semibold text-xl">
          3. Data Storage and Security
        </h2>
        <p className="text-muted-foreground">
          We implement appropriate technical and organizational measures to
          protect your personal information. However, no method of transmission
          over the Internet or electronic storage is 100% secure.
        </p>
      </div>

      <div>
        <h2 className="mb-3 font-semibold text-xl">4. Third-Party Services</h2>
        <div className="space-y-6 text-muted-foreground">
          <div className="space-y-3">
            <p>
              <strong className="text-foreground">Stripe (Payments):</strong>{" "}
              When you purchase a subscription, your email is shared with Stripe
              for payment processing. We don't store any bank or card details —
              Stripe handles all payment info securely.
            </p>
            <p>
              You can manage payment methods through Stripe and cancel anytime.
              See our{" "}
              <a
                className="font-semibold text-primary transition-opacity hover:opacity-80"
                href="/terms"
              >
                Terms of Service
              </a>{" "}
              for details.
            </p>
          </div>

          <div className="space-y-3">
            <p>
              <strong className="text-foreground">
                Langfuse (LLM Observability):
              </strong>{" "}
              We store AI generation traces in Langfuse Cloud to monitor and
              improve our AI features. Only an internal UUID is sent to Langfuse
              — we never share your email or any personal information with them.
            </p>
          </div>

          <div className="space-y-3">
            <p>
              <strong className="text-foreground">
                AI Model Providers (OpenRouter):
              </strong>{" "}
              We use{" "}
              <a
                className="font-semibold text-primary transition-opacity hover:opacity-80"
                href="https://openrouter.ai/"
                rel="noopener noreferrer"
                target="_blank"
              >
                OpenRouter
              </a>{" "}
              to route your AI requests to various model providers (like OpenAI,
              Anthropic, Google, and others).
            </p>
            <p>
              <strong className="text-foreground">
                Good news about training:
              </strong>{" "}
              Unlike consumer AI apps (like ChatGPT's web interface), most model
              providers do not train on data received through APIs. This means
              your conversations in Yapmate are generally not used to train
              future AI models.
            </p>
            <p>
              <strong className="text-foreground">Some exceptions:</strong> A
              few providers may train on API requests, including DeepSeek,
              Chutes, and Cirrascale. Check the{" "}
              <a
                className="font-semibold text-primary transition-opacity hover:opacity-80"
                href="https://openrouter.ai/docs/guides/privacy/logging#data-retention--logging"
                rel="noopener noreferrer"
                target="_blank"
              >
                current provider list
              </a>{" "}
              for up-to-date policies.
            </p>
            <p>
              <strong className="text-foreground">Data we share:</strong> We do
              not send any user-identifying information to OpenRouter or model
              providers — not even your internal UUID. However, most providers
              store requests in their logs for operational purposes.
            </p>
            <p>
              <strong className="text-foreground">Important:</strong> If you
              include personal details in your messages (like your name, email,
              or other private info), that data will be seen by the model
              provider and stored in their logs. In rare cases, it may even be
              used for training. Be mindful of what you share in your
              conversations.
            </p>
          </div>
        </div>
      </div>

      <div>
        <h2 className="mb-3 font-semibold text-xl">5. Your Rights</h2>
        <div className="space-y-3 text-muted-foreground">
          <p>
            <strong className="text-foreground">Data Deletion:</strong> You can
            delete your account and all associated data directly from the app.
            Visit your{" "}
            <a
              className="font-semibold text-primary transition-opacity hover:opacity-80"
              href="/settings/profile"
            >
              Profile Settings
            </a>{" "}
            to delete your account.
          </p>
        </div>
      </div>

      <div>
        <h2 className="mb-3 font-semibold text-xl">
          6. Changes to This Policy
        </h2>
        <p className="text-muted-foreground">
          We may update this Privacy Policy from time to time. We will notify
          you of any changes by posting the new Privacy Policy on this page and
          updating the "Last updated" date.
        </p>
      </div>

      <div>
        <h2 className="mb-3 font-semibold text-xl">7. Contact Us</h2>
        <div className="space-y-2 text-muted-foreground">
          <p>
            If you have any questions about this Privacy Policy, please contact
            us:
          </p>
          <div className="space-y-1">
            <p>
              <strong className="text-foreground">Mark Life Ltd</strong>
            </p>
            <p>
              Registration Number: 208147965
              <br />
              VAT: BG208147965
            </p>
            <p>Registered Address: BULGARIA, Plovdiv, 154 Maritsa, D14, 4000</p>
            <p>
              Email:{" "}
              <a
                className="font-semibold text-primary transition-opacity hover:opacity-80"
                href="mailto:108@mark-life.com"
              >
                108@mark-life.com
              </a>
            </p>
          </div>
        </div>
      </div>
    </div>
  </section>
);

/**
 * Privacy Policy page component
 */
export const PolicyPage = () => (
  <StaticLayout>
    <HeroSection />
    <ContentSection />
  </StaticLayout>
);
