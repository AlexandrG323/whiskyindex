interface HomePageProps {
  year: number
}

export function HomePage({ year }: HomePageProps) {
  return (
    <div>
      <h2>Главная страница</h2>
      <p className="muted">
        Добро пожаловать в Whisky Index ({year} год)! Выберите нужный раздел в меню слева.
      </p>
    </div>
  )
}
