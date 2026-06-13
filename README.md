# Veloria Headless

[![Next.js](https://img.shields.io/badge/Next.js-App%20Router-black?logo=next.js)](https://nextjs.org)
[![WooCommerce](https://img.shields.io/badge/WooCommerce-Headless%20API-96588A?logo=woocommerce&logoColor=white)](https://woocommerce.com)
[![Zustand](https://img.shields.io/badge/Zustand-State%20Management-443E38)](https://github.com/pmndrs/zustand)
[![Framer Motion](https://img.shields.io/badge/Framer%20Motion-animations-0055FF?logo=framer&logoColor=white)](https://framer.com/motion)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)


A modern, premium **Headless WooCommerce** e-commerce website built with **Next.js**, **React**, and **Zustand**.

---

## 🚀 Overview

This project is a decoupled frontend for a WooCommerce store, designed to provide a blazing-fast, app-like user experience with rich aesthetics, glassmorphism UI accents, and smooth GSAP/Framer Motion animations.

### Key Features

*   **⚡ Headless Architecture**: Next.js App Router communicating with WooCommerce REST API.
*   **🛒 Advanced Cart Drawer**: Standardized state management with Zustand, enabling auto-open drawer reveals from any generic Add to Cart action.
*   **🎨 Dynamic Swatches**: Single product views dynamically render variation updates preserving core style thumbnails stably.
*   **❤️ Premium Wishlist**: Rebuilt Wishlist UX containing card rounded corner transforms, sale priority badges, and bulk bulk bulk additions.
*   **📱 Fully Responsive**: Edge-to-edge adaptive layouts for mobile and desktop viewports.

---

## 🛠️ Tech Stack

*   **Frontend**: [Next.js](https://nextjs.org/) (App Router)
*   **Styling**: Vanilla CSS + Tailwind CSS utilities
*   **Animations**: Framer Motion
*   **State Management**: [Zustand](https://github.com/pmndrs/zustand)
*   **Backend**: WooCommerce REST API

---

## 🏁 Getting Started

### 1. Installation

```bash
cd veloria-headless
npm install
```

### 2. Environment Variables

Create a `.env.local` file in the root directory:

```env
NEXT_PUBLIC_WOOCOMMERCE_URL="https://your-wordpress-site.com"
WOOCOMMERCE_CONSUMER_KEY="ck_..."
WOOCOMMERCE_CONSUMER_SECRET="cs_..."
```

### 3. Run Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.
