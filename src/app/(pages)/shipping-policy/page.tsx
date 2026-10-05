import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Shipping Policy",
  description: "Learn about our shipping procedures, timelines, and delivery terms.",
};

export default function ShippingPolicyPage() {
  return (
    <div className="min-h-screen bg-white">
      {/* Page Header */}
      <div className="bg-[#1a1a1a] py-16 md:py-20">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <h1 className="text-3xl md:text-4xl lg:text-5xl font-serif font-medium text-white">
            Shipping Policy
          </h1>
        </div>
      </div>

      {/* Page Content */}
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-12 md:py-16">
        <div className="prose prose-lg max-w-4xl mx-auto prose-headings:font-serif prose-a:text-[#b59a5c] hover:prose-a:text-[#a08a4f] text-gray-700 space-y-6">
          <p>
            At Veloria Vault, we believe your shopping experience should be as seamless and refined as our handbags. That&apos;s why we provide complimentary shipping on all orders within India and work with trusted delivery partners to ensure every order is handled with care and delivered on time.
          </p>

          <h2 className="text-2xl font-serif text-gray-900 mt-10 mb-4">Shipping Timeline</h2>
          <ul className="space-y-2 list-disc pl-5">
            <li>Orders are processed within <strong>24 hours</strong> of placement.</li>
            <li><strong>Please note:</strong> Orders are not processed on Sundays or National Holidays.</li>
          </ul>

          <h2 className="text-2xl font-serif text-gray-900 mt-10 mb-4">Delivery Timeline</h2>
          <ul className="space-y-2 list-disc pl-5">
            <li><strong>Tier 1 Cities:</strong> Typically delivered within 2–5 business days.</li>
            <li><strong>Other Locations:</strong> May take 3–8 business days.</li>
            <li><strong>International Orders:</strong> Standard shipping (where available).</li>
          </ul>
          <p>
            <em>Please note: Certain regions may have shipping restrictions due to logistical limitations.</em>
          </p>

          <h2 className="text-2xl font-serif text-gray-900 mt-10 mb-4">Order Tracking</h2>
          <p>
            You can track your package using the tracking number provided in your shipment confirmation email. If you don&apos;t see the email in your inbox, please check your spam folder. In some cases, tracking updates may take 24–48 hours to appear online. You can also visit our <a href="/track-order">Track Order</a> page on VeloriaVault.com to check your order status.
          </p>

          <h2 className="text-2xl font-serif text-gray-900 mt-10 mb-4">Delivery Attempts</h2>
          <p>
            Our delivery partners will make three attempts to deliver your order. After three unsuccessful attempts, the package will be returned to our warehouse. To avoid delays, please ensure you provide a valid phone number and a complete shipping address at checkout.
          </p>

          <h2 className="text-2xl font-serif text-gray-900 mt-10 mb-4">Proof of Delivery</h2>
          <p>
            For high-value orders or certain delivery locations, the delivery partner may request valid ID proof at the time of delivery.
          </p>

          <h2 className="text-2xl font-serif text-gray-900 mt-10 mb-4">Need Assistance?</h2>
          <p>
            For any questions or concerns about shipping, our customer support team is here to help. Please email us at <a href="mailto:care@veloriavault.com">care@veloriavault.com</a>.
          </p>
        </div>
      </div>
    </div>
  );
}
