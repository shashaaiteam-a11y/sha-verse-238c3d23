/// <reference types="npm:@types/react@18.3.1" />

import * as React from 'npm:react@18.3.1'

import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Html,
  Img,
  Link,
  Preview,
  Section,
  Text,
} from 'npm:@react-email/components@0.0.22'

interface SignupEmailProps {
  siteName: string
  siteUrl: string
  recipient: string
  confirmationUrl: string
}

const LOGO_URL = 'https://plmhjuqedtkiffzhberf.supabase.co/storage/v1/object/public/email-assets/sha-verse-logo.jpeg'

export const SignupEmail = ({
  siteName,
  siteUrl,
  recipient,
  confirmationUrl,
}: SignupEmailProps) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>Confirm your email for {siteName}</Preview>
    <Body style={main}>
      <Container style={container}>
        <Section style={logoSection}>
          <Img src={LOGO_URL} width="56" height="56" alt={siteName} style={logo} />
        </Section>
        <Heading style={h1}>Confirm your email</Heading>
        <Text style={text}>
          Thanks for signing up for{' '}
          <Link href={siteUrl} style={link}>
            <strong>{siteName}</strong>
          </Link>
          !
        </Text>
        <Text style={text}>
          Please confirm your email address (
          <Link href={`mailto:${recipient}`} style={link}>
            {recipient}
          </Link>
          ) by clicking the button below:
        </Text>
        <Section style={{ textAlign: 'center' as const, margin: '30px 0' }}>
          <Button style={button} href={confirmationUrl}>
            Verify Email
          </Button>
        </Section>
        <Text style={footer}>
          If you didn't create an account, you can safely ignore this email.
        </Text>
      </Container>
    </Body>
  </Html>
)

export default SignupEmail

const main = { backgroundColor: '#ffffff', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif' }
const container = { padding: '32px 28px', maxWidth: '560px' }
const logoSection = { textAlign: 'center' as const, margin: '0 0 24px' }
const logo = { borderRadius: '12px', display: 'inline-block' }
const h1 = {
  fontSize: '24px',
  fontWeight: 'bold' as const,
  color: 'hsl(240, 10%, 10%)',
  margin: '0 0 20px',
  textAlign: 'center' as const,
}
const text = {
  fontSize: '15px',
  color: 'hsl(240, 4%, 46%)',
  lineHeight: '1.6',
  margin: '0 0 16px',
}
const link = { color: 'hsl(221, 83%, 53%)', textDecoration: 'underline' }
const button = {
  backgroundColor: 'hsl(221, 83%, 53%)',
  color: '#ffffff',
  fontSize: '15px',
  fontWeight: 'bold' as const,
  borderRadius: '12px',
  padding: '14px 28px',
  textDecoration: 'none',
  display: 'inline-block',
}
const footer = { fontSize: '12px', color: 'hsl(240, 4%, 60%)', margin: '30px 0 0', textAlign: 'center' as const }
