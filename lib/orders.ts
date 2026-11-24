"use client";

import { useCallback, useEffect, useRef, useState, type FormEvent } from "react";
import { supabase } from "@/lib/supabase";
import { loadCustomer, saveCustomer, type Customer } from "@/lib/whatsapp";

export type OrderStatus = "new" | "contacted" | "delivered" | "cancelled";

export const ORDER_STATUSES: { id: OrderStatus; label: string }[] = [
  { id: "new", label: "نوێ" },
  { id: "contacted", label: "پەیوەندی پێوەکرا" },
  { id: "delivered", label: "گەیەنرا" },
  { id: "cancelled", label: "هەڵوەشایەوە" },
];

export type OrderLine = {
  product_id: string;
  name: string;
  image: string | null;
  color: string;
  color_hex: string | null;
  size: string;
  qty: number;
  unit_price: number;
  line_total: number;
};

export type Order = {
  id: string;
  order_no: number;
  customer_name: string;
  phone: string;
  address: string;
  note: string | null;
  items: OrderLine[];
  total: number;
  status: OrderStatus;
  created_at: string;
};

/** What the browser sends: only which item and how many — prices come from the database. */
export type CheckoutItem = { productId: string; color: string; colorHex: string | null; size: string; qty: number };

export type PlacedOrder = { orderNo: number; total: number };

/** Saves the order through public.place_order (prices are recomputed on the server). */
export async function placeOrder(c: Customer & { note: string }, items: CheckoutItem[]): Promise<PlacedOrder> {
  const { data, error } = await supabase.rpc("place_order", {
    p_name: c.name,
    p_phone: c.phone,
    p_address: c.address,
    p_note: c.note || null,
    p_items: items.map((i) => ({ product_id: i.productId, color: i.color, color_hex: i.colorHex, size: i.size, qty: i.qty })),
  });
  if (error) {
    const msg = String(error.message || "");
    if (/fetch|network|Failed to/i.test(msg)) throw new Error("پەیوەندی بە ئینتەرنێتەوە نییە، دووبارە هەوڵبدەرەوە.");
    throw new Error(msg || "ناردنی داواکاری سەرکەوتوو نەبوو، دووبارە هەوڵبدەرەوە.");
  }
  const row = Array.isArray(data) ? data[0] : data;
  return { orderNo: Number(row.order_no), total: Number(row.total) };
}

/** Checkout form state shared by the bag and the quick order on the product page. */
export function useCheckout(getItems: () => CheckoutItem[], onPlaced: (o: PlacedOrder) => void) {
  const [customer, setCustomer] = useState<Customer>({ name: "", phone: "", address: "" });
  const [note, setNote] = useState("");
  const [errs, setErrs] = useState<Partial<Record<keyof Customer, string>>>({});
  const [serverErr, setServerErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const sending = useRef(false);

  useEffect(() => setCustomer(loadCustomer()), []);

  const setField = useCallback((k: keyof Customer, v: string) => {
    setCustomer((c) => {
      const next = { ...c, [k]: v };
      saveCustomer(next); // remembered on this device for the next order
      return next;
    });
    setErrs((e) => (e[k] ? { ...e, [k]: undefined } : e));
    setServerErr(null);
  }, []);

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (sending.current) return; // no double orders from a double tap
    const c = { name: customer.name.trim(), phone: customer.phone.trim(), address: customer.address.trim() };
    const found: typeof errs = {};
    if (!c.name) found.name = "ناوی تەواوت بنووسە";
    if (!c.phone) found.phone = "ژمارەی مۆبایل بنووسە";
    else if (c.phone.replace(/\D/g, "").length < 7) found.phone = "ژمارەی مۆبایل دروست نییە";
    if (!c.address) found.address = "ناونیشانەکەت بنووسە (شار، گەڕەک، نزیک چی)";
    setErrs(found);
    const first = Object.keys(found)[0];
    if (first) {
      document.getElementById(`co-${first}`)?.focus();
      return;
    }
    const items = getItems();
    if (!items.length) return;
    sending.current = true;
    setBusy(true);
    setServerErr(null);
    try {
      const placed = await placeOrder({ ...c, note: note.trim() }, items);
      saveCustomer(c);
      setNote("");
      onPlaced(placed);
    } catch (err: any) {
      setServerErr(err?.message ?? "ناردنی داواکاری سەرکەوتوو نەبوو");
    } finally {
      sending.current = false;
      setBusy(false);
    }
  }

  return { customer, setField, note, setNote, errs, serverErr, busy, submit };
}

export type Checkout = ReturnType<typeof useCheckout>;
