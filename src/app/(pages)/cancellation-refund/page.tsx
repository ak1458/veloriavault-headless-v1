import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Cancellation & Refund Policy",
  description: "Learn about our cancellation and refund policies.",
};

export default function CancellationRefundPolicyPage() {
  return (
    <div className="min-h-screen bg-white">
      {/* Page Header */}
      <div className="bg-[#1a1a1a] py-16 md:py-20">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <h1 className="text-3xl md:text-4xl lg:text-5xl font-serif font-medium text-white">
            Cancellation & Refund Policy
          </h1>
        </div>
      </div>

      {/* Page Content */}
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-12 md:py-16">
        <div className="prose prose-lg max-w-4xl mx-auto prose-headings:font-serif prose-a:text-[#b59a5c] hover:prose-a:text-[#a08a4f] text-gray-700 space-y-6">
          <p>
            We understand that plans change. At Veloria Vault, we aim to accommodate order changes whenever possible, while still ensuring prompt delivery of your purchase.
          </p>

          <h2 className="text-2xl font-serif text-gray-900 mt-10 mb-4">Order Cancellations</h2>
          <p>
            <strong>24-Hour Window:</strong> You may cancel your order within 24 hours of placing it. Once the order has been processed or shipped, cancellations are no longer possible.
          </p>
          <p>
            If your order has already moved into the shipping stage, our team will be happy to guide you on our returns process instead.
          </p>

          <h2 className="text-2xl font-serif text-gray-900 mt-10 mb-4">Unsatisfactory or Incorrect Orders</h2>
          <p>
            If your item arrives damaged, defective, or not as expected, please contact our customer support team within 48 hours of delivery at care@veloriavault.com. Include your order number and relevant photos or videos so we can resolve it quickly with a refund or replacement.
          </p>

          <h2 className="text-2xl font-serif text-gray-900 mt-10 mb-4">Refund Process</h2>
          <p>
            Refunds are processed only after we receive and inspect the returned item.
          </p>
          <ul className="space-y-2 list-disc pl-5">
            <li><strong>Pickup:</strong> Once approved, pickup will be scheduled within 48 hours.</li>
            <li><strong>Transit & Inspection:</strong> Items usually reach our warehouse in 4–6 business days, with quality checks completed within 48 hours of receipt.</li>
            <li><strong>Refund Timeline:</strong> Refunds for both online and COD are issued as store credits to your Veloria Vault wallet within 7–10 business days after inspection.</li>
          </ul>
          <p>Refund confirmation and next steps are shared via email.</p>

          <h2 className="text-2xl font-serif text-gray-900 mt-10 mb-4">Need Help?</h2>
          <p>
            For cancellation or refund assistance, contact us at <a href="mailto:care@veloriavault.com">care@veloriavault.com</a>.
          </p>
        </div>
      </div>
    </div>
  );
}
