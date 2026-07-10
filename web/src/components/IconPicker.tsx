import { useState } from "react";
import EmojiPicker, { EmojiStyle, Theme } from "emoji-picker-react";
import { Popover, PopoverContent, PopoverTrigger } from "./ui/popover";
import { cn } from "./ui/utils";

interface IconPickerProps {
  value: string;
  onChange: (emoji: string) => void;
  className?: string;
  ariaLabel?: string;
}

/**
 * Emoji "board" for picking a category/trip icon. Click the current icon to open a
 * searchable picker in a popover. Uses native emoji rendering (no external image fetches).
 */
export function IconPicker({ value, onChange, className, ariaLabel }: IconPickerProps) {
  const [open, setOpen] = useState(false);

  const theme =
    typeof document !== "undefined" && document.documentElement.classList.contains("dark")
      ? Theme.DARK
      : Theme.LIGHT;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          aria-label={ariaLabel || "Choose icon"}
          className={cn(
            "w-9 h-9 flex items-center justify-center text-2xl rounded-lg border border-border bg-background hover:border-primary/50 transition-colors",
            className,
          )}
        >
          {value || "🏷️"}
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0 border-none shadow-lg" align="start" sideOffset={6}>
        <EmojiPicker
          onEmojiClick={(data: { emoji: string }) => {
            onChange(data.emoji);
            setOpen(false);
          }}
          emojiStyle={EmojiStyle.NATIVE}
          theme={theme}
          lazyLoadEmojis
          width={320}
          height={400}
          previewConfig={{ showPreview: false }}
          skinTonesDisabled
        />
      </PopoverContent>
    </Popover>
  );
}
