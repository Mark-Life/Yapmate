import { StaticLayout } from "./static-layout";

/**
 * Hero section with title
 */
const HeroSection = () => (
  <section className="mx-auto max-w-3xl py-8">
    <div className="text-center">
      <h1 className="font-bold text-4xl tracking-tight md:text-5xl lg:text-6xl">
        Terms of Use
      </h1>
    </div>
  </section>
);

/**
 * Terms of use content section
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
          These Terms of Use ("Terms") govern your access to and use of Yapmate
          (the "Service"), provided by Mark Life Ltd ("we", "our", or "us"). By
          accessing or using the Service, you agree to be bound by these Terms.
        </p>
      </div>

      <div>
        <h2 className="mb-3 font-semibold text-xl">1. Service Description</h2>
        <div className="space-y-3 text-muted-foreground">
          <p>
            Yapmate is an AI chat platform that provides access to multiple
            large language models (LLMs) from various providers, including
            OpenAI, Anthropic, Google, DeepSeek, Meta, Mistral, and xAI. The
            Service allows users to interact with AI models through a unified
            interface available on web and iOS platforms.
          </p>
          <p>
            AI-generated responses are provided "as is" without guarantees of
            accuracy, completeness, or fitness for any particular purpose. You
            acknowledge that AI outputs may contain errors and should be
            verified independently when used for important decisions.
          </p>
        </div>
      </div>

      <div>
        <h2 className="mb-3 font-semibold text-xl">
          2. Subscription Plans & Billing
        </h2>
        <div className="space-y-3 text-muted-foreground">
          <p>We offer the following subscription tiers:</p>
          <ul className="ml-6 list-disc space-y-1">
            <li>
              <strong className="text-foreground">Free:</strong> 10 AI
              generations per month at no cost
            </li>
            <li>
              <strong className="text-foreground">Hobby ($7/month):</strong>{" "}
              1,000 AI generations per month
            </li>
            <li>
              <strong className="text-foreground">Pro ($15/month):</strong>{" "}
              3,000 AI generations per month
            </li>
          </ul>
          <p>
            <strong className="text-foreground">Billing:</strong> All paid
            subscriptions are processed through Stripe. By subscribing, you
            authorize us to charge your payment method on a recurring monthly
            basis until you cancel.
          </p>
          <p>
            <strong className="text-foreground">
              Subscription Management:
            </strong>{" "}
            You can manage, upgrade, downgrade, or cancel your subscription at
            any time through the Stripe Customer Portal accessible from the app.
            Downgrades and cancellations take effect at the end of the current
            billing period.
          </p>
          <p>
            <strong className="text-foreground">Pricing Changes:</strong> We
            reserve the right to modify pricing. Existing subscribers will be
            notified of changes at least 30 days in advance.
          </p>
        </div>
      </div>

      <div>
        <h2 className="mb-3 font-semibold text-xl">
          3. Generation Limits & Usage
        </h2>
        <div className="space-y-3 text-muted-foreground">
          <p>
            <strong className="text-foreground">
              What counts as a generation:
            </strong>{" "}
            Each AI model response (LLM generation) counts toward your monthly
            limit, regardless of length or complexity.
          </p>
          <p>
            <strong className="text-foreground">Monthly Reset:</strong> Your
            generation count resets on your billing cycle date each month.
            Unused generations do not roll over to the next period.
          </p>
          <p>
            <strong className="text-foreground">Limit Reached:</strong> When you
            reach your monthly limit, you will need to upgrade your plan or wait
            until your next billing cycle to continue using the Service.
          </p>
        </div>
      </div>

      <div>
        <h2 className="mb-3 font-semibold text-xl">4. Account Requirements</h2>
        <div className="space-y-3 text-muted-foreground">
          <p>
            <strong className="text-foreground">Registration:</strong> You must
            provide a valid email address to create an account. You are
            responsible for maintaining the security of your account
            credentials.
          </p>
          <p>
            <strong className="text-foreground">One Account Per Person:</strong>{" "}
            Each individual may only maintain one account. Creating multiple
            accounts to circumvent usage limits is prohibited.
          </p>
          <p>
            <strong className="text-foreground">Age Requirement:</strong> You
            must be at least 13 years old to use the Service. If you are under
            18, you must have parental or guardian consent.
          </p>
        </div>
      </div>

      <div>
        <h2 className="mb-3 font-semibold text-xl">5. Acceptable Use</h2>
        <div className="space-y-3 text-muted-foreground">
          <p>You agree not to use the Service to:</p>
          <ul className="ml-6 list-disc space-y-1">
            <li>Generate illegal, harmful, or abusive content</li>
            <li>Harass, threaten, or harm others</li>
            <li>Violate intellectual property rights</li>
            <li>Attempt to bypass usage limits or security measures</li>
            <li>Distribute malware or engage in unauthorized access</li>
            <li>
              Use automated tools to access the Service in violation of rate
              limits
            </li>
          </ul>
          <p>
            We reserve the right to suspend or terminate accounts that violate
            these terms without refund.
          </p>
        </div>
      </div>

      <div>
        <h2 className="mb-3 font-semibold text-xl">6. Intellectual Property</h2>
        <div className="space-y-3 text-muted-foreground">
          <p>
            <strong className="text-foreground">Your Content:</strong> You
            retain ownership of the prompts and content you submit to the
            Service. You grant us a limited license to process your inputs
            solely to provide the Service.
          </p>
          <p>
            <strong className="text-foreground">AI Outputs:</strong> Subject to
            the underlying AI providers' terms, you may use AI-generated outputs
            for personal and commercial purposes.
          </p>
          <p>
            <strong className="text-foreground">Our Service:</strong> The
            Yapmate platform, including its design, features, and code, remains
            our intellectual property. You may not copy, modify, or distribute
            any part of the Service.
          </p>
        </div>
      </div>

      <div>
        <h2 className="mb-3 font-semibold text-xl">
          7. Limitation of Liability
        </h2>
        <div className="space-y-3 text-muted-foreground">
          <p>
            THE SERVICE IS PROVIDED "AS IS" WITHOUT WARRANTIES OF ANY KIND. TO
            THE MAXIMUM EXTENT PERMITTED BY LAW, WE DISCLAIM ALL WARRANTIES,
            EXPRESS OR IMPLIED, INCLUDING MERCHANTABILITY, FITNESS FOR A
            PARTICULAR PURPOSE, AND NON-INFRINGEMENT.
          </p>
          <p>
            WE SHALL NOT BE LIABLE FOR ANY INDIRECT, INCIDENTAL, SPECIAL,
            CONSEQUENTIAL, OR PUNITIVE DAMAGES, INCLUDING LOSS OF PROFITS, DATA,
            OR GOODWILL, ARISING FROM YOUR USE OF THE SERVICE.
          </p>
          <p>
            Our total liability shall not exceed the amount you paid us in the
            twelve (12) months preceding the claim.
          </p>
        </div>
      </div>

      <div>
        <h2 className="mb-3 font-semibold text-xl">8. Service Availability</h2>
        <p className="text-muted-foreground">
          We strive to maintain high availability but do not guarantee
          uninterrupted access. The Service may be temporarily unavailable due
          to maintenance, updates, or circumstances beyond our control. We are
          not liable for any interruptions or performance issues.
        </p>
      </div>

      <div>
        <h2 className="mb-3 font-semibold text-xl">9. Changes to Terms</h2>
        <p className="text-muted-foreground">
          We may update these Terms from time to time. We will notify you of
          material changes by posting the new Terms on this page and updating
          the "Last updated" date. Continued use of the Service after changes
          constitutes acceptance of the new Terms.
        </p>
      </div>

      <div>
        <h2 className="mb-3 font-semibold text-xl">10. Termination</h2>
        <p className="text-muted-foreground">
          You may stop using the Service at any time. We may suspend or
          terminate your access for violation of these Terms or for any reason
          with reasonable notice. Upon termination, your right to use the
          Service ceases immediately.
        </p>
      </div>

      <div>
        <h2 className="mb-3 font-semibold text-xl">11. Governing Law</h2>
        <p className="text-muted-foreground">
          These Terms are governed by the laws of Bulgaria. Any disputes shall
          be resolved in the courts of Plovdiv, Bulgaria.
        </p>
      </div>

      <div>
        <h2 className="mb-3 font-semibold text-xl">12. Contact Us</h2>
        <div className="space-y-2 text-muted-foreground">
          <p>If you have any questions about these Terms, please contact us:</p>
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
 * Terms of Use page component
 */
export const TermsPage = () => (
  <StaticLayout>
    <HeroSection />
    <ContentSection />
  </StaticLayout>
);
