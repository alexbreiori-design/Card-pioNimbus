'use client';

import { LayoutGroup, motion } from 'motion/react';
import RotatingText from '@/components/landing/RotatingText/RotatingText';

const layoutSpring = { type: 'spring', damping: 30, stiffness: 400 };

export default function LandingHeroTitle({
  before = 'O cardápio mais',
  after = 'para o seu restaurante.',
  words = ['bonito', 'prático', 'honesto'],
}) {
  return (
    <LayoutGroup id="landing-hero-title">
      <div className="landing-title-center">
        <motion.h1 className="landing-title landing-title--showcase" layout transition={layoutSpring}>
          <motion.span className="landing-title__row" layout transition={layoutSpring}>
            <motion.span className="landing-title__static" layout="position" transition={layoutSpring}>
              {before}
            </motion.span>{' '}
            <RotatingText
              texts={words}
              mainClassName="landing-title__rotate"
              staggerFrom="last"
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '-120%' }}
              staggerDuration={0.025}
              splitBy="characters"
              transition={layoutSpring}
              rotationInterval={2500}
            />
          </motion.span>
          <motion.span className="landing-title__row landing-title__row--after" layout transition={layoutSpring}>
            {after}
          </motion.span>
        </motion.h1>
      </div>
    </LayoutGroup>
  );
}
