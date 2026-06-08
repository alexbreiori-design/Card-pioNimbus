export default function LandingReveal({ children, className = '', delay = 0, as: Tag = 'div' }) {
  return (
    <Tag
      className={`landing-reveal${className ? ` ${className}` : ''}`}
      style={{ '--reveal-delay': `${delay}ms` }}
    >
      {children}
    </Tag>
  );
}
