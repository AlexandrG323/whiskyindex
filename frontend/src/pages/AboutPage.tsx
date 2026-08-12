import { Link } from 'react-router-dom'
import './about.css'

const SOURCES = [
  {
    title: 'MOEX ISS',
    detail: 'Исторические цены российских акций и индексов',
  },
  {
    title: 'Yahoo Finance',
    detail: 'Котировки зарубежных бумаг и S&P 500',
  },
  {
    title: 'Курсы USD/RUB',
    detail: 'Годовые курсы для сравнения в рублях',
  },
  {
    title: 'Цены продуктов',
    detail: 'Исторические розничные цены корзины скуфа',
  },
]

const SECTIONS = [
  {
    title: 'Зачем это',
    body: 'Whisky Index отвечает на простой вопрос: что было выгоднее — собрать «корзину скуфа» из привычных товаров или вложить ту же сумму в акции. Без морали и советов, только цифры.',
  },
  {
    title: 'Как считать',
    body: 'Выбираете период, смотрите стоимость корзины и рост бумаг. Можно сравнить одну акцию с корзиной, несколько бумаг на одном графике или посчитать, на что хватило бы сегодняшней стоимости вложений.',
  },
  {
    title: 'Что внутри корзины',
    body: 'Jameson, кола, кофе Jacobs, Доширак, пельмени, сосиски, колбаса, майонез, огурцы, картошка, Боржоми, уголь и Winston — набор повседневных покупок, по которому удобно мерить инфляцию «по-скуфовски».',
  },
]

export function AboutPage() {
  return (
    <div className="about-page">
      <header className="about-hero page-intro page-intro--hero">
        <p className="about-kicker">О проекте</p>
        <h2>Бутылка или портфель?</h2>
        <p className="page-intro-lead">
          Whisky Index сравнивает рост потребительской корзины с динамикой акций за выбранные годы —
          от виски и доширака до Apple и S&P 500.
        </p>
        <div className="about-actions">
          <Link to="/compare" className="about-btn about-btn--primary">
            Открыть сравнение
          </Link>
          <Link to="/" className="about-btn about-btn--ghost">
            На главную
          </Link>
        </div>
      </header>

      <section className="about-grid" aria-label="О проекте подробно">
        {SECTIONS.map((section) => (
          <article key={section.title} className="about-card">
            <h3>{section.title}</h3>
            <p>{section.body}</p>
          </article>
        ))}
      </section>

      <section className="about-sources" aria-label="Источники данных">
        <div className="about-sources-head">
          <h3>Откуда данные</h3>
          <p>Цены акций подтягиваются при запросе; продукты и курсы хранятся в базе проекта.</p>
        </div>
        <ul className="about-sources-list">
          {SOURCES.map((source) => (
            <li key={source.title}>
              <strong>{source.title}</strong>
              <span>{source.detail}</span>
            </li>
          ))}
        </ul>
      </section>

      <aside className="about-note">
        <img src="/icons/banner.webp" alt="" className="about-note-image" />
        <div>
          <h3>Сегодня можно купить бутылку Jameson.</h3>
          <p>А можно было купить Apple в 2007 — и посмотреть, что из этого вышло.</p>
          <Link to="/compare" className="about-btn about-btn--primary">
            Попробовать
          </Link>
        </div>
      </aside>
    </div>
  )
}
