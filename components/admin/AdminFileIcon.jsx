/**
 * Renderiza um SVG de /public/icons/ com a cor do texto (currentColor),
 * igual aos ícones inline do AdminIcon na sidebar e nos títulos de seção.
 */
export default function AdminFileIcon({ src, className = '' }) {
  if (!src) return null;
  return (
    <span
      className={`admin-file-icon ${className}`.trim()}
      style={{
        WebkitMaskImage: `url(${src})`,
        maskImage: `url(${src})`,
      }}
      aria-hidden="true"
    />
  );
}
