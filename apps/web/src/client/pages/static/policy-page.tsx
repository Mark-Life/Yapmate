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
            store your name or family name at this time, although our database
            includes fields for this information that may be used in the future.
          </p>
          <p>
            <strong className="text-foreground">Usage Analytics:</strong> In the
            future, we plan to collect user behavior data through PostHog,
            including but not limited to:
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
        <h2 className="mb-3 font-semibold text-xl">4. Your Rights</h2>
        <div className="space-y-3 text-muted-foreground">
          <p>
            <strong className="text-foreground">Data Deletion:</strong> We are
            currently working on implementing a feature that will allow you to
            delete all your user data and your account directly from the app.
            This feature will be available soon.
          </p>
          <p>
            You have the right to request access to, correction of, or deletion
            of your personal information. To exercise these rights, please
            contact us at{" "}
            <a
              className="font-semibold text-primary transition-opacity hover:opacity-80"
              href="mailto:108@mark-life.com"
            >
              108@mark-life.com
            </a>
            .
          </p>
        </div>
      </div>

      <div>
        <h2 className="mb-3 font-semibold text-xl">
          5. Changes to This Policy
        </h2>
        <p className="text-muted-foreground">
          We may update this Privacy Policy from time to time. We will notify
          you of any changes by posting the new Privacy Policy on this page and
          updating the "Last updated" date.
        </p>
      </div>

      <div>
        <h2 className="mb-3 font-semibold text-xl">6. Contact Us</h2>
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
  <div className="min-h-screen bg-background text-foreground">
    <div className="mx-auto max-w-8xl px-4">
      <HeroSection />
      <ContentSection />
    </div>
    <footer className="border-border border-t py-8 text-center text-muted-foreground text-sm">
      © {new Date().getFullYear()}{" "}
      <a
        className="transition-opacity hover:opacity-80"
        href="https://mark-life.com"
        rel="noopener noreferrer"
        target="_blank"
      >
        Mark Life Ltd
      </a>
      . All rights reserved.
    </footer>
  </div>
);
