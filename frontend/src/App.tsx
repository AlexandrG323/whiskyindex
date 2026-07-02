import { useEffect, useState } from 'react';

type Product = { id: string; name: string };
type Stock = { ticker: string; name: string };

export default function App() {
  const [products, setProducts] = useState<Product[]>([]);
  const [stocks, setStocks] = useState<Stock[]>([]);

  useEffect(() => {
    fetch('/api/products')
      .then((r) => r.json())
      .then(setProducts)
      .catch(() => setProducts([]));
    fetch('/api/stocks')
      .then((r) => r.json())
      .then(setStocks)
      .catch(() => setStocks([]));
  }, []);

  return (
    <main>
      <h1>Whisky Index</h1>
      <p>Бутылка или Портфель? Сравни корзину продуктов с портфелем акций.</p>

      <section>
        <h2>Продуктовая корзина</h2>
        <ul>
          {products.map((p) => (
            <li key={p.id}>{p.name}</li>
          ))}
        </ul>
      </section>

      <section>
        <h2>Акции (2007)</h2>
        <ul>
          {stocks.map((s) => (
            <li key={s.ticker}>
              {s.name} ({s.ticker})
            </li>
          ))}
        </ul>
      </section>
    </main>
  );
}
