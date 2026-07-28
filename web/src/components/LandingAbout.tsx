import { motion, useReducedMotion } from "framer-motion";

/**
 * The About section: a photograph under an organic mask, then the one paragraph on
 * the page that speaks in the first person, then the last call to action.
 *
 * The mask is the reference's shape — corner radii given as percentages rather than
 * pixels, with the vertical radius at half the box so the short edges round out
 * completely. Percentages mean the shape stays proportional as the image reflows
 * instead of turning into a pill on desktop and a lozenge on a phone.
 *
 * Photo: Kyiv at dusk, Unsplash licence (free for commercial use, attribution not
 * required). Committed at web/public/kyiv-dusk.jpg. Chosen over the daylight Maidan
 * shots because it carries no faces and no legible brand signage, which keeps it out
 * of both likeness and trademark territory.
 */

const MASK = "26% 26% 26% 26% / 45% 45% 45% 45%";

export function LandingAbout() {
  const reduceMotion = useReducedMotion();

  return (
    <section
      id="about"
      aria-label="Why Moneta exists"
      className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-20 sm:py-28"
    >
      <motion.div
        className="overflow-hidden"
        style={{ borderRadius: MASK }}
        initial={reduceMotion ? false : { opacity: 0, scale: 1.06 }}
        whileInView={{ opacity: 1, scale: 1 }}
        viewport={{ once: true, amount: 0.25 }}
        transition={{ duration: 1, ease: [0.22, 1, 0.36, 1] }}
      >
        <img
          src="/kyiv-dusk.jpg"
          alt="Kyiv at dusk, traffic moving along a boulevard"
          className="w-full h-[clamp(260px,42vw,520px)] object-cover"
          loading="lazy"
          decoding="async"
          width={1800}
          height={1200}
        />
      </motion.div>

      <div className="mx-auto sm:mt-16 max-w-3xl">
        <h2 className="text-3xl sm:text-4xl lg:text-5xl font-medium tracking-tight leading-[1.12] text-foreground text-center">
          Built because we kept finding out too late.
        </h2>
      </div>
    </section>
  );
}
