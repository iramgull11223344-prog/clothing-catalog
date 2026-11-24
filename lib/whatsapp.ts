import { STORE_ID, WHATSAPP_NUMBER } from "@/lib/config";

export type OrderInfo = {
  productName: string;
  color: string;
  size: string;
  price: string;
  customerName: string;
  phone: string;
  address: string;
};

export function buildOrderMessage(o: OrderInfo): string {
  return [
    `سڵاو، دەمەوێت ئەم کاڵایە داوا بکەم لە ${STORE_ID}:`,
    `ناوی کاڵا: ${o.productName}`,
    `ڕەنگ: ${o.color || "—"}`,
    `قەبارە: ${o.size || "—"}`,
    `نرخ: ${o.price}`,
    `ناوی کڕیار: ${o.customerName}`,
    `ژمارە مۆبایل: ${o.phone}`,
    `ناونیشان: ${o.address}`,
  ].join("\n");
}

export function whatsappUrl(message: string): string {
  return `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(message)}`;
}

// Remembers the customer's details on this device so repeat orders are faster.
const CUSTOMER_KEY = "wa-order-customer-v1";

export type Customer = { name: string; phone: string; address: string };

export function loadCustomer(): Customer {
  try {
    const raw = localStorage.getItem(CUSTOMER_KEY);
    if (raw) {
      const c = JSON.parse(raw);
      return { name: c.name ?? "", phone: c.phone ?? "", address: c.address ?? "" };
    }
  } catch {}
  return { name: "", phone: "", address: "" };
}

export function saveCustomer(c: Customer): void {
  try {
    localStorage.setItem(CUSTOMER_KEY, JSON.stringify(c));
  } catch {}
}
