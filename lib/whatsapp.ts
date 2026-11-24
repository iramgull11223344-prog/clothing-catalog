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

export type CartLine = { name: string; color: string; size: string; qty: number; price: number };

/** One tidy message for the whole bag: each item, its line total, the grand total and the customer. */
export function buildCartMessage(
  lines: CartLine[],
  customer: { name: string; phone: string; address: string },
  money: (n: number) => string
): string {
  const pieces = lines.reduce((n, l) => n + l.qty, 0);
  const total = lines.reduce((n, l) => n + l.qty * l.price, 0);
  const items = lines.map((l, i) => {
    const details = [l.color ? `ڕەنگ: ${l.color}` : "", l.size ? `قەبارە: ${l.size}` : ""].filter(Boolean).join(" | ");
    return [
      `${i + 1}) ${l.name}`,
      details,
      `ژمارە: ${l.qty} × ${money(l.price)} = ${money(l.qty * l.price)}`,
    ]
      .filter(Boolean)
      .join("\n");
  });
  return [
    `سڵاو، دەمەوێت ئەم کاڵایانە داوا بکەم لە ${STORE_ID}:`,
    "",
    items.join("\n\n"),
    "",
    `کۆی گشتی: ${money(total)} (${pieces} پارچە)`,
    "",
    `ناوی کڕیار: ${customer.name}`,
    `ژمارە مۆبایل: ${customer.phone}`,
    `ناونیشان: ${customer.address}`,
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
