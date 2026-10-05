import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description: "Learn how we collect, use, and safeguard your personal information.",
};

export default function PrivacyPolicyPage() {
  return (
    <div className="min-h-screen bg-white">
      {/* Page Header */}
      <div className="bg-[#1a1a1a] py-16 md:py-20">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <h1 className="text-3xl md:text-4xl lg:text-5xl font-serif font-medium text-white">
            Privacy Policy
          </h1>
        </div>
      </div>

      {/* Page Content */}
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-12 md:py-16">
        <div className="prose prose-lg max-w-4xl mx-auto prose-headings:font-serif prose-a:text-[#b59a5c] hover:prose-a:text-[#a08a4f] text-gray-700 space-y-6">
          <p>
            At Veloria Vault, we value your trust. This Privacy Policy explains how we collect, use, and safeguard your personal information when you visit our website or make a purchase from Veloria Vault.
          </p>

          <h2 className="text-2xl font-serif text-gray-900 mt-10 mb-4">Information We Collect</h2>
          
          <h3 className="text-xl font-serif text-gray-900 mt-8 mb-3">Device Information</h3>
          <p>
            When you browse our website, we may automatically collect certain details about your device, such as:
          </p>
          <ul className="space-y-2 list-disc pl-5">
            <li>Web browser and operating system.</li>
            <li>IP address and time zone.</li>
            <li>Cookies and similar technologies used to enhance your browsing experience.</li>
            <li>Pages viewed, referring sites, and how you interact with our site.</li>
          </ul>

          <h3 className="text-xl font-serif text-gray-900 mt-8 mb-3">Order Information</h3>
          <p>
            When you place an order or attempt to do so, we collect:
          </p>
          <ul className="space-y-2 list-disc pl-5">
            <li>Your name, billing address, and shipping address.</li>
            <li>Payment information (such as credit card numbers, UPI, etc.).</li>
            <li>Email address and phone number for order updates and tracking.</li>
          </ul>

          <h2 className="text-2xl font-serif text-gray-900 mt-10 mb-4">How We Use Your Information</h2>
          <p>
            We use the Order Information that we collect generally to fulfill any orders placed through the Site (including processing your payment information, arranging for shipping, and providing you with invoices and/or order confirmations).
          </p>
          <ul className="space-y-2 list-disc pl-5">
            <li>Communicate with you regarding your order.</li>
            <li>Screen our orders for potential risk or fraud.</li>
            <li>When in line with the preferences you have shared with us, provide you with information or advertising relating to our products or services.</li>
          </ul>

          <h2 className="text-2xl font-serif text-gray-900 mt-10 mb-4">Data Retention</h2>
          <p>
            When you place an order through the Site, we will maintain your Order Information for our records unless and until you ask us to delete this information.
          </p>

          <h2 className="text-2xl font-serif text-gray-900 mt-10 mb-4">Changes to Privacy Policy</h2>
          <p>
            We may update this privacy policy from time to time in order to reflect changes to our practices or for other operational, legal, or regulatory reasons.
          </p>

          <h2 className="text-2xl font-serif text-gray-900 mt-10 mb-4">Contact Us</h2>
          <p>
            For more information about our privacy practices, if you have questions, or if you would like to make a complaint, please contact us by email at <a href="mailto:care@veloriavault.com">care@veloriavault.com</a>.
          </p>
          <p className="text-sm text-gray-500 mt-8">
            <strong>Official Company Address:</strong> Please request official details via our support email.
          </p>
        </div>
      </div>
    </div>
  );
}
