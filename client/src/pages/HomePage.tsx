import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Helmet } from 'react-helmet-async'
import { useAuth } from '../contexts/AuthContext'
import {
  Trophy,
  Users,
  Clock,
  Award,
  ChevronRight,
  Play,
  Calendar,
  Target,
  Quote as QuoteIcon,
} from 'lucide-react'

function getPublicSiteUrl(): string {
  const fromEnv = import.meta.env.VITE_PUBLIC_SITE_URL as string | undefined
  if (fromEnv?.trim()) {
    return fromEnv.replace(/\/$/, '')
  }
  if (typeof window !== 'undefined') {
    return window.location.origin
  }
  return 'http://localhost:5173'
}

const HomePage: React.FC = () => {
  const { isAuthenticated } = useAuth()
  const siteUrl = useMemo(() => getPublicSiteUrl(), [])

  const [quoteState, setQuoteState] = useState<{
    status: 'idle' | 'loading' | 'ok' | 'error'
    text?: string
    author?: string
  }>({ status: 'idle' })

  useEffect(() => {
    let cancelled = false
    setQuoteState((s) => (s.status === 'idle' ? { status: 'loading' } : s))

    fetch('/api/integrations/quote')
      .then(async (r) => {
        if (!r.ok) throw new Error('quote failed')
        return r.json() as Promise<{
          success?: boolean
          quote?: { text: string; author: string }
        }>
      })
      .then((data) => {
        if (cancelled || !data.quote) return
        setQuoteState({
          status: 'ok',
          text: data.quote.text,
          author: data.quote.author,
        })
      })
      .catch(() => {
        if (!cancelled) setQuoteState({ status: 'error' })
      })

    return () => {
      cancelled = true
    }
  }, [])

  const jsonLd = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'WebSite',
        name: 'Tournament Manager',
        url: siteUrl,
        inLanguage: 'ru-RU',
        description:
          'Система управления турнирами с онлайн табло, сетками и обновлениями в реальном времени.',
      },
      {
        '@type': 'SoftwareApplication',
        name: 'Tournament Manager',
        applicationCategory: 'SportsApplication',
        operatingSystem: 'Web',
        offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD' },
        url: siteUrl,
      },
    ],
  }

  const features = [
    {
      icon: Trophy,
      title: 'Управление турнирами',
      description:
        'Создавайте и управляйте турнирами любой сложности с различными форматами',
    },
    {
      icon: Users,
      title: 'Командная работа',
      description: 'Организуйте команды, назначайте роли и контролируйте участие',
    },
    {
      icon: Clock,
      title: 'Live обновления',
      description: 'Получайте обновления в реальном времени через WebSocket',
    },
    {
      icon: Award,
      title: 'Статистика',
      description: 'Отслеживайте результаты и анализируйте статистику турниров',
    },
  ]

  const tournamentTypes = [
    {
      icon: Target,
      title: 'Single Elimination',
      description: 'Классический формат на выбывание',
    },
    {
      icon: Play,
      title: 'Double Elimination',
      description: 'Формат с возможностью возврата через сетку проигравших',
    },
    {
      icon: Calendar,
      title: 'Round Robin',
      description: 'Круговая система, где каждая команда играет с каждой',
    },
    {
      icon: Trophy,
      title: 'Swiss System',
      description: 'Система с автоматическим подбором соперников',
    },
  ]

  const pageTitle =
    'Tournament Manager — турниры, сетки и live-табло для спорта и киберспорта'
  const pageDescription =
    'Платформа для организации турниров: регистрация команд, сетки на выбывание, round robin, Swiss, онлайн-табло и WebSocket-обновления. Подходит для спортивных и киберспортивных событий.'

  return (
    <>
      <Helmet>
        <title>{pageTitle}</title>
        <meta name="description" content={pageDescription} />
        <meta
          name="keywords"
          content="турнир, сетка, bracket, киберспорт, спорт, табло, live score, управление турниром"
        />
        <link rel="canonical" href={`${siteUrl}/`} />

        <meta property="og:type" content="website" />
        <meta property="og:locale" content="ru_RU" />
        <meta property="og:url" content={`${siteUrl}/`} />
        <meta property="og:title" content={pageTitle} />
        <meta property="og:description" content={pageDescription} />
        <meta property="og:site_name" content="Tournament Manager" />

        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content={pageTitle} />
        <meta name="twitter:description" content={pageDescription} />

        <script type="application/ld+json">{JSON.stringify(jsonLd)}</script>
      </Helmet>

      <div className="min-h-screen bg-white">
        <main id="main-content">
          <header className="relative bg-gradient-to-br from-primary-600 to-primary-800">
            <div className="absolute inset-0 bg-black opacity-20" aria-hidden />
            <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24">
              <div className="text-center">
                <h1 className="text-4xl md:text-6xl font-bold text-white mb-6">
                  Tournament Manager
                </h1>
                <p className="text-xl md:text-2xl text-primary-100 mb-8 max-w-3xl mx-auto">
                  Профессиональная система управления турнирами с онлайн табло, жеребьевкой и
                  live обновлениями
                </p>

                {isAuthenticated ? (
                  <Link
                    to="/dashboard"
                    className="inline-flex items-center px-8 py-4 border border-transparent text-lg font-medium rounded-lg text-primary-600 bg-white hover:bg-gray-50 transition-colors"
                  >
                    Перейти в панель управления
                    <ChevronRight className="ml-2 h-5 w-5" aria-hidden />
                  </Link>
                ) : (
                  <div className="space-x-4">
                    <Link
                      to="/register"
                      className="inline-flex items-center px-8 py-4 border border-transparent text-lg font-medium rounded-lg text-primary-600 bg-white hover:bg-gray-50 transition-colors"
                    >
                      Начать бесплатно
                      <ChevronRight className="ml-2 h-5 w-5" aria-hidden />
                    </Link>
                    <Link
                      to="/login"
                      className="inline-flex items-center px-8 py-4 border-2 border-white text-lg font-medium rounded-lg text-white hover:bg-white hover:text-primary-600 transition-colors"
                    >
                      Войти
                    </Link>
                  </div>
                )}
              </div>
            </div>
          </header>

          <section
            className="py-16 bg-primary-50 border-y border-primary-100"
            aria-labelledby="quote-heading"
          >
            <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
              <h2 id="quote-heading" className="sr-only">
                Цитата дня через внешний API
              </h2>
              <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-primary-100 mb-4">
                <QuoteIcon className="h-6 w-6 text-primary-600" aria-hidden />
              </div>
              {quoteState.status === 'loading' || quoteState.status === 'idle' ? (
                <p className="text-gray-600" role="status">
                  Загружаем цитату (внешнее API)…
                </p>
              ) : quoteState.status === 'error' ? (
                <p className="text-gray-600" role="status">
                  Не удалось загрузить цитату. Проверьте, что сервер запущен и доступен интернет.
                </p>
              ) : (
                <blockquote className="text-lg text-gray-800 italic">
                  <p>&ldquo;{quoteState.text}&rdquo;</p>
                  <footer className="mt-3 text-sm not-italic text-gray-600">
                    — {quoteState.author}
                  </footer>
                </blockquote>
              )}
              <p className="mt-4 text-xs text-gray-500">
                Источник цитаты подставляет сервер (сначала{' '}
                <a
                  href="https://github.com/lukePeavey/quotable"
                  className="underline hover:text-primary-600"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Quotable
                </a>
                , при сбое — DummyJSON). Прокси:{' '}
                <code className="text-xs bg-gray-100 px-1 rounded">/api/integrations/quote</code>
              </p>
            </div>
          </section>

          <section
            id="features"
            className="py-24 bg-gray-50"
            aria-labelledby="features-section-heading"
          >
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              <div className="text-center mb-16">
                <h2
                  id="features-section-heading"
                  className="text-3xl md:text-4xl font-bold text-gray-900 mb-4"
                >
                  Возможности платформы
                </h2>
                <p className="text-xl text-gray-600 max-w-2xl mx-auto">
                  Все необходимые инструменты для организации и проведения турниров
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
                {features.map((feature, index) => {
                  const Icon = feature.icon
                  return (
                    <article key={index} className="text-center">
                      <div className="inline-flex items-center justify-center w-16 h-16 bg-primary-100 rounded-lg mb-4">
                        <Icon className="h-8 w-8 text-primary-600" aria-hidden />
                      </div>
                      <h3 className="text-lg font-semibold text-gray-900 mb-2">{feature.title}</h3>
                      <p className="text-gray-600">{feature.description}</p>
                    </article>
                  )
                })}
              </div>
            </div>
          </section>

          <section
            id="formats"
            className="py-24 bg-white"
            aria-labelledby="formats-heading"
          >
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              <div className="text-center mb-16">
                <h2
                  id="formats-heading"
                  className="text-3xl md:text-4xl font-bold text-gray-900 mb-4"
                >
                  Поддерживаемые форматы
                </h2>
                <p className="text-xl text-gray-600 max-w-2xl mx-auto">
                  Выберите подходящий формат для вашего турнира
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
                {tournamentTypes.map((type, index) => {
                  const Icon = type.icon
                  return (
                    <article
                      key={index}
                      className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm hover:shadow-md transition-shadow"
                    >
                      <div className="inline-flex items-center justify-center w-12 h-12 bg-primary-100 rounded-lg mb-4">
                        <Icon className="h-6 w-6 text-primary-600" aria-hidden />
                      </div>
                      <h3 className="text-lg font-semibold text-gray-900 mb-2">{type.title}</h3>
                      <p className="text-gray-600">{type.description}</p>
                    </article>
                  )
                })}
              </div>
            </div>
          </section>

          <section className="py-24 bg-primary-600" aria-labelledby="cta-heading">
            <div className="max-w-4xl mx-auto text-center px-4 sm:px-6 lg:px-8">
              <h2 id="cta-heading" className="text-3xl md:text-4xl font-bold text-white mb-4">
                Готовы начать?
              </h2>
              <p className="text-xl text-primary-100 mb-8">
                Создайте свой первый турнир уже сегодня
              </p>

              {!isAuthenticated && (
                <Link
                  to="/register"
                  className="inline-flex items-center px-8 py-4 border border-transparent text-lg font-medium rounded-lg text-primary-600 bg-white hover:bg-gray-50 transition-colors"
                >
                  Зарегистрироваться бесплатно
                  <ChevronRight className="ml-2 h-5 w-5" aria-hidden />
                </Link>
              )}
            </div>
          </section>
        </main>

        <footer className="bg-gray-900 text-white py-12">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center">
              <div className="flex items-center justify-center space-x-2 mb-4">
                <Trophy className="h-8 w-8 text-primary-500" aria-hidden />
                <span className="text-xl font-bold">Tournament Manager</span>
              </div>
              <p className="text-gray-400">© 2024 Tournament Manager. Все права защищены.</p>
              <nav className="mt-4 text-sm text-gray-500" aria-label="Документы для поисковых систем">
                <Link to="/" className="hover:text-gray-300 mr-4">
                  Главная
                </Link>
                <a href="/robots.txt" className="hover:text-gray-300 mr-4">
                  robots.txt
                </a>
                <a href="/sitemap.xml" className="hover:text-gray-300">
                  sitemap.xml
                </a>
              </nav>
            </div>
          </div>
        </footer>
      </div>
    </>
  )
}

export default HomePage
