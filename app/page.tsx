import { Container } from '@/components/site/container'
import { Section } from '@/components/site/section'

export default function Home() {
  return (
    <main>
      <Section className="py-32">
        <Container>
          <h1>Abigail Anderson</h1>
          <p className="mt-6 max-w-2xl">
            King County Real Estate Expert. Home page is being rebuilt section by
            section against the live reference screenshots in{' '}
            <code>/screenshots/live/</code>.
          </p>
        </Container>
      </Section>
    </main>
  )
}
