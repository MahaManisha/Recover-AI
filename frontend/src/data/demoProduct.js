export const DEFAULT_DEMO_MERCHANT_ID = "0a9a09a5-ef18-45da-a0ce-7c5f0f23a991";

export const INITIAL_MERCHANT_PRODUCTS = [
  {
    id: "prod_ai_fullstack_001",
    productId: "prod_ai_fullstack_001",
    merchantId: DEFAULT_DEMO_MERCHANT_ID,
    name: "AI & Full-Stack Development Program",
    description: "Build practical industry-ready skills in AI, backend development, frontend development, and modern application engineering.",
    category: "Education / Online Program",
    price: 2000,
    currency: "INR",
    formattedPrice: "₹2,000",
    active: true
  },
  {
    id: "prod_ai_microservices_002",
    productId: "prod_ai_microservices_002",
    merchantId: DEFAULT_DEMO_MERCHANT_ID,
    name: "Advanced AI Microservices & Autonomous Agents",
    description: "Master multi-agent orchestration, autonomous decision flows, production LLM pipelines, and system reliability.",
    category: "Education / Advanced Systems",
    price: 3500,
    currency: "INR",
    formattedPrice: "₹3,500",
    active: true
  }
];

export const DEMO_PRODUCT = {
  ...INITIAL_MERCHANT_PRODUCTS[0],
  id: "ai-fullstack-program",
  productId: "ai-fullstack-program" // Backwards compatibility for existing test references
};


