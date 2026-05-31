"use client";

import { useEffect, useState } from "react";
import { Card, Button, Input, Icon } from "@/components/ui";

type Product = { id: string; name: string; priceCents: number; stock: number; couponPct: number | null; active: boolean };
const brl = (c: number) => (c / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

export function ProductsClient({ canEdit }: { canEdit: boolean }) {
  const [items, setItems] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [f, setF] = useState({ name: "", price: "", stock: "", coupon: "" });
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function load() {
    try { const r = await fetch("/api/products"); const j = await r.json().catch(() => ({})); if (j.ok) setItems(j.products); }
    finally { setLoading(false); }
  }
  useEffect(() => { load(); /* eslint-disable-next-line */ }, []);

  async function add() {
    setErr(null);
    if (f.name.trim().length < 2 || !f.price) { setErr("Informe nome e preço"); return; }
    setBusy(true);
    try {
      const r = await fetch("/api/products", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: f.name, priceCents: Math.round(parseFloat(f.price.replace(",", ".")) * 100), stock: Number(f.stock) || 0, couponPct: f.coupon ? Number(f.coupon) : null }),
      });
      const j = await r.json().catch(() => ({}));
      if (!r.ok || !j.ok) { setErr(j.error ?? "Erro"); return; }
      setItems((p) => [...p, j.product].sort((a, b) => a.name.localeCompare(b.name)));
      setF({ name: "", price: "", stock: "", coupon: "" });
    } finally { setBusy(false); }
  }

  async function del(id: string) {
    await fetch(`/api/products?id=${id}`, { method: "DELETE" });
    setItems((p) => p.filter((x) => x.id !== id));
  }

  return (
    <Card className="p-6">
      <h2 className="text-[15px] font-semibold text-slate-800 flex items-center gap-2"><Icon.Cart size={16} /> Catálogo & estoque</h2>
      <p className="mt-1 text-[12.5px] text-slate-500">Itens com preço/estoque/cupom aparecem no comparador de preços do paciente.</p>

      {canEdit && (
        <div className="mt-4 grid gap-2 sm:grid-cols-[1fr_auto_auto_auto_auto] sm:items-end rounded-lg border border-slate-200 bg-slate-50 p-3">
          {err && <p className="sm:col-span-5 text-[12px] text-rose-700">{err}</p>}
          <div><label className="text-[11px] text-slate-600">Produto</label><Input value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} placeholder="Ex.: Losartana 50mg" /></div>
          <div><label className="text-[11px] text-slate-600">Preço R$</label><Input value={f.price} onChange={(e) => setF({ ...f, price: e.target.value })} inputMode="decimal" className="w-24" placeholder="19,90" /></div>
          <div><label className="text-[11px] text-slate-600">Estoque</label><Input value={f.stock} onChange={(e) => setF({ ...f, stock: e.target.value })} inputMode="numeric" className="w-20" placeholder="0" /></div>
          <div><label className="text-[11px] text-slate-600">Cupom %</label><Input value={f.coupon} onChange={(e) => setF({ ...f, coupon: e.target.value })} inputMode="numeric" className="w-20" placeholder="0" /></div>
          <Button size="md" onClick={add} disabled={busy} icon={<Icon.Plus size={14} />}>Add</Button>
        </div>
      )}

      <div className="mt-4 space-y-1.5">
        {loading && <p className="text-[13px] text-slate-500">Carregando…</p>}
        {!loading && items.length === 0 && <p className="text-[13px] text-slate-500">Nenhum item cadastrado.</p>}
        {items.map((p) => (
          <div key={p.id} className="flex items-center justify-between rounded-lg border border-slate-100 px-3.5 py-2">
            <div className="min-w-0">
              <p className="text-[13.5px] font-medium text-slate-800 truncate">{p.name}</p>
              <p className="text-[12px] text-slate-500">{brl(p.priceCents)}{p.couponPct ? ` · -${p.couponPct}%` : ""} · {p.stock} em estoque</p>
            </div>
            {canEdit && <button onClick={() => del(p.id)} className="shrink-0 text-[11.5px] text-rose-600 hover:underline">remover</button>}
          </div>
        ))}
      </div>
    </Card>
  );
}
