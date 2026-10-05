import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Warranty Policy",
  description: "Learn about our Lifetime Service Warranty and what it covers.",
};

export default function WarrantyPolicyPage() {
  return (
    <div className="min-h-screen bg-white">
      {/* Page Header */}
      <div className="bg-[#1a1a1a] py-16 md:py-20">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <h1 className="text-3xl md:text-4xl lg:text-5xl font-serif font-medium text-white">
            Warranty Policy
          </h1>
        </div>
      </div>

      {/* Page Content */}
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-12 md:py-16">
        <div className="prose prose-lg max-w-4xl mx-auto prose-headings:font-serif prose-a:text-[#b59a5c] hover:prose-a:text-[#a08a4f] text-gray-700 space-y-6">
          <p>
            At Veloria Vault, we design our handbags to last for years, both in style and in strength. To support that promise, every Veloria Vault bag is covered by our Lifetime Service Warranty.
          </p>

          <h2 className="text-2xl font-serif text-gray-900 mt-10 mb-4">What Our Warranty Covers</h2>
          <ul className="space-y-2 list-disc pl-5">
            <li><strong>Manufacturing Defects:</strong> Issues like stitching faults, edge paint flaws, or handle and strap breakage.</li>
            <li><strong>Hardware Malfunctions:</strong> Defects or breakage in locks, hooks, or other metal fittings.</li>
          </ul>
          <p>
            If your bag requires service due to a manufacturing defect, we’ll repair it at no additional cost.
          </p>

          <h2 className="text-2xl font-serif text-gray-900 mt-10 mb-4">What Our Warranty Does Not Cover</h2>
          <ul className="space-y-2 list-disc pl-5">
            <li>Scratches, plating wear, or damage caused by improper use.</li>
            <li>Normal signs of leather ageing such as naturally developing patina or softening of leather structure over time.</li>
          </ul>

          <h2 className="text-2xl font-serif text-gray-900 mt-10 mb-4">How to Request Service</h2>
          <p>
            If you believe your item falls under our warranty coverage, please reach out to our support team at <a href="mailto:care@veloriavault.com">care@veloriavault.com</a>. Please include your:
          </p>
          <ul className="space-y-2 list-disc pl-5">
            <li>Order Number</li>
            <li>Clear photos or videos of the issue</li>
            <li>Receipt or proof of purchase (if available)</li>
          </ul>
          <p>
            Our team will review your request and guide you through the next steps for repair or service.
          </p>
        </div>
      </div>
    </div>
  );
}
