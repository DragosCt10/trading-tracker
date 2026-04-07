import Link from 'next/link';
import { PolicyPageLayout } from '@/components/shared/PolicyPageLayout';

const SECTIONS = [
  {
    title: '1. Information We Collect',
    content: (
      <>
        <p>
          We collect information you provide directly when you create an account,
          use the platform, or contact support.
        </p>
        <p className="mt-3 mb-3">This includes:</p>
        <ul className="list-disc pl-6 space-y-1.5 text-muted-foreground">
          <li>Account information, such as email and username</li>
          <li>
            Trading data, including trades, results, notes, and uploaded files
          </li>
          <li>Communication data, such as messages sent to support</li>
        </ul>
        <p className="mt-3">
          Payment information is processed securely by our payment provider,
          Lemon Squeezy. We do not store your card details or billing information.
        </p>
        <p className="mt-3 mb-3">
          We also collect data automatically when you use the platform:
        </p>
        <ul className="list-disc pl-6 space-y-1.5 text-muted-foreground">
          <li>IP address</li>
          <li>Device and browser information</li>
          <li>
            Usage data, such as pages visited, features used, and interactions
          </li>
          <li>Cookies and similar tracking technologies</li>
        </ul>
      </>
    ),
  },
  {
    title: '2. How We Use Your Information',
    content: (
      <>
        <p className="mb-3">We use your data to:</p>
        <ul className="list-disc pl-6 space-y-1.5 text-muted-foreground">
          <li>Provide and operate the platform</li>
          <li>Process subscriptions and payments</li>
          <li>Generate personal performance statistics and analytics with help from AI-powered tools</li>
          <li>Improve performance and user experience</li>
          <li>Detect fraud, abuse, or unauthorized activity</li>
          <li>Communicate with you regarding updates or support</li>
          <li>
            Send service-related emails and, where allowed, marketing messages
          </li>
        </ul>
      </>
    ),
  },
  {
    title: '3. Legal Basis for Processing',
    content: (
      <>
        <p className="mb-3">We process your data based on:</p>
        <ul className="list-disc pl-6 space-y-1.5 text-muted-foreground">
          <li>Your consent, when you create an account</li>
          <li>The necessity to provide our services</li>
          <li>Legal obligations</li>
          <li>
            Our legitimate interest in improving and securing the platform
          </li>
        </ul>
      </>
    ),
  },
  {
    title: '4. Data Sharing',
    content: (
      <>
        <p>We do not sell your personal data.</p>
        <p className="mt-3 mb-3">
          We may share your data with trusted third parties only when necessary:
        </p>
        <ul className="list-disc pl-6 space-y-1.5 text-muted-foreground">
          <li>Lemon Squeezy, for payment processing</li>
          <li>Analytics providers, to understand platform usage</li>
          <li>Infrastructure providers, for hosting and storage</li>
        </ul>
        <p className="mt-3">
          All third parties are required to handle your data securely.
        </p>
      </>
    ),
  },
  {
    title: '5. Cookies',
    content: (
      <>
        <p className="mb-3">We use cookies and similar technologies to:</p>
        <ul className="list-disc pl-6 space-y-1.5 text-muted-foreground">
          <li>Keep you logged in and maintain your session</li>
          <li>Remember your preferences (e.g. theme, active account)</li>
          <li>Understand how users interact with the platform</li>
          <li>Improve performance and functionality</li>
          <li>Measure the effectiveness of our advertising (only with your consent)</li>
        </ul>
        <p className="mt-4 mb-3">We categorise cookies as follows:</p>
        <ul className="list-disc pl-6 space-y-1.5 text-muted-foreground">
          <li>
            <span className="font-medium text-foreground">Strictly necessary</span> — required for
            the platform to function (authentication, session management). These cannot be disabled.
          </li>
          <li>
            <span className="font-medium text-foreground">Analytics</span> — help us understand
            usage patterns via Google Analytics / Google Tag Manager. Only set with your consent.
          </li>
          <li>
            <span className="font-medium text-foreground">Advertising</span> — used to measure ad
            performance. Only set with your consent.
          </li>
        </ul>
        <p className="mt-4">
          When you first visit the platform, you will be shown a cookie banner where you can
          accept or reject non-essential cookies. You can withdraw or change your consent at any
          time by clearing your browser&apos;s local storage for this site or adjusting your
          browser settings.
        </p>
        <p className="mt-3">
          We use Google Tag Manager with Consent Mode v2, which ensures analytics and advertising
          tags only fire in accordance with your consent choice.
        </p>
      </>
    ),
  },
  {
    title: '6. Data Security',
    content: (
      <>
        <p>
          We use appropriate technical and organizational measures to protect
          your data.
        </p>
        <p className="mt-3 mb-3">This includes:</p>
        <ul className="list-disc pl-6 space-y-1.5 text-muted-foreground">
          <li>Encryption in transit and at rest</li>
          <li>Access control and restricted internal access</li>
          <li>
            Monitoring and security practices to prevent unauthorized access
          </li>
        </ul>
      </>
    ),
  },
  {
    title: '7. Data Retention',
    content: (
      <>
        <p>We retain your data for as long as your account is active.</p>
        <p className="mt-3">
          If you delete your account, we may retain your data for up to 30 days
          for backup and recovery purposes, after which it is permanently
          deleted.
        </p>
        <p className="mt-3">
          We may retain certain data longer if required by law.
        </p>
      </>
    ),
  },
  {
    title: '8. Your Rights',
    content: (
      <>
        <p className="mb-3">You have the right to:</p>
        <ul className="list-disc pl-6 space-y-1.5 text-muted-foreground">
          <li>Access your personal data</li>
          <li>Correct inaccurate data</li>
          <li>Request deletion of your data</li>
          <li>Export your data in a portable format</li>
          <li>Withdraw consent at any time</li>
          <li>Object to certain types of data processing</li>
        </ul>
        <p className="mt-3">
          To exercise your rights,{' '}
          <Link
            href="/contact"
            className="underline decoration-white text-white underline-offset-2"
          >
            contact us
          </Link>
          .
        </p>
      </>
    ),
  },
  {
    title: '9. International Data Transfers',
    content: (
      <>
        <p>
          Your data may be processed and stored in countries outside your own.
        </p>
        <p className="mt-3">
          We ensure appropriate safeguards are in place to protect your data in
          accordance with applicable laws.
        </p>
      </>
    ),
  },
  {
    title: '10. Changes to This Policy',
    content: (
      <>
        <p>We may update this Privacy Policy at any time.</p>
        <p className="mt-3">
          Changes become effective upon posting on the platform. Your continued
          use of the service means you accept the updated policy.
        </p>
      </>
    ),
  },
  {
    title: '11. Contact',
    content: (
      <p>
        If you have any questions about this Privacy Policy or your data,{' '}
        <Link
          href="/contact"
          className="underline decoration-white text-white underline-offset-2"
        >
          contact us
        </Link>
        .
      </p>
    ),
  },
] as const;

export function PrivacyPolicyClient() {
  return <PolicyPageLayout title="Privacy Policy" lastUpdated="March 31, 2026" sections={SECTIONS} />;
}
