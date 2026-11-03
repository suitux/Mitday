import type { ReactNode } from "react";
import {
  Body,
  Container,
  Head,
  Html,
  Preview,
  Section,
  Text,
} from "@react-email/components";

export function EmailLayout({
  lang,
  preview,
  children,
}: {
  lang: string;
  preview: string;
  children: ReactNode;
}) {
  return (
    <Html lang={lang}>
      <Head />
      <Preview>{preview}</Preview>
      <Body
        style={{
          backgroundColor: "#f6f6f4",
          fontFamily:
            "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
          margin: 0,
          padding: "24px 0",
        }}
      >
        <Container
          style={{
            backgroundColor: "#ffffff",
            borderRadius: 12,
            maxWidth: 480,
            padding: "32px 28px",
          }}
        >
          <Text
            style={{
              fontSize: 20,
              fontWeight: 700,
              letterSpacing: "-0.02em",
              margin: "0 0 16px",
            }}
          >
            Quadra
          </Text>
          <Section>{children}</Section>
        </Container>
      </Body>
    </Html>
  );
}

export const buttonStyle = {
  backgroundColor: "#171717",
  borderRadius: 8,
  color: "#ffffff",
  display: "inline-block",
  fontSize: 15,
  fontWeight: 600,
  padding: "12px 20px",
  textDecoration: "none",
} as const;

export const textStyle = {
  color: "#333333",
  fontSize: 15,
  lineHeight: "22px",
} as const;

export const mutedStyle = {
  color: "#777777",
  fontSize: 13,
  lineHeight: "20px",
} as const;
