import React, { useEffect, useMemo, useState } from "react";
import { api } from "./api";

function formatINR(n) {
  const x = Number(n || 0);
  return x.toLocaleString("en-IN", { style: "currency", currency: "INR" });
}

const getItemVisual = (name) => {
  const n = (name || "").toLowerCase().trim();

  const rules = [
    { keys: ["apple"], emoji: "🍎", category: "Fruits", price: 30, bg: "linear-gradient(135deg,#fee2e2,#fff7ed)" },
    { keys: ["banana"], emoji: "🍌", category: "Fruits", price: 25, bg: "linear-gradient(135deg,#fef9c3,#fff7ed)" },
    { keys: ["orange"], emoji: "🍊", category: "Fruits", price: 35, bg: "linear-gradient(135deg,#ffedd5,#fff7ed)" },

    { keys: ["tomato"], emoji: "🍅", category: "Vegetables", price: 35, bg: "linear-gradient(135deg,#fee2e2,#fff7ed)" },
    { keys: ["onion"], emoji: "🧅", category: "Vegetables", price: 40, bg: "linear-gradient(135deg,#e9d5ff,#f8fafc)" },
    { keys: ["potato"], emoji: "🥔", category: "Vegetables", price: 30, bg: "linear-gradient(135deg,#ffedd5,#f8fafc)" },

    { keys: ["milk"], emoji: "🥛", category: "Dairy", price: 55, bg: "linear-gradient(135deg,#dbeafe,#f8fafc)" },
    { keys: ["egg", "eggs"], emoji: "🥚", category: "Dairy", price: 70, bg: "linear-gradient(135deg,#fef3c7,#fff7ed)" },
    { keys: ["cheese"], emoji: "🧀", category: "Dairy", price: 110, bg: "linear-gradient(135deg,#fef9c3,#f8fafc)" },
    { keys: ["butter"], emoji: "🧈", category: "Dairy", price: 95, bg: "linear-gradient(135deg,#ffedd5,#fefce8)" },

    { keys: ["bread"], emoji: "🍞", category: "Bakery", price: 45, bg: "linear-gradient(135deg,#ffedd5,#fefce8)" },
    { keys: ["rice"], emoji: "🍚", category: "Grains", price: 120, bg: "linear-gradient(135deg,#dcfce7,#f8fafc)" },
    { keys: ["atta", "flour"], emoji: "🌾", category: "Grains", price: 49, bg: "linear-gradient(135deg,#fef3c7,#fff7ed)" },

    { keys: ["dal", "lentil"], emoji: "🥣", category: "Pulses", price: 49, bg: "linear-gradient(135deg,#ffedd5,#fff7ed)" },
    { keys: ["chana", "rajma", "beans"], emoji: "🫘", category: "Pulses", price: 49, bg: "linear-gradient(135deg,#fee2e2,#fff7ed)" },

    { keys: ["turmeric", "haldi"], emoji: "🧡", category: "Spices", price: 49, bg: "linear-gradient(135deg,#ffedd5,#fff7ed)" },
    { keys: ["chilli", "chili"], emoji: "🌶️", category: "Spices", price: 49, bg: "linear-gradient(135deg,#fee2e2,#fff7ed)" },
    { keys: ["coriander", "dhaniya"], emoji: "🌿", category: "Spices", price: 49, bg: "linear-gradient(135deg,#dcfce7,#f8fafc)" },
    { keys: ["garam", "masala"], emoji: "✨", category: "Spices", price: 49, bg: "linear-gradient(135deg,#ede9fe,#f8fafc)" },

    { keys: ["ketchup"], emoji: "🍅", category: "Sauces", price: 49, bg: "linear-gradient(135deg,#fee2e2,#fff7ed)" },
    { keys: ["pasta"], emoji: "🍝", category: "Pantry", price: 49, bg: "linear-gradient(135deg,#fff7ed,#f8fafc)" },
    { keys: ["noodle", "noodles"], emoji: "🍜", category: "Pantry", price: 49, bg: "linear-gradient(135deg,#ffedd5,#f8fafc)" },
    { keys: ["chocolate"], emoji: "🍫", category: "Snacks", price: 49, bg: "linear-gradient(135deg,#e9d5ff,#f8fafc)" },

    { keys: [], emoji: "🛍️", category: "General", price: 49, bg: "linear-gradient(135deg,#e5e7eb,#f8fafc)" },
  ];

  for (const rule of rules) {
    if (rule.keys.some((k) => n.includes(k))) return rule;
  }
  return { emoji: "🛍️", category: "General", price: 49, bg: "linear-gradient(135deg,#e5e7eb,#f8fafc)" };
};

export default function ItemsPage({ onLogout }) {
  const [items, setItems] = useState([]);
  const [cart, setCart] = useState(null);
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(false);

  const loadItems = async () => {
    const res = await api.get("/items");
    setItems(res.data || []);
  };

  const loadOrders = async () => {
    try {
      const res = await api.get("/orders");
      setOrders(res.data || []);
    } catch {
      setOrders([]);
    }
  };

  const loadMyCart = async () => {
    try {
      const res = await api.get("/carts/me");
      setCart(res.data);
    } catch {
      setCart(null);
    }
  };

  useEffect(() => {
    loadItems();
    loadOrders();
    loadMyCart();
  }, []);

  const itemById = useMemo(() => new Map(items.map((i) => [i.id, i])), [items]);

  const cartItemsDetailed = useMemo(() => {
    const list = cart?.cart_items || [];
    return list.map((ci) => {
      const it = itemById.get(ci.item_id);
      const meta = getItemVisual(it?.name || "");
      return {
        ...ci,
        item: it ? { ...it, ...meta } : { id: ci.item_id, name: "Unknown", ...getItemVisual(""), price: 0 },
      };
    });
  }, [cart, itemById]);

  const cartTotal = useMemo(
    () => cartItemsDetailed.reduce((sum, ci) => sum + (ci.item?.price || 0), 0),
    [cartItemsDetailed]
  );

  const addToCart = async (itemId) => {
    try {
      setLoading(true);
      const res = await api.post("/carts", { itemId });
      setCart(res.data);
    } catch (e) {
      console.error(e);
      window.alert("Failed to add item. Please login again.");
    } finally {
      setLoading(false);
    }
  };

  const removeFromCart = async (itemId) => {
    try {
      setLoading(true);
      const token = localStorage.getItem("token");
      const res = await api.delete(`/carts/items/${itemId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setCart(res.data);
    } catch (e) {
      console.error(e);
      const msg = e?.response?.data?.error || e?.response?.data || e.message;
      window.alert(msg);
    } finally {
      setLoading(false);
    }
  };

  const checkout = async () => {
    if (!cart?.cart?.id) {
      window.alert("Cart is empty.");
      return;
    }
    try {
      setLoading(true);
      await api.post("/orders", { cartId: cart.cart.id });
      window.alert("Order placed successfully ✅");
      setCart(null);
      await loadOrders();
      await loadMyCart();
    } catch (e) {
      console.error(e);
      const msg = e?.response?.data?.error || e?.response?.data || e.message;
      window.alert(msg);
    } finally {
      setLoading(false);
    }
  };

  const refreshOrders = async () => {
    setLoading(true);
    await loadOrders();
    setLoading(false);
  };

  const handleLogout = () => {
    setCart(null);
    setOrders([]);
    onLogout();
  };

  const styles = {
    page: {
      minHeight: "100vh",
      background:
        "radial-gradient(1200px 600px at 15% 10%, rgba(99,102,241,0.18), transparent 55%), radial-gradient(900px 500px at 85% 5%, rgba(34,197,94,0.16), transparent 55%), linear-gradient(180deg,#f6f8ff,#ffffff)",
      fontFamily: "Inter, system-ui, -apple-system, Segoe UI, Arial, sans-serif",
      padding: 16,
    },
    wrap: { maxWidth: 1150, margin: "0 auto" },
    headerBar: {
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      gap: 12,
      flexWrap: "wrap",
      marginBottom: 16,
    },
    brand: { display: "flex", alignItems: "center", gap: 12 },
    logo: {
      width: 48,
      height: 48,
      borderRadius: 14,
      background: "linear-gradient(135deg,#6366f1,#22c55e)",
      display: "grid",
      placeItems: "center",
      color: "#fff",
      fontWeight: 900,
      letterSpacing: 0.5,
      flex: "0 0 48px",
      boxShadow: "0 14px 26px rgba(99,102,241,0.25)",
    },
    title: { margin: 0, fontSize: 22, fontWeight: 900, color: "#111827" },
    sub: { margin: "4px 0 0", color: "#6b7280", fontSize: 13 },
    actionsRow: { display: "flex", gap: 10, flexWrap: "wrap" },
    btn: {
      border: "1px solid #e5e7eb",
      background: "#fff",
      borderRadius: 12,
      padding: "10px 12px",
      fontWeight: 900,
      cursor: "pointer",
      boxShadow: "0 10px 20px rgba(17,24,39,0.06)",
      whiteSpace: "nowrap",
    },
    btnPrimary: { background: "linear-gradient(135deg,#6366f1,#8b5cf6)", color: "#fff", border: "none" },
    btnGhost: { background: "#fff", border: "1px solid #e5e7eb" },
    btnDanger: { background: "linear-gradient(135deg,#ef4444,#f97316)", color: "#fff", border: "none" },
    disabled: { opacity: 0.6, cursor: "not-allowed" },
    grid: { display: "grid", gridTemplateColumns: "1.25fr 0.75fr", gap: 14 },
    card: {
      background: "rgba(255,255,255,0.9)",
      border: "1px solid rgba(238,242,255,1)",
      borderRadius: 18,
      boxShadow: "0 16px 32px rgba(17,24,39,0.08)",
      padding: 16,
      backdropFilter: "blur(8px)",
    },
    sectionTitle: { margin: 0, fontSize: 18, fontWeight: 900, color: "#111827" },
    hint: { margin: "6px 0 0", color: "#6b7280", fontSize: 13 },
    badge: {
      fontSize: 12,
      fontWeight: 900,
      color: "#4338ca",
      background: "#eef2ff",
      padding: "4px 10px",
      borderRadius: 999,
      whiteSpace: "nowrap",
    },
    itemsGrid: { marginTop: 12, display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: 12 },
    itemCard: {
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      gap: 12,
      border: "1px solid #e5e7eb",
      borderRadius: 14,
      padding: 12,
      cursor: "pointer",
      background: "linear-gradient(180deg,#fff,#fbfdff)",
      transition: "transform 120ms ease, box-shadow 120ms ease",
    },
    itemLeft: { display: "flex", alignItems: "center", gap: 12, minWidth: 0 },
    icon: {
      width: 44,
      height: 44,
      borderRadius: 12,
      border: "1px solid #e5e7eb",
      display: "grid",
      placeItems: "center",
      fontSize: 24,
      lineHeight: "24px",
      flex: "0 0 44px",
      userSelect: "none",
    },
    name: { margin: 0, fontWeight: 900, color: "#111827", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" },
    meta: { margin: "3px 0 0", color: "#6b7280", fontSize: 12, display: "flex", gap: 8, flexWrap: "wrap" },
    chip: {
      fontSize: 11,
      fontWeight: 900,
      padding: "3px 8px",
      borderRadius: 999,
      border: "1px solid #e5e7eb",
      background: "#fff",
      color: "#374151",
    },
    price: { fontWeight: 900, color: "#111827", fontSize: 13, background: "#ecfeff", border: "1px solid #a5f3fc" },
    cartRow: {
      display: "flex",
      justifyContent: "space-between",
      alignItems: "center",
      gap: 10,
      padding: "10px 0",
      borderBottom: "1px solid #f3f4f6",
    },
    removeBtn: {
      borderRadius: 10,
      padding: "8px 10px",
      border: "1px solid #fecaca",
      background: "#fff5f5",
      color: "#b91c1c",
      fontWeight: 900,
      cursor: "pointer",
      whiteSpace: "nowrap",
    },
    totalBar: {
      marginTop: 12,
      display: "flex",
      justifyContent: "space-between",
      alignItems: "center",
      padding: 12,
      borderRadius: 14,
      background: "linear-gradient(135deg,#eef2ff,#ecfeff)",
      border: "1px solid #e5e7eb",
      fontWeight: 900,
    },
    ordersWrap: { marginTop: 14, borderTop: "1px dashed #e5e7eb", paddingTop: 14 },
    orderRow: {
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      gap: 10,
      padding: "10px 0",
      borderBottom: "1px solid #f3f4f6",
    },
    status: {
      fontSize: 12,
      fontWeight: 900,
      color: "#0369a1",
      background: "#ecfeff",
      border: "1px solid #bae6fd",
      padding: "6px 10px",
      borderRadius: 999,
      whiteSpace: "nowrap",
    },
    small: { fontSize: 12, color: "#6b7280" },
  };

  return (
    <div style={styles.page}>
      <style>{`
        @media (max-width: 950px) {
          .grid { grid-template-columns: 1fr !important; }
          .itemsGrid { grid-template-columns: 1fr !important; }
          .actionsRow { width: 100% !important; justify-content: flex-start !important; }
        }
      `}</style>

      <div style={styles.wrap}>
        <div style={styles.headerBar}>
          <div style={styles.brand}>
            <div style={styles.logo}>SC</div>
            <div>
              <p style={styles.title}>Shopping Cart</p>
              <p style={styles.sub}>Add items, view cart, and checkout</p>
            </div>
          </div>

          <div className="actionsRow" style={styles.actionsRow}>
            <button
              onClick={checkout}
              disabled={loading}
              style={{ ...styles.btn, ...styles.btnPrimary, ...(loading ? styles.disabled : {}) }}
            >
              ✅ Checkout
            </button>

            <button
              onClick={refreshOrders}
              disabled={loading}
              style={{ ...styles.btn, ...styles.btnGhost, ...(loading ? styles.disabled : {}) }}
            >
              📦 Refresh Orders
            </button>

            <button onClick={handleLogout} style={{ ...styles.btn, ...styles.btnDanger }}>
              🚪 Logout
            </button>
          </div>
        </div>

        <div className="grid" style={styles.grid}>
          <div style={styles.card}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 10 }}>
              <div>
                <p style={styles.sectionTitle}>Items</p>
                <p style={styles.hint}>Tap an item to add to cart.</p>
              </div>
              <span style={styles.badge}>{items.length} items</span>
            </div>

            <div className="itemsGrid" style={styles.itemsGrid}>
              {items.map((it) => {
                const v = getItemVisual(it.name);
                return (
                  <div
                    key={it.id}
                    onClick={() => addToCart(it.id)}
                    style={{ ...styles.itemCard, opacity: loading ? 0.75 : 1 }}
                    onMouseEnter={(e) => (e.currentTarget.style.boxShadow = "0 16px 28px rgba(17,24,39,0.10)")}
                    onMouseLeave={(e) => (e.currentTarget.style.boxShadow = "none")}
                  >
                    <div style={styles.itemLeft}>
                      <div style={{ ...styles.icon, background: v.bg }}>{v.emoji}</div>
                      <div style={{ minWidth: 0 }}>
                        <p style={styles.name}>{it.name}</p>
                        <div style={styles.meta}>
                          <span style={styles.chip}>ID: {it.id}</span>
                          <span style={styles.chip}>{v.category}</span>
                          <span style={{ ...styles.chip, ...styles.price }}>{formatINR(v.price)}</span>
                        </div>
                      </div>
                    </div>

                    <span style={{ ...styles.badge, background: "#ecfdf5", color: "#065f46" }}>Add</span>
                  </div>
                );
              })}
            </div>
          </div>

          <div style={styles.card}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 10 }}>
              <div>
                <p style={styles.sectionTitle}>Cart</p>
                <p style={styles.hint}>Remove items if needed.</p>
              </div>
              <span style={styles.badge}>{cartItemsDetailed.length} in cart</span>
            </div>

            {!cartItemsDetailed.length ? (
              <div style={{ marginTop: 12, color: "#6b7280", fontSize: 13 }}>Your cart is empty.</div>
            ) : (
              <>
                <div style={{ marginTop: 12 }}>
                  {cartItemsDetailed.map((ci, idx) => {
                    const it = ci.item;
                    const v = getItemVisual(it.name);
                    return (
                      <div key={ci.id || idx} style={styles.cartRow}>
                        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                          <div style={{ ...styles.icon, background: v.bg }}>{v.emoji}</div>
                          <div>
                            <div style={{ fontWeight: 900 }}>{it.name}</div>
                            <div style={styles.small}>
                              Item #{ci.item_id} • {v.category} • {formatINR(v.price)}
                            </div>
                          </div>
                        </div>

                        <button
                          onClick={() => removeFromCart(ci.item_id)}
                          disabled={loading}
                          style={{ ...styles.removeBtn, ...(loading ? styles.disabled : {}) }}
                        >
                          Remove
                        </button>
                      </div>
                    );
                  })}
                </div>

                <div style={styles.totalBar}>
                  <span>Total</span>
                  <span>{formatINR(cartTotal)}</span>
                </div>
              </>
            )}

            <div style={styles.ordersWrap}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 10 }}>
                <div>
                  <p style={styles.sectionTitle}>Order History</p>
                  <p style={styles.hint}>Latest orders (items not available from backend yet).</p>
                </div>
                <span style={styles.badge}>{orders.length} orders</span>
              </div>

              {!orders.length ? (
                <div style={{ marginTop: 10, color: "#6b7280", fontSize: 13 }}>No orders yet.</div>
              ) : (
                <div style={{ marginTop: 10 }}>
                  {[...orders]
                    .slice()
                    .reverse()
                    .map((o) => (
                      <div key={o.id} style={styles.orderRow}>
                        <div>
                          <div style={{ fontWeight: 900 }}>Order #{o.id}</div>
                          <div style={styles.small}>
                            Date: {o.created_at ? new Date(o.created_at).toLocaleString() : "-"}
                          </div>
                          <div style={styles.small}>Cart ID: {o.cart_id}</div>
                        </div>
                        <span style={styles.status}>PLACED</span>
                      </div>
                    ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
