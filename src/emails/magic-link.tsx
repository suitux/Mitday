import { Button, Text } from "@react-email/components";
import { EmailLayout, buttonStyle, mutedStyle, textStyle } from "./layout";

export type MagicLinkEmailProps = {
  lang: string;
  url: string;
  strings: { preview: string; heading: string; button: string; ignore: string };
};

export default function MagicLinkEmail({
  lang,
  url,
  strings,
}: MagicLinkEmailProps) {
  return (
    <EmailLayout lang={lang} preview={strings.preview}>
      <Text style={textStyle}>{strings.heading}</Text>
      <Button href={url} style={buttonStyle}>
        {strings.button}
      </Button>
      <Text style={mutedStyle}>{strings.ignore}</Text>
    </EmailLayout>
  );
}

MagicLinkEmail.PreviewProps = {
  lang: "es",
  url: "https://example.com",
  strings: {
    preview: "Tu enlace para entrar en Quadra",
    heading: "Pulsa el botón para entrar en Quadra.",
    button: "Entrar",
    ignore: "Si no lo has pedido tú, ignora este correo.",
  },
} satisfies MagicLinkEmailProps;
