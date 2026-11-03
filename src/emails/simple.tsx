import { Button, Text } from "@react-email/components";
import { EmailLayout, buttonStyle, mutedStyle, textStyle } from "./layout";

/** Generic transactional email: paragraphs + one call to action. */
export type SimpleEmailProps = {
  lang: string;
  preview: string;
  paragraphs: string[];
  highlight?: string;
  button: { label: string; href: string };
  footer?: string;
};

export default function SimpleEmail({
  lang,
  preview,
  paragraphs,
  highlight,
  button,
  footer,
}: SimpleEmailProps) {
  return (
    <EmailLayout lang={lang} preview={preview}>
      {paragraphs.map((p, i) => (
        <Text key={i} style={textStyle}>
          {p}
        </Text>
      ))}
      {highlight ? (
        <Text
          style={{
            ...textStyle,
            backgroundColor: "#f3f3f1",
            borderRadius: 8,
            fontSize: 17,
            fontWeight: 600,
            padding: "12px 16px",
          }}
        >
          {highlight}
        </Text>
      ) : null}
      <Button href={button.href} style={buttonStyle}>
        {button.label}
      </Button>
      {footer ? <Text style={mutedStyle}>{footer}</Text> : null}
    </EmailLayout>
  );
}

SimpleEmail.PreviewProps = {
  lang: "es",
  preview: "Ya hay fecha para «Cena de Navidad»",
  paragraphs: ["Se ha decidido la fecha de «Cena de Navidad»:"],
  highlight: "sábado, 19 de diciembre de 2026",
  button: { label: "Ver el plan", href: "https://example.com" },
  footer: "Adjuntamos el evento para tu calendario.",
} satisfies SimpleEmailProps;
