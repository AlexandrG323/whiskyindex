import { HeroComparison } from '../components/comparison/HeroComparison'

interface HomePageProps {
  year: number
}

export function HomePage({ year }: HomePageProps) {
  return (
    <main>
      <HeroComparison year={year} />
    </main>
  )
}
