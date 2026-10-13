import type { LucideIcon } from 'lucide-react'
import { Activity, Download, Tag, Users } from 'lucide-react'

import { Card } from '@/components/ui/card'

import { homeContainer, whyChooseUs } from '../content'

const featureIcons: LucideIcon[] = [Users, Activity, Download, Tag]

export function FeaturesSection() {
  const left = whyChooseUs.slice(0, 2)
  const right = whyChooseUs.slice(2)

  return (
    <section id="features" className="bg-card py-20">
      <div className={homeContainer}>
        <header className="mb-16 text-center">
          <h2 className="mb-4 text-4xl font-semibold tracking-tight max-md:text-3xl">
            Why Choose Us
          </h2>
          <p className="text-lg text-muted-foreground">
            Everything you need for successful learning in one platform
          </p>
        </header>

        <div className="grid items-start gap-12 lg:grid-cols-3">
          <div className="order-2 grid gap-6 max-lg:grid-cols-2 max-md:grid-cols-1 lg:order-none">
            {left.map((feature, index) => (
              <FeatureCard
                key={feature.title}
                feature={feature}
                icon={featureIcons[index] ?? Users}
              />
            ))}
          </div>

          <figure className="relative order-1 min-h-[400px] overflow-hidden rounded-lg shadow-[0_20px_40px_rgba(0,0,0,0.08)] lg:order-none">
            <img
              src="/marketing/about.jpg"
              alt="Students working together"
              className="absolute inset-0 size-full object-cover transition duration-300 hover:scale-105"
            />
            <figcaption className="absolute inset-0 flex flex-col items-center justify-center bg-gradient-to-br from-primary/80 via-primary-light/70 to-accent/80 p-8 text-center text-white">
              <p className="mb-4 text-4xl font-bold">Why Choose Us</p>
              <p className="max-w-md text-lg leading-relaxed text-white/95">
                Experience the difference with our comprehensive academic support, expert guidance,
                and personalized learning approach that has helped thousands of students achieve
                their educational goals.
              </p>
            </figcaption>
          </figure>

          <div className="order-3 grid gap-6 max-lg:grid-cols-2 max-md:grid-cols-1 lg:order-none">
            {right.map((feature, index) => (
              <FeatureCard
                key={feature.title}
                feature={feature}
                icon={featureIcons[index + 2] ?? Download}
              />
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}

function FeatureCard({
  feature,
  icon: Icon,
}: {
  feature: (typeof whyChooseUs)[number]
  icon: LucideIcon
}) {
  return (
    <Card className="flex flex-col bg-background p-8 transition hover:-translate-y-1 hover:border-primary-light hover:shadow-md">
      <h3 className="mb-3 flex items-center gap-3 text-xl font-semibold">
        <span className="inline-flex size-10 shrink-0 items-center justify-center rounded-md bg-gradient-to-br from-primary-light to-primary text-white">
          <Icon className="size-5" aria-hidden />
        </span>
        {feature.title}
      </h3>
      <p className="leading-relaxed text-muted-foreground">{feature.description}</p>
    </Card>
  )
}
