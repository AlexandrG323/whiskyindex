import { useState } from 'react'
import { BasketCard } from '../comparison/BasketCard'
import {
  formatMoney,
  formatWhiskyIndex,
  pickTopGrowthStock,
  stockInvestmentRange,
} from '../comparison/comparisonUtils'
import type { CompareStock } from '../comparison/HeroComparison'
import { StockCard } from '../comparison/StockCard'
import { StockLogo } from '../comparison/StockLogo'
import { Select } from '../ui/Select'
import { HorizontalScroller } from './HorizontalScroller'

export { pickTopGrowthStock }

const CART_REVEAL_ID = 'cart'

function formatGrowth(value: number) {
  const rounded = Math.round(value)
  const sign = rounded >= 0 ? '+' : ''
  return `${sign}${rounded.toLocaleString('ru-RU')}%`
}

function formatSignedMoney(amount: number, currency: 'RUB' | 'USD') {
  const formatted = formatMoney(Math.abs(amount), currency)
  if (amount > 0) return `+${formatted}`
  if (amount < 0) return `−${formatted}`
  return formatted
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
  currency: 'RUB' | 'USD'
  cartFrom: number
  cartTo: number
}

export function RankingRow({
  stocks,
  cartGrowthPercent,
  currency,
  cartFrom,
  cartTo,
}: RankingRowProps) {
  const ranked = [...stocks].sort((a, b) => b.growthPercent - a.growthPercent)
  const [hoveredId, setHoveredId] = useState<string | null>(null)
  const [pinnedId, setPinnedId] = useState<string | null>(null)
  const revealedId = pinnedId ?? hoveredId

  const revealHandlers = (id: string) => ({
    onPointerEnter: () => setHoveredId(id),
    onPointerLeave: () => setHoveredId((current) => (current === id ? null : current)),
    onClick: () => setPinnedId((current) => (current === id ? null : id)),
  })

  return (
    <section className="ranking-section" aria-label="Рейтинг">
      <h3>Рейтинг: что обогнало корзину?</h3>
      <HorizontalScroller trackClassName="ranking-row" label="рейтинг">
        {ranked.map((stock, index) => {
          const vsCart = stock.growthPercent - cartGrowthPercent
          const revealed = revealedId === stock.id
          const whiskyLabel = revealed ? formatWhiskyIndex(stock.whiskyShare) : null
          let whiskyTone = ''
          if (whiskyLabel && stock.whiskyShare < 0) whiskyTone = ' growth-negative'
          else if (whiskyLabel && stock.whiskyShare > 0) whiskyTone = ' growth'
          return (
            <button
              type="button"
              key={stock.id}
              className="rank-card"
              {...revealHandlers(stock.id)}
            >
              <span className="rank-card-top">
                <span className="rank-index">{index + 1}</span>
                <StockLogo symbol={stock.symbol} src={stock.imageUrl} size={28} />
              </span>
              <span className="rank-card-title">{stock.companyName}</span>
              {revealed ? (
                <span className="rank-prices">
                  {formatMoney(stock.priceFrom, currency)}
                  <span aria-hidden="true"> → </span>
                  {formatMoney(stock.priceTo, currency)}
                </span>
              ) : (
                <span
                  className={`rank-growth ${
                    stock.growthPercent >= 0 ? 'growth' : 'growth-negative'
                  }`}
                >
                  {formatGrowth(stock.growthPercent)}
                </span>
              )}
              <span className={`rank-vs${whiskyTone}`}>
                {whiskyLabel ?? `${formatGrowth(vsCart)} к корзине`}
              </span>
            </button>
          )
        })}

        <button
          type="button"
          className="rank-card rank-card--basket"
          {...revealHandlers(CART_REVEAL_ID)}
        >
          <span className="rank-card-top">
            <span className="rank-index">—</span>
            <img src="/icons/cart.png" alt="" width={28} height={28} />
          </span>
          <span className="rank-card-title">Корзина скуфа</span>
          {revealedId === CART_REVEAL_ID ? (
            <span className="rank-prices">
              {formatMoney(cartFrom, currency)}
              <span aria-hidden="true"> → </span>
              {formatMoney(cartTo, currency)}
            </span>
          ) : (
            <span
              className={`rank-growth ${cartGrowthPercent >= 0 ? 'growth' : 'growth-negative'}`}
            >
              {formatGrowth(cartGrowthPercent)}
            </span>
          )}
          <span className="rank-vs">базовый уровень</span>
        </button>
      </HorizontalScroller>
    </section>
  )
}

interface EquivalentsPanelProps {
  stocks: CompareStock[]
  selectedId: string | null
  onSelect: (id: string) => void
  products: {
    id: string
    name: string
    price: number | null
  }[]
  cartPrice: number
  currency: 'RUB' | 'USD'
}

/**
 * Activated charcoal is a gag item in the basket — as an "what could you buy"
 * equivalent it says nothing and crowds out things worth picturing.
 */
const EQUIVALENT_EXCLUDED = /уголь/i
const EQUIVALENT_WHISKY = /виски/i

/** The column is as tall as the chart beside it, so it fits far more than 5. */
const EQUIVALENT_LIMIT = 12

type EquivalentItem = {
  id: string
  name: string
  count: number
}

export function EquivalentsPanel({
  stocks,
  selectedId,
  onSelect,
  products,
  cartPrice,
  currency,
}: EquivalentsPanelProps) {
  const stock = stocks.find((item) => item.id === selectedId) ?? stocks[0]
  if (!stock) {
    return (
      <aside className="compare-panel">
        <div className="compare-panel-header">
          <h3>На что хватило бы сегодня?</h3>
        </div>
        <p className="muted">Выберите акцию, чтобы посчитать эквиваленты.</p>
      </aside>
    )
  }

  const investment = stockInvestmentRange(stock)
  const profit = investment.to - investment.from
  const absProfit = Math.abs(profit)
  const lost = profit < 0

  const affordable = products
    .filter((p) => p.price !== null && p.price > 0 && !EQUIVALENT_EXCLUDED.test(p.name))
    .map((p) => ({
      id: p.id,
      name: p.name,
      count: Math.floor(absProfit / (p.price as number)),
    }))
    .filter((p) => p.count > 0)

  const whiskyCount = Math.floor(Math.abs(stock.whiskyShare))
  const whiskyItems = affordable
    .filter((p) => EQUIVALENT_WHISKY.test(p.name))
    .map((p) => ({ ...p, count: whiskyCount }))
    .filter((p) => p.count > 0)
  const otherItems = affordable.filter((p) => !EQUIVALENT_WHISKY.test(p.name))
  const productItems: EquivalentItem[] = [...whiskyItems, ...otherItems].slice(0, EQUIVALENT_LIMIT)

  const items: EquivalentItem[] = []
  if (cartPrice > 0) {
    const cartCount = Math.floor(absProfit / cartPrice)
    if (cartCount > 0) {
      items.push({
        id: 'cart',
        name: 'Корзина скуфа',
        count: cartCount,
      })
    }
  }
  items.push(...productItems)

  const title = lost ? 'Что сгорело за период?' : 'На что хватило бы сегодня?'
  const lead = lost
    ? `${formatSignedMoney(profit, currency)} убытка — это:`
    : `${formatSignedMoney(profit, currency)} прибыли — на них можно купить:`
  const empty =
    profit === 0 || items.length === 0
      ? `Ни туда, ни сюда: ${stock.companyName} осталась при своих`
      : null

  return (
    <aside className="compare-panel" aria-label={title}>
      <div className="compare-panel-header">
        <h3>{title}</h3>
        {stocks.length > 0 && (
          <Select
            className="equivalents-select"
            align="end"
            ariaLabel="Акция для эквивалентов"
            value={stock.id}
            options={stocks.map((item) => ({ value: item.id, label: item.companyName }))}
            onChange={onSelect}
          />
        )}
      </div>
      {empty ? (
        <p className="muted">{empty}</p>
      ) : (
        <>
          <p className={`equivalents-lead ${lost ? 'growth-negative' : 'growth'}`}>{lead}</p>
          <ul className="equivalents-list">
            {items.map((item) => (
              <li key={item.id} className={item.id === 'cart' ? 'is-cart' : undefined}>
                <strong>{item.count.toLocaleString('ru-RU')}</strong>
                <span>{item.name}</span>
              </li>
            ))}
          </ul>
        </>
      )}
      <p className="muted equivalents-footnote">
        Если бы вложили стоимость корзины в {stock.companyName} в {stock.priceFromYear}
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
        symbol={stock.symbol}
        imageUrl={stock.imageUrl}
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
