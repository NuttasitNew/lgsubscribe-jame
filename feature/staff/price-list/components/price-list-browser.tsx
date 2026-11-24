"use client";

import { useRef, useState } from "react";
import { ArrowLeft, Search, ShoppingBag } from "lucide-react";
import { Button } from "@/components/ui/button";
import { type ComboPromotion, type PriceListItem, type PriceListModel } from "@/lib/price-list";
import { currentStart } from "./installment-timeline";
import { PriceListCart, type CartLine } from "./price-list-cart";
import { PriceListDetail } from "./price-list-detail";
import { PriceListPicker } from "./price-list-picker";
import { SelectedBar } from "./cart-controls";
import { CustomerBadge, CustomerChooser, type CustomerType } from "./customer-profile";
import { bestCombo, PromoBar, type PromoSettings } from "./promo-bar";

type Meta = { source: string; version: string; period: string };

/**
 * Staff price page. The product's prices fill the screen; products are chosen
 * from a search dialog (search → categories → list) opened from the header.
 */
export function PriceListBrowser({
  models,
  meta,
  initialModel,
  initialCustomer,
  combos,
  today,
  accessCode,
}: {
  models: PriceListModel[];
  meta: Meta;
  initialModel?: string;
  initialCustomer?: CustomerType;
  combos: ComboPromotion[];
  today: string;
  /** Staff code used to open the page (shown in the customer dialog with a sign-out link). */
  accessCode?: string;
}) {
  const initial = initialModel && models.some((m) => m.model === initialModel) ? initialModel : null;
  const [selected, setSelected] = useState<string | null>(initial);
  // Who the quote is for comes first; then, with no product yet, the picker.
  const [customer, setCustomer] = useState<CustomerType | null>(initialCustomer ?? null);
  const [chooserOpen, setChooserOpen] = useState(customer === null);
  const [pickerOpen, setPickerOpen] = useState(initial === null && customer !== null);
  const [cart, setCart] = useState<CartLine[]>([]);
  const [showCart, setShowCart] = useState(false);
  const nextKey = useRef(1);
  const start = currentStart(today);
  const [promo, setPromo] = useState<PromoSettings>({ item: true, combo: true });
  const combo = promo.combo && customer ? bestCombo(combos, today, customer) : null;

  const current = models.find((m) => m.model === selected) ?? null;
  const cartOpen = showCart && cart.length > 0;

  const addToCart = (item: PriceListItem) => {
    const image = models.find((m) => m.model === item.model)?.image ?? null;
    setCart((lines) => [...lines, { key: nextKey.current++, item, image }]);
  };
  // Remove the most recently added unit of this contract option / model.
  const removeLast = (match: (l: CartLine) => boolean) =>
    setCart((lines) => {
      const index = lines.findLastIndex(match);
      if (index < 0) return lines;
      const next = lines.filter((_, i) => i !== index);
      if (next.length === 0) setShowCart(false);
      return next;
    });
  const removeItem = (id: string) => removeLast((l) => l.item.id === id);
  // Switch every unit of one cart card to another contract option of the same model.
  const swapItem = (fromId: string, to: PriceListItem) =>
    setCart((lines) => lines.map((l) => (l.item.id === fromId ? { ...l, item: to } : l)));
  const optionsOf = (model: string) =>
    models.find((m) => m.model === model)?.options.filter((o) => o.saleType !== "Outright") ?? [];
  const clearCart = () => {
    if (!window.confirm(`ล้างรายการทั้งหมด ${cart.length} เครื่อง?`)) return;
    setCart([]);
    setShowCart(false);
  };
  const addModel = (model: string) => {
    const entry = models.find((m) => m.model === model);
    const option = entry?.options.find((o) => o.saleType !== "Outright") ?? entry?.options[0];
    if (option) addToCart(option);
  };
  const openCart = () => {
    setShowCart(true);
    setPickerOpen(false);
    window.scrollTo({ top: 0 });
  };

  const chooseCustomer = (next: CustomerType) => {
    const first = customer === null;
    setCustomer(next);
    setChooserOpen(false);
    const url = new URL(window.location.href);
    url.searchParams.set("customer", next);
    window.history.replaceState(null, "", url);
    if (first && !current) setPickerOpen(true);
  };

  // Keep the chosen model in the URL so staff can share or refresh the same product.
  const select = (model: string) => {
    setShowCart(false);
    setSelected(model);
    setPickerOpen(false);
    const url = new URL(window.location.href);
    url.searchParams.set("model", model);
    window.history.replaceState(null, "", url);
    window.scrollTo({ top: 0 });
  };

  return (
    <div className="min-h-dvh bg-[hsl(36_25%_97%)]">
      <header className="sticky top-0 z-20 border-b border-border bg-white/95 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center gap-2 px-3 py-2.5 sm:gap-3 sm:px-4">
          <CustomerBadge customer={customer} onClick={() => setChooserOpen(true)} />
          <div className="hidden min-w-0 sm:block">
            <h1 className="truncate text-base font-bold">ราคา &amp; ตารางผ่อน</h1>
            <p className="truncate text-xs text-muted-foreground">โปร {meta.period}</p>
          </div>
          <button
            type="button"
            onClick={() => setPickerOpen(true)}
            aria-haspopup="dialog"
            className="flex h-11 min-w-0 flex-1 items-center gap-2 rounded-xl border border-input bg-white px-3 text-left text-sm text-muted-foreground shadow-sm transition-colors hover:border-primary/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring sm:ml-auto sm:max-w-md"
          >
            <Search className="size-4 shrink-0" />
            <span className="truncate">{current ? current.model : "ค้นหาสินค้า / เลือกรุ่น"}</span>
            <span className="ml-auto shrink-0 text-xs font-semibold text-primary">
              {current ? "เปลี่ยนรุ่น" : "ค้นหา"}
            </span>
          </button>
          <Button
            variant={cartOpen ? "default" : "outline"}
            onClick={() => (cartOpen ? setShowCart(false) : openCart())}
            disabled={cart.length === 0}
            aria-label={`รายการที่เลือก ${cart.length} เครื่อง`}
            className="h-11 shrink-0 px-3"
          >
            <ShoppingBag />
            <span className="hidden md:inline">รายการ</span>
            {cart.length > 0 && (
              <span className="flex size-5 items-center justify-center rounded-full bg-primary text-[11px] font-bold text-primary-foreground ring-2 ring-white">
                {cart.length}
              </span>
            )}
          </Button>
        </div>
        {/* In the cart view each item card has its own − n +, so the bar would only repeat it. */}
        {!cartOpen && (
          <SelectedBar
            lines={cart}
            onAdd={addToCart}
            onRemoveItem={removeItem}
            onOpenCart={openCart}
            onClear={clearCart}
            className="mx-auto max-w-6xl border-t border-border px-3 py-1.5 sm:px-4"
          />
        )}
      </header>

      <main className="mx-auto max-w-6xl md:px-4 md:py-4">
        <div className="min-w-0 md:rounded-2xl md:border md:border-border md:bg-white">
          {(cartOpen || current) && (
            <PromoBar
              combos={combos}
              today={today}
              period={meta.period}
              settings={promo}
              onChange={setPromo}
              customer={customer ?? "new"}
              units={cart.filter((l) => l.item.saleType !== "Outright" && l.item.contractMonths).length}
              className="border-b border-border bg-white px-4 py-3 md:rounded-t-2xl md:px-6"
            />
          )}
          {cartOpen ? (
            <>
              {current && (
                <div className="border-b border-border px-2 py-1">
                  <Button variant="ghost" onClick={() => setShowCart(false)} className="h-11">
                    <ArrowLeft /> กลับไป {current.model}
                  </Button>
                </div>
              )}
              <PriceListCart
                lines={cart}
                combos={combos}
                today={today}
                start={start}
                wide
                promo={promo}
                customer={customer ?? "new"}
                onAdd={addToCart}
                onRemoveItem={removeItem}
                onAddMore={() => setPickerOpen(true)}
                onClear={clearCart}
                optionsOf={optionsOf}
                onSwap={swapItem}
              />
            </>
          ) : current ? (
            <PriceListDetail
              key={current.model}
              model={current}
              wide
              start={start}
              promo={promo}
              combo={combo}
              customer={customer ?? "new"}
              countOf={(id) => cart.filter((l) => l.item.id === id).length}
              onAdd={addToCart}
              onRemove={removeItem}
            />
          ) : (
            <div className="flex min-h-[60dvh] flex-col items-center justify-center gap-4 p-8 text-center">
              <p className="text-muted-foreground">เลือกสินค้าเพื่อดูราคาและตารางผ่อน</p>
              <Button onClick={() => setPickerOpen(true)} className="h-12 px-6">
                <Search /> ค้นหาสินค้า
              </Button>
              <p className="text-xs text-muted-foreground">
                โปร {meta.period} · {meta.source}
              </p>
            </div>
          )}
        </div>
      </main>

      <PriceListPicker
        open={pickerOpen}
        onOpenChange={setPickerOpen}
        models={models}
        selected={selected}
        onSelect={select}
        lines={cart}
        countOf={(model) => cart.filter((l) => l.item.model === model).length}
        onAdd={addModel}
        onRemoveModel={(model) => removeLast((l) => l.item.model === model)}
        onAddItem={addToCart}
        onRemoveItem={removeItem}
        onOpenCart={openCart}
        onClear={clearCart}
      />

      <CustomerChooser
        open={chooserOpen}
        customer={customer}
        onChoose={chooseCustomer}
        onOpenChange={setChooserOpen}
        accessCode={accessCode}
      />
    </div>
  );
}
