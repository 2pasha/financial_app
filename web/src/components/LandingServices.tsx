import { motion, useReducedMotion } from "framer-motion";
import { cn } from "./ui/utils";

/**
 * Four full-bleed rows, one phrase each, that invert on hover.
 *
 * The invert is a wipe, not a slide, and the distinction is the whole trick. Two
 * layers hold the same phrase in opposite colours, stacked in perfect register. The
 * inverted layer sits inside a clipping panel parked one row-height below; on hover
 * the panel travels up to 0 while its contents travel down by exactly the same
 * amount. The sum is zero, so the inverted text never moves — only the window onto
 * it does. Slide the text with the panel instead and it reads as a cheap carousel;
 * hold it still and the row appears to invert in place.
 *
 * These are deliberately not links. The source has an arrow on each row, which is
 * right when the row navigates somewhere; here it would promise a destination that
 * does not exist, so it is dropped and the rows are plain divs.
 */

const PHRASES = ["Bank Sync", "Safe to Spend", "Monthly Planning", "Trips & Goals"];

/** Shared by both layers. They must match exactly or the register breaks. */
const LABEL = "text-[clamp(1.5rem,4vw,4rem)] font-light tracking-tight leading-[1.5]";

/** Row padding, also shared by both layers for the same reason. */
const ROW_PAD = "px-6 py-8 sm:px-12 md:py-10 lg:px-24";

const WIPE = "transition-transform duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] motion-reduce:transition-none";

/**
 * Per-letter roll, layered on top of the wipe. Each letter sits in its own
 * `overflow-hidden` box and starts pushed a full line-height down, so it rolls up
 * into view as the panel passes. `align-bottom` because an inline-block with hidden
 * overflow is baseline-aligned by its bottom margin edge, which otherwise nudges
 * every letter off the shared baseline and destroys the register with the layer
 * underneath.
 */
function RollingLetters({ text }: { text: string }) {
  return (
    <>
      {text.split("").map((char, i) => (
        <span key={`${i}-${char}`} className="inline-block overflow-hidden align-bottom">
          <span
            className={cn("inline-block translate-y-full group-hover:translate-y-0", WIPE)}
            style={{ transitionDelay: `${i * 18}ms` }}
          >
            {char === " " ? " " : char}
          </span>
        </span>
      ))}
    </>
  );
}

export function LandingServices() {
  const reduceMotion = useReducedMotion();

  return (
    <section id="services" aria-label="What Moneta does" className="w-full pb-24">
      {PHRASES.map((phrase, i) => (
        <motion.div
          key={phrase}
          className="group relative overflow-hidden border-t border-foreground/10"
          initial={reduceMotion ? false : { opacity: 0, x: -60 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true, amount: 0.4 }}
          transition={{
            duration: 0.7,
            delay: i * 0.08,
            ease: [0.22, 1, 0.36, 1],
          }}
        >
          {/* Base layer — page colours. */}
          <div className={cn("flex items-center", ROW_PAD)}>
            <span className={cn(LABEL, "text-foreground")}>{phrase}</span>
          </div>

          {/*
           * Inverted layer. The panel is parked a full row below (`translate-y-full`)
           * and its contents a full row above (`-translate-y-full`); both resolve to 0
           * on hover. Net displacement of the text is zero throughout — see the note
           * at the top of the file.
           */}
          <div
            aria-hidden="true"
            className={cn(
              "pointer-events-none absolute inset-0 overflow-hidden bg-foreground",
              "translate-y-full group-hover:translate-y-0",
              WIPE,
            )}
          >
            <div
              className={cn(
                "flex h-full items-center",
                ROW_PAD,
                "-translate-y-full group-hover:translate-y-0",
                WIPE,
              )}
            >
              <span className={cn(LABEL, "text-background")}>
                {reduceMotion ? phrase : <RollingLetters text={phrase} />}
              </span>
            </div>
          </div>
        </motion.div>
      ))}

      {/* Closes the last row. Without it the stack has a rule above every phrase and
          none beneath the final one, and reads as unfinished. */}
      <div aria-hidden="true" className="border-t border-foreground/10" />
    </section>
  );
}
