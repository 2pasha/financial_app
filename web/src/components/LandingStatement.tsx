import { useRef } from "react";
import { motion, useReducedMotion, useScroll, useTransform, type MotionValue } from "framer-motion";

/**
 * The statement: one large paragraph that lights up word by word as it scrolls
 * through the viewport, and dims again on the way back up.
 *
 * The reveal is *scrubbed*, not played. Opacity is bound to scroll position rather
 * than to a timer, so the reader sets the pace — the paragraph is a thing you read
 * at your own speed while the type keeps up, not an animation that runs at you.
 * That reversibility is the whole character of the effect and is why this is not
 * built on the page's `Reveal`, which fires once on intersection and is done.
 */
const STATEMENT =
  "Your bank tells you what you spent. That is history. Moneta tells you what is safe to spend — before you spend it, before the month runs out, before the number surprises you.";

/**
 * What an unread word is dimmed to. Low enough that the read/unread boundary is
 * unmistakable, high enough that the whole sentence is still legible at a glance —
 * a reader who lands mid-section should be able to read the end without scrolling
 * for it. Holds up on both the white and the near-black page.
 */
const DIM = 0.2;

/**
 * How many words the leading edge is smeared across. At 1 each word would snap on
 * alone, which reads as a counter ticking; at 2.5 there are always two or three
 * words mid-transition and it reads as a wave passing through the sentence.
 */
const EDGE_WORDS = 2.5;

/**
 * The share of the scroll range the reveal is packed into. Leaving the last 15%
 * empty means the sentence finishes lighting up slightly *before* the scroll range
 * ends, so it resolves while it is still comfortably in view rather than landing
 * its final word exactly as it leaves.
 */
const REVEAL_SPAN = 0.85;

/**
 * Matched to the reference: fluid from 26px to 52px, tight leading, medium weight.
 * `max-w-4xl` is what keeps it to the four or five lines the rhythm depends on —
 * run it the full width of the column and it collapses into three long ones.
 */
const TYPE =
  "max-w-4xl text-[clamp(26px,4.2vw,52px)] leading-[1.18] font-medium tracking-tight text-foreground";

/**
 * One word. This is a component rather than inline markup because `useTransform` is
 * a hook and each word needs its own — mapping over the words inside the parent
 * would mean calling hooks in a loop.
 */
function Word({
  progress,
  start,
  end,
  children,
}: {
  progress: MotionValue<number>;
  start: number;
  end: number;
  children: string;
}) {
  const opacity = useTransform(progress, [start, end], [DIM, 1]);

  return (
    <motion.span className="inline" style={{ opacity }}>
      {children}{" "}
    </motion.span>
  );
}

export function LandingStatement() {
  const ref = useRef<HTMLParagraphElement>(null);
  const reduceMotion = useReducedMotion();

  /**
   * Progress runs 0 → 1 between the paragraph's top reaching 90% down the viewport
   * and its bottom reaching 45%. Deliberately not the full `start end` → `end start`
   * span: that one begins scrubbing while the paragraph is still off-screen, so the
   * first few words are already lit by the time anyone can read them.
   *
   * The two numbers set the pace, and are the thing to tune if it feels wrong. The
   * wave gets `0.45 × viewport + paragraph height` of scrolling to cross the whole
   * sentence — roughly 660px on a laptop. Narrowing the range makes it rip; widening
   * it makes the reader scroll a long way for the last word.
   */
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start 0.9", "end 0.45"],
  });

  const words = STATEMENT.split(" ");
  const step = 1 / words.length;

  return (
    <section
      aria-label="What Moneta tells you"
      className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-28 sm:py-40"
    >
      <p ref={ref} className={TYPE}>
        {reduceMotion
          ? STATEMENT
          : words.map((word, i) => {
              const start = i * step * REVEAL_SPAN;

              return (
                <Word
                  key={`${i}-${word}`}
                  progress={scrollYProgress}
                  start={start}
                  end={Math.min(1, start + step * EDGE_WORDS * REVEAL_SPAN)}
                >
                  {word}
                </Word>
              );
            })}
      </p>
    </section>
  );
}
