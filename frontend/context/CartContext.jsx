'use client';
import { createContext, useContext, useState } from 'react';

const CartContext = createContext();

export function CartProvider({ children }) {
  const [cart, setCart] = useState([]); // [{item, quantity}]

  const addToCart = (item) => {
    // Normalize price to number in case Sequelize returns a string
    const normalized = { ...item, price: parseFloat(item.price) };
    setCart(prev => {
      const exists = prev.find(c => c.item.id === normalized.id);
      if (exists) return prev.map(c => c.item.id === normalized.id
        ? { ...c, quantity: c.quantity + 1 } : c);
      return [...prev, { item: normalized, quantity: 1 }];
    });
  };

  const removeFromCart = (id) => setCart(prev => prev.filter(c => c.item.id !== id));
  const clearCart = () => setCart([]);
  const total = cart.reduce((s, c) => s + parseFloat(c.item.price) * c.quantity, 0);

  return (
    <CartContext.Provider value={{ cart, addToCart, removeFromCart, clearCart, total }}>
      {children}
    </CartContext.Provider>
  );
}

export const useCart = () => useContext(CartContext);
