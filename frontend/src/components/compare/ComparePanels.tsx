import { BasketCard } from '../comparison/BasketCard'
import {
  pickTopGrowthStock,
  stockInvestmentRange,
  stockLogoUrl,
} from '../comparison/comparisonUtils'
import type { CompareStock } from '../comparison/HeroComparison'
import { StockCard } from '../comparison/StockCard'
import { HorizontalScroller } from './HorizontalScroller'

export { pickTopGrowthStock }

function formatGrowth(value: number) {
  const rounded = Math.round(value)
  const sign = rounded >= 0 ? '+' : ''
  return `${sign}${rounded.toLocaleString('ru-RU')}%`
}

function formatMoney(amount: number, currency: 'RUB' | 'USD') {
  const digits = Number.isInteger(amount) ? 0 : 2
  return new Intl.NumberFormat('ru-RU', {
    style: 'currency',
    currency,
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  }).format(amount)
}

interface AdvantageCardProps {
  stock: CompareStock
  cartGrowthPercent: number
  currency: 'RUB' | 'USD'
}

export function AdvantageCard({ stock, cartGrowthPercent, currency }: AdvantageCardProps) {
  const edge = stock.growthPercent - cartGrowthPercent
  const investment = stockInvestmentRange(stock)
  const better = edge >= 0

  return (
    <aside className="advantage-card" aria-label="Что выгоднее">
      <h3>Что выгоднее?</h3>
      <p className="advantage-value">{formatGrowth(Math.abs(edge))}</p>
      <p>
        {better
          ? `на столько больше денег дала бы ${stock.companyName} вместо корзины`
          : `на столько корзина обогнала ${stock.companyName}`}
        {' · '}
        вложено {formatMoney(investment.from, currency)}
      </p>
    </aside>
  )
}

interface RankingRowProps {
  stocks: CompareStock[]
  cartGrowthPercent: number
}

export function RankingRow({ stocks, cartGrowthPercent }: RankingRowProps) {
  const ranked = [...stocks].sort((a, b) => b.growthPercent - a.growthPercent)

  return (
    <section className="ranking-section" aria-label="Рейтинг">
      <h3>Рейтинг: что обогнало корзину?</h3>
      <HorizontalScroller trackClassName="ranking-row" label="рейтинг">
        {ranked.map((stock, index) => {
          const vsCart = stock.growthPercent - cartGrowthPercent
          const logo = stockLogoUrl(stock)
          return (
            <article key={stock.id} className="rank-card">
              <div className="rank-card-top">
                <span className="rank-index">{index + 1}</span>
                {logo ? (
                  <img src={logo} alt="" width={28} height={28} loading="lazy" />
                ) : (
                  <span className="rank-card-fallback">{stock.symbol.slice(0, 2)}</span>
                )}
              </div>
              <h4>{stock.companyName}</h4>
              <p
                className={`rank-growth ${stock.growthPercent >= 0 ? 'growth' : 'growth-negative'}`}
              >
                {formatGrowth(stock.growthPercent)}
              </p>
              <p className="rank-vs">{formatGrowth(vsCart)} к корзине</p>
            </article>
          )
        })}

        <article className="rank-card rank-card--basket">
          <div className="rank-card-top">
            <span className="rank-index">—</span>
            <img src="/icons/cart.png" alt="" width={28} height={28} />
          </div>
          <h4>Корзина скуфа</h4>
          <p className={`rank-growth ${cartGrowthPercent >= 0 ? 'growth' : 'growth-negative'}`}>
            {formatGrowth(cartGrowthPercent)}
          </p>
          <p className="rank-vs">базовый уровень</p>
        </article>
      </HorizontalScroller>
    </section>
  )
}

interface EquivalentsPanelProps {
  stock: CompareStock
  products: {
    id: string
    name: string
    price: number | null
  }[]
}

export function EquivalentsPanel({ stock, products }: EquivalentsPanelProps) {
  const investment = stockInvestmentRange(stock)
  const items = products
    .filter((p) => p.price !== null && p.price > 0)
    .map((p) => ({
      id: p.id,
      name: p.name,
      count: Math.floor(investment.to / (p.price as number)),
    }))
    .filter((p) => p.count > 0)
    .slice(0, 5)

  return (
    <aside className="compare-panel" aria-label="На что хватило бы">
      <div className="compare-panel-header">
        <h3>На что хватило бы сегодня?</h3>
      </div>
      {items.length === 0 ? (
        <p className="muted">Нет данных по товарам корзины.</p>
      ) : (
        <ul className="equivalents-list">
          {items.map((item) => (
            <li key={item.id}>
              <strong>{item.count.toLocaleString('ru-RU')}</strong>
              <span>{item.name}</span>
            </li>
          ))}
        </ul>
      )}
      <p className="muted" style={{ margin: 'auto 0 0', fontSize: '0.75rem' }}>
        Если вложить стоимость корзины в {stock.companyName}
      </p>
    </aside>
  )
}

interface HeroRowProps {
  fromYear: number
  currency: 'RUB' | 'USD'
  cartFrom: number
  cartTo: number
  cartGrowthPercent: number
  stock: CompareStock
  historyPrices: { year: number; amount: number }[]
}

export function CompareHeroRow({
  fromYear,
  currency,
  cartFrom,
  cartTo,
  cartGrowthPercent,
  stock,
  historyPrices,
}: HeroRowProps) {
  const investment = stockInvestmentRange(stock)

  return (
    <div className="compare-hero-grid">
      <BasketCard
        image="/icons/cart.png"
        year={fromYear}
        startPrice={cartFrom}
        currentPrice={cartTo}
        growthPercent={cartGrowthPercent}
        currency={currency}
      />
      <StockCard
        companyName={stock.companyName}
        heading={stock.companyName}
        imageUrl={stockLogoUrl(stock)}
        fromYear={stock.priceFromYear}
        toYear={stock.priceToYear}
        startPrice={investment.from}
        currentPrice={investment.to}
        growthPercent={stock.growthPercent}
        historyPrices={historyPrices}
        currency={currency}
      />
      <AdvantageCard stock={stock} cartGrowthPercent={cartGrowthPercent} currency={currency} />
    </div>
  )
}
