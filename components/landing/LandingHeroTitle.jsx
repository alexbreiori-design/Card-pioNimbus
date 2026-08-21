'use client';

/**
 * Título do hero sem motion/react no caminho crítico (CSS cycle).
 */
export default function LandingHeroTitle({
  before = 'O cardápio mais',
  after = 'para o seu restaurante.',
  words = ['bonito', 'prático', 'honesto'],
}) {
  const list = Array.isArray(words) && words.length ? words : ['bonito'];

  return (
    <div className="landing-title-center">
      <h1 className="landing-title landing-title--showcase">
        <span className="landing-title__row">
          <span className="landing-title__static">{before}</span>{' '}
          <span className="landing-title__rotate landing-title__rotate--css" aria-live="polite">
            <span className="landing-title__rotate-track">
              {list.map((word, index) => (
                <span
                  key={word}
                  className="landing-title__rotate-word"
                  style={{
                    animationDuration: `${list.length * 2.5}s`,
                    animationDelay: `${index * 2.5}s`,
                  }}
                >
                  {word}
                </span>
              ))}
            </span>
          </span>
        </span>
        <span className="landing-title__row landing-title__row--after">{after}</span>
      </h1>
    </div>
  );
}
