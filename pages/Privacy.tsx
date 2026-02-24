import React from "react";
import { Link } from "react-router-dom";
import { Shield, ArrowLeft } from "lucide-react";

export const Privacy: React.FC = () => {
  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-black">
      <div className="max-w-4xl mx-auto px-4 py-12">
        <Link
          to="/login"
          className="inline-flex items-center gap-2 text-primary hover:underline mb-8"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Login
        </Link>

        <div className="bg-white dark:bg-zinc-900 rounded-2xl shadow-lg p-8 md:p-12 border border-zinc-200 dark:border-zinc-800">
          <div className="flex items-center gap-4 mb-8">
            <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center">
              <Shield className="w-6 h-6 text-primary" />
            </div>
            <h1 className="text-4xl font-black text-zinc-900 dark:text-white">
              Privacy Policy
            </h1>
          </div>

          <div className="prose prose-zinc dark:prose-invert max-w-none">
            <p className="text-zinc-600 dark:text-zinc-400 text-sm mb-8">
              Last updated: {new Date().toLocaleDateString()}
            </p>

            <section className="mb-8">
              <h2 className="text-2xl font-bold text-zinc-900 dark:text-white mb-4">
                1. Information We Collect
              </h2>
              <p className="text-zinc-700 dark:text-zinc-300 mb-4">
                We collect information that you provide directly to us when you:
              </p>
              <ul className="list-disc pl-6 text-zinc-700 dark:text-zinc-300 space-y-2">
                <li>Create an account (name, email, password)</li>
                <li>Complete your profile (skills, about, contact information)</li>
                <li>Apply for tasks or post opportunities</li>
                <li>Use authentication services (Google OAuth, SSO)</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-bold text-zinc-900 dark:text-white mb-4">
                2. How We Use Your Information
              </h2>
              <p className="text-zinc-700 dark:text-zinc-300 mb-4">
                We use the information we collect to:
              </p>
              <ul className="list-disc pl-6 text-zinc-700 dark:text-zinc-300 space-y-2">
                <li>Provide, maintain, and improve our services</li>
                <li>Process your applications and manage tasks</li>
                <li>Communicate with you about tasks and opportunities</li>
                <li>Authenticate your account and prevent fraud</li>
                <li>Send you notifications about your account activity</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-bold text-zinc-900 dark:text-white mb-4">
                3. Google OAuth Integration
              </h2>
              <p className="text-zinc-700 dark:text-zinc-300 mb-4">
                When you sign in with Google, we receive:
              </p>
              <ul className="list-disc pl-6 text-zinc-700 dark:text-zinc-300 space-y-2">
                <li>Your Google account ID</li>
                <li>Your name and email address</li>
                <li>Your profile picture (if available)</li>
              </ul>
              <p className="text-zinc-700 dark:text-zinc-300 mt-4">
                We use this information to create and manage your Tasker account.
                We do not access any other Google services or data without your
                explicit permission.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-bold text-zinc-900 dark:text-white mb-4">
                4. Information Sharing
              </h2>
              <p className="text-zinc-700 dark:text-zinc-300 mb-4">
                We do not sell your personal information. We may share your
                information only in the following circumstances:
              </p>
              <ul className="list-disc pl-6 text-zinc-700 dark:text-zinc-300 space-y-2">
                <li>
                  With task creators when you apply for opportunities (name,
                  profile information)
                </li>
                <li>With your consent or at your direction</li>
                <li>To comply with legal obligations</li>
                <li>To protect the rights and safety of our users</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-bold text-zinc-900 dark:text-white mb-4">
                5. Data Security
              </h2>
              <p className="text-zinc-700 dark:text-zinc-300">
                We implement appropriate technical and organizational measures to
                protect your personal information against unauthorized access,
                alteration, disclosure, or destruction. This includes:
              </p>
              <ul className="list-disc pl-6 text-zinc-700 dark:text-zinc-300 space-y-2 mt-4">
                <li>Encrypted data transmission (HTTPS/TLS)</li>
                <li>Secure password hashing</li>
                <li>Regular security updates and monitoring</li>
                <li>Access controls and authentication</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-bold text-zinc-900 dark:text-white mb-4">
                6. Your Rights
              </h2>
              <p className="text-zinc-700 dark:text-zinc-300 mb-4">
                You have the right to:
              </p>
              <ul className="list-disc pl-6 text-zinc-700 dark:text-zinc-300 space-y-2">
                <li>Access your personal information</li>
                <li>Update or correct your information</li>
                <li>Delete your account and associated data</li>
                <li>Export your data</li>
                <li>Opt-out of certain communications</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-bold text-zinc-900 dark:text-white mb-4">
                7. Cookies and Tracking
              </h2>
              <p className="text-zinc-700 dark:text-zinc-300">
                We use local storage and session storage to maintain your login
                state and preferences. We do not use third-party tracking cookies
                for advertising purposes.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-bold text-zinc-900 dark:text-white mb-4">
                8. Children's Privacy
              </h2>
              <p className="text-zinc-700 dark:text-zinc-300">
                Our service is intended for use by educational institutions and
                their students. We do not knowingly collect personal information
                from children under 13 without parental consent.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-bold text-zinc-900 dark:text-white mb-4">
                9. Changes to This Policy
              </h2>
              <p className="text-zinc-700 dark:text-zinc-300">
                We may update this privacy policy from time to time. We will notify
                you of any changes by posting the new policy on this page and
                updating the "Last updated" date.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-bold text-zinc-900 dark:text-white mb-4">
                10. Contact Us
              </h2>
              <p className="text-zinc-700 dark:text-zinc-300">
                If you have any questions about this Privacy Policy, please contact
                us at:
              </p>
              <div className="mt-4 p-4 bg-zinc-100 dark:bg-zinc-800 rounded-lg">
                <p className="text-zinc-700 dark:text-zinc-300">
                  Al Siraat College
                  <br />
                  Email: info@alsiraat.vic.edu.au
                  <br />
                  Website: https://tasker.alsirat.vic.edu.au
                </p>
              </div>
            </section>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Privacy;
