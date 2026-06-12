export default function LandingScene({ id, className = '', children }) {
  return (
    <section id={id} className={`landing-scene${className ? ` ${className}` : ''}`}>
      <div className="landing-scene__inner">{children}</div>
    </section>
  );
}
