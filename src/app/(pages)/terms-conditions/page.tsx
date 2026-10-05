import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Terms & Conditions",
  description: "Read the terms and conditions governing the use of our website.",
};

export default function TermsConditionsPage() {
  return (
    <div className="min-h-screen bg-white">
      {/* Page Header */}
      <div className="bg-[#1a1a1a] py-16 md:py-20">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <h1 className="text-3xl md:text-4xl lg:text-5xl font-serif font-medium text-white">
            Terms & Conditions
          </h1>
        </div>
      </div>

      {/* Page Content */}
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-12 md:py-16">
        <div className="prose prose-lg max-w-4xl mx-auto prose-headings:font-serif prose-a:text-[#b59a5c] hover:prose-a:text-[#a08a4f] text-gray-700 space-y-6">
          <h2 className="text-2xl font-serif text-gray-900 mt-10 mb-4">Agreement to Terms</h2>
          <p>
            These Terms and Conditions (“Agreement”) govern your use of www.veloriavault.com (the “Site”) and related services (collectively, the “Service”). By using our Site, you agree to follow these terms along with all additional policies published by Veloria Vault, including our Shipping, Returns & Exchange, Cancellation, and Warranty policies. 
          </p>
          <p>
            References to “we,” “us,” or “our” mean Veloria Vault, and “you,” “your,” “user,” or “customer” mean any individual or entity accessing or purchasing from our Site.
          </p>

          <h2 className="text-2xl font-serif text-gray-900 mt-10 mb-4">General Conditions</h2>
          <p>
            We reserve the right to refuse service to anyone for any reason at any time. You understand that your content (not including credit card information), may be transferred unencrypted and involve transmissions over various networks. Credit card information is always encrypted during transfer over networks.
          </p>

          <h2 className="text-2xl font-serif text-gray-900 mt-10 mb-4">Products & Services</h2>
          <p>
            Certain products or services may be available exclusively online through the website. These products or services may have limited quantities and are subject to return or exchange only according to our Return Policy. We have made every effort to display as accurately as possible the colors and images of our products.
          </p>

          <h2 className="text-2xl font-serif text-gray-900 mt-10 mb-4">Modifications to the Service and Prices</h2>
          <p>
            Prices for our products are subject to change without notice. We reserve the right at any time to modify or discontinue the Service (or any part or content thereof) without notice at any time. We shall not be liable to you or to any third-party for any modification, price change, suspension or discontinuance of the Service.
          </p>

          <h2 className="text-2xl font-serif text-gray-900 mt-10 mb-4">Accuracy of Billing and Account Information</h2>
          <p>
            We reserve the right to refuse any order you place with us. We may, in our sole discretion, limit or cancel quantities purchased per person, per household or per order. In the event that we make a change to or cancel an order, we may attempt to notify you by contacting the e-mail and/or billing address/phone number provided at the time the order was made.
          </p>

          <h2 className="text-2xl font-serif text-gray-900 mt-10 mb-4">Contact Information</h2>
          <p>
            Questions about the Terms of Service should be sent to us at <a href="mailto:care@veloriavault.com">care@veloriavault.com</a>.
          </p>
          <p className="text-sm text-gray-500 mt-8">
            <strong>Registered Office Address:</strong> Please contact support for official correspondence details.
          </p>
        </div>
      </div>
    </div>
  );
}
