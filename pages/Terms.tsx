import React from "react";
import { Link } from "react-router-dom";
import { FileText, ArrowLeft } from "lucide-react";

export const Terms: React.FC = () => {
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
              <FileText className="w-6 h-6 text-primary" />
            </div>
            <h1 className="text-4xl font-black text-zinc-900 dark:text-white">
              Terms of Service
            </h1>
          </div>

          <div className="prose prose-zinc dark:prose-invert max-w-none">
            <p className="text-zinc-600 dark:text-zinc-400 text-sm mb-8">
              Last updated: {new Date().toLocaleDateString()}
            </p>

            <section className="mb-8">
              <h2 className="text-2xl font-bold text-zinc-900 dark:text-white mb-4">
                1. Acceptance of Terms
              </h2>
              <p className="text-zinc-700 dark:text-zinc-300">
                By accessing and using Tasker ("the Service"), you accept and agree
                to be bound by these Terms of Service. If you do not agree to these
                terms, please do not use the Service.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-bold text-zinc-900 dark:text-white mb-4">
                2. Description of Service
              </h2>
              <p className="text-zinc-700 dark:text-zinc-300 mb-4">
                Tasker is a task and opportunity management platform designed for
                educational institutions. The Service allows:
              </p>
              <ul className="list-disc pl-6 text-zinc-700 dark:text-zinc-300 space-y-2">
                <li>Organizations to post tasks and opportunities</li>
                <li>Students to browse and apply for opportunities</li>
                <li>
                  Task management, application tracking, and communication between
                  parties
                </li>
                <li>Profile management and skill tracking</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-bold text-zinc-900 dark:text-white mb-4">
                3. User Accounts
              </h2>
              <p className="text-zinc-700 dark:text-zinc-300 mb-4">
                To use certain features of the Service, you must create an account.
                You agree to:
              </p>
              <ul className="list-disc pl-6 text-zinc-700 dark:text-zinc-300 space-y-2">
                <li>
                  Provide accurate, current, and complete information during
                  registration
                </li>
                <li>
                  Maintain and promptly update your account information to keep it
                  accurate
                </li>
                <li>Maintain the security of your password and account</li>
                <li>
                  Notify us immediately of any unauthorized use of your account
                </li>
                <li>
                  Accept responsibility for all activities that occur under your
                  account
                </li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-bold text-zinc-900 dark:text-white mb-4">
                4. User Roles and Permissions
              </h2>
              <p className="text-zinc-700 dark:text-zinc-300 mb-4">
                The Service supports different user roles with varying levels of
                access:
              </p>
              <ul className="list-disc pl-6 text-zinc-700 dark:text-zinc-300 space-y-2">
                <li>
                  <strong>Applicants:</strong> Can browse tasks, submit
                  applications, and manage their profile
                </li>
                <li>
                  <strong>Staff:</strong> Can create and manage tasks, review
                  applications
                </li>
                <li>
                  <strong>Administrators:</strong> Full access to all features and
                  user management
                </li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-bold text-zinc-900 dark:text-white mb-4">
                5. Acceptable Use
              </h2>
              <p className="text-zinc-700 dark:text-zinc-300 mb-4">
                You agree not to:
              </p>
              <ul className="list-disc pl-6 text-zinc-700 dark:text-zinc-300 space-y-2">
                <li>
                  Use the Service for any illegal purpose or in violation of any
                  laws
                </li>
                <li>
                  Post false, inaccurate, misleading, or defamatory content
                </li>
                <li>
                  Harass, abuse, or harm other users of the Service
                </li>
                <li>
                  Attempt to gain unauthorized access to any portion of the Service
                </li>
                <li>
                  Upload viruses or malicious code, or interfere with the proper
                  working of the Service
                </li>
                <li>
                  Scrape, copy, or download content from the Service using
                  automated means
                </li>
                <li>Impersonate any person or entity</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-bold text-zinc-900 dark:text-white mb-4">
                6. Content and Applications
              </h2>
              <p className="text-zinc-700 dark:text-zinc-300 mb-4">
                When you submit content to the Service (including applications,
                profiles, and task postings):
              </p>
              <ul className="list-disc pl-6 text-zinc-700 dark:text-zinc-300 space-y-2">
                <li>You retain ownership of your content</li>
                <li>
                  You grant us a license to use, store, and display your content as
                  necessary to provide the Service
                </li>
                <li>
                  You represent that you have the right to submit the content
                </li>
                <li>
                  You agree that your profile information may be visible to task
                  creators
                </li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-bold text-zinc-900 dark:text-white mb-4">
                7. Third-Party Authentication
              </h2>
              <p className="text-zinc-700 dark:text-zinc-300">
                The Service may offer authentication through third-party providers
                (such as Google OAuth and SSO). Your use of these authentication
                methods is subject to the respective provider's terms of service
                and privacy policy. We are not responsible for the practices of
                third-party authentication providers.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-bold text-zinc-900 dark:text-white mb-4">
                8. Task Opportunities and Applications
              </h2>
              <p className="text-zinc-700 dark:text-zinc-300 mb-4">
                The Service facilitates connections between task creators and
                applicants. You understand that:
              </p>
              <ul className="list-disc pl-6 text-zinc-700 dark:text-zinc-300 space-y-2">
                <li>
                  We do not guarantee the accuracy of task postings or user
                  profiles
                </li>
                <li>
                  We are not responsible for disputes between task creators and
                  applicants
                </li>
                <li>
                  Task creators are solely responsible for selecting applicants and
                  fulfilling commitments
                </li>
                <li>
                  Payment or reward arrangements are between the task creator and
                  applicant
                </li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-bold text-zinc-900 dark:text-white mb-4">
                9. Privacy
              </h2>
              <p className="text-zinc-700 dark:text-zinc-300">
                Your use of the Service is also governed by our Privacy Policy.
                Please review our{" "}
                <Link to="/privacy" className="text-primary hover:underline">
                  Privacy Policy
                </Link>{" "}
                to understand our practices.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-bold text-zinc-900 dark:text-white mb-4">
                10. Intellectual Property
              </h2>
              <p className="text-zinc-700 dark:text-zinc-300">
                The Service and its original content (excluding user-generated
                content), features, and functionality are owned by Al Siraat
                College and are protected by international copyright, trademark,
                and other intellectual property laws.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-bold text-zinc-900 dark:text-white mb-4">
                11. Disclaimer of Warranties
              </h2>
              <p className="text-zinc-700 dark:text-zinc-300">
                The Service is provided "as is" and "as available" without
                warranties of any kind, either express or implied. We do not
                warrant that the Service will be uninterrupted, secure, or
                error-free.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-bold text-zinc-900 dark:text-white mb-4">
                12. Limitation of Liability
              </h2>
              <p className="text-zinc-700 dark:text-zinc-300">
                To the maximum extent permitted by law, Al Siraat College shall not
                be liable for any indirect, incidental, special, consequential, or
                punitive damages resulting from your use of or inability to use the
                Service.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-bold text-zinc-900 dark:text-white mb-4">
                13. Termination
              </h2>
              <p className="text-zinc-700 dark:text-zinc-300 mb-4">
                We may terminate or suspend your account and access to the Service
                immediately, without prior notice or liability, for any reason,
                including but not limited to:
              </p>
              <ul className="list-disc pl-6 text-zinc-700 dark:text-zinc-300 space-y-2">
                <li>Breach of these Terms of Service</li>
                <li>Fraudulent, abusive, or illegal activity</li>
                <li>At your request</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-bold text-zinc-900 dark:text-white mb-4">
                14. Changes to Terms
              </h2>
              <p className="text-zinc-700 dark:text-zinc-300">
                We reserve the right to modify these terms at any time. We will
                notify users of any material changes by posting the new terms on
                this page. Your continued use of the Service after changes
                constitutes acceptance of the new terms.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-bold text-zinc-900 dark:text-white mb-4">
                15. Governing Law
              </h2>
              <p className="text-zinc-700 dark:text-zinc-300">
                These Terms shall be governed by and construed in accordance with
                the laws of Victoria, Australia, without regard to its conflict of
                law provisions.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-bold text-zinc-900 dark:text-white mb-4">
                16. Contact Information
              </h2>
              <p className="text-zinc-700 dark:text-zinc-300">
                If you have any questions about these Terms of Service, please
                contact us at:
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

            <section className="mt-12 pt-8 border-t border-zinc-200 dark:border-zinc-800">
              <p className="text-sm text-zinc-500 dark:text-zinc-400">
                By using Tasker, you acknowledge that you have read, understood,
                and agree to be bound by these Terms of Service.
              </p>
            </section>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Terms;
