"use client";

import { Share2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { useSyncExternalStore } from "react";
import { CopyField } from "@/components/participate/board";
import { Button } from "@/components/ui/button";

const noop = () => () => {};

export function SharePanel({ url, title }: { url: string; title: string }) {
  const t = useTranslations("created");
  const canShare = useSyncExternalStore(
    noop,
    () => typeof navigator.share === "function",
    () => false,
  );
  return (
    <div className="grid gap-3">
      <CopyField value={url} />
      {canShare ? (
        <Button
          type="button"
          className="h-11 pointer-fine:h-11"
          onClick={() =>
            navigator
              .share({ title, text: t("shareText", { title }), url })
              .catch(() => {})
          }
        >
          <Share2 /> {t("share")}
        </Button>
      ) : null}
    </div>
  );
}
