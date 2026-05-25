"use client";

import Image from "next/image";
import { useState } from "react";
import { Mail, Phone, Send } from "lucide-react";

// Metadata needs to be in a separate file for client components
// Creating a separate metadata export in layout or using generateMetadata

export default function ContactUsPage() {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    subject: "",
    message: "",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    // Simulate form submission
    await new Promise((resolve) => setTimeout(resolve, 1000));
    setIsSubmitting(false);
    setSubmitted(true);
    setFormData({ name: "", email: "", subject: "", message: "" });
  };

  const contactInfo = [
    {
      icon: Mail,
      title: "Email Us",
      content: "care@veloriavault.com",
      link: "mailto:care@veloriavault.com",
    },
    {
      icon: Phone,
      title: "Call Us",
      content: "+91-7376326666",
      link: "tel:+917376326666",
    },
  ];

  return (
    <div className="min-h-screen bg-white">
      {/* Hero Banner */}
      <div className="relative bg-[#1a1a1a] h-[300px] md:h-[400px] overflow-hidden">
        {/* Background Image - Using img tag for better object-fit control */}
        <div className="absolute inset-0">
          <img
            src="/images/covers/contact us.png"
            alt=""
            className="w-full h-full object-cover object-center lg:object-[center_40%]"
            style={{ opacity: 0.6 }}
          />
          <div className="absolute inset-0 bg-gradient-to-r from-black/70 via-black/40 to-black/30" />
        </div>
        <div className="absolute inset-0 flex flex-col items-center justify-center z-10 px-4">
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-serif font-medium text-white text-center">
            CONTACT US
          </h1>
          <p className="text-gray-300 text-center mt-4 max-w-2xl mx-auto text-sm md:text-base">
            We&apos;d love to hear from you. Reach out for any questions, support, or just to say hello.
          </p>
        </div>
      </div>

      {/* Contact Info Cards */}
      <section className="py-16 md:py-20 bg-white">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 gap-4 md:gap-6 max-w-xl mx-auto">
            {contactInfo.map((item) => (
              <div
                key={item.title}
                className="bg-[#fafafa] rounded-xl p-4 sm:p-6 text-center hover:shadow-lg transition-all duration-300 flex flex-col items-center"
              >
                <div className="w-12 h-12 sm:w-14 sm:h-14 bg-[#1a1a1a] rounded-full flex items-center justify-center mx-auto mb-3 sm:mb-4">
                  <item.icon className="w-5 h-5 sm:w-6 sm:h-6 text-[#b59a5c]" />
                </div>
                <h3 className="text-base sm:text-lg font-serif text-gray-900 mb-2 sm:mb-3">{item.title}</h3>
                
                {item.title === "Call Us" ? (
                  <a
                    href={item.link}
                    className="inline-flex items-center justify-center px-6 py-2.5 bg-black text-white text-[10px] sm:text-xs font-bold tracking-[0.15em] uppercase rounded-full hover:bg-[#b59a5c] transition-all duration-300"
                  >
                    Call Now
                  </a>
                ) : item.link ? (
                  <a
                    href={item.link}
                    className="text-sm sm:text-base text-gray-600 hover:text-[#b59a5c] transition-colors break-all"
                  >
                    {item.content}
                  </a>
                ) : (
                  <p className="text-sm sm:text-base text-gray-600 break-words">{item.content}</p>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Contact Form Section */}
      <section className="py-16 md:py-24 bg-[#fafafa]">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-start">
            {/* Form */}
            <div className="bg-white rounded-lg p-8 md:p-10 shadow-sm">
              <h2 className="text-2xl md:text-3xl font-serif text-gray-900 mb-2">
                Send Us a Message
              </h2>
              <p className="text-gray-500 mb-8">
                Fill out the form below and we&apos;ll get back to you within 24 hours.
              </p>

              {submitted ? (
                <div className="bg-green-50 border border-green-200 rounded-lg p-6 text-center">
                  <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Send className="w-6 h-6 text-green-600" />
                  </div>
                  <h3 className="text-lg font-medium text-green-800 mb-2">Message Sent!</h3>
                  <p className="text-green-600 mb-4">
                    Thank you for reaching out. We&apos;ll get back to you soon.
                  </p>
                  <button
                    onClick={() => setSubmitted(false)}
                    className="text-[#b59a5c] hover:text-[#a08a4f] font-medium"
                  >
                    Send another message
                  </button>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-6">
                  <div className="grid sm:grid-cols-2 gap-6">
                    <div>
                      <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-2">
                        Your Name
                      </label>
                      <input
                        type="text"
                        id="name"
                        required
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:border-[#b59a5c] transition-colors"
                        placeholder="John Doe"
                      />
                    </div>
                    <div>
                      <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                        Your Email
                      </label>
                      <input
                        type="email"
                        id="email"
                        required
                        value={formData.email}
                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                        className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:border-[#b59a5c] transition-colors"
                        placeholder="john@example.com"
                      />
                    </div>
                  </div>

                  <div>
                    <label htmlFor="subject" className="block text-sm font-medium text-gray-700 mb-2">
                      Subject
                    </label>
                    <select
                      id="subject"
                      required
                      value={formData.subject}
                      onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                      className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:border-[#b59a5c] transition-colors"
                    >
                      <option value="">Select a subject</option>
                      <option value="general">General Inquiry</option>
                      <option value="order">Order Status</option>
                      <option value="return">Returns & Exchanges</option>
                      <option value="wholesale">Wholesale Inquiry</option>
                      <option value="other">Other</option>
                    </select>
                  </div>

                  <div>
                    <label htmlFor="message" className="block text-sm font-medium text-gray-700 mb-2">
                      Your Message
                    </label>
                    <textarea
                      id="message"
                      required
                      rows={5}
                      value={formData.message}
                      onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                      className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:border-[#b59a5c] transition-colors resize-none"
                      placeholder="How can we help you?"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full py-4 bg-black text-white font-medium tracking-wider uppercase rounded-lg hover:bg-gray-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isSubmitting ? "Sending..." : "Send Message"}
                  </button>
                </form>
              )}
            </div>

            {/* Image & Info */}
            <div className="space-y-8">
              <div className="relative aspect-[4/3] rounded-lg overflow-hidden">
                <Image
                  src="/images/covers/about.png"
                  alt="Veloria Vault Collection"
                  fill
                  sizes="(min-width: 1024px) 40vw, 100vw"
                  className="object-cover"
                />
              </div>
              
              <div className="bg-[#1a1a1a] text-white rounded-lg p-8">
                <h3 className="text-xl font-serif mb-4">Why Choose Veloria Vault?</h3>
                <ul className="space-y-3 text-gray-300">
                  <li className="flex items-start gap-3">
                    <span className="text-[#b59a5c] mt-1">✓</span>
                    <span>Premium genuine leather craftsmanship</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="text-[#b59a5c] mt-1">✓</span>
                    <span>Hassle-free replacement policy</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="text-[#b59a5c] mt-1">✓</span>
                    <span>Free shipping on orders above ₹3000</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="text-[#b59a5c] mt-1">✓</span>
                    <span>Secure checkout & customer support</span>
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </section>


    </div>
  );
}
