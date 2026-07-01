'use client';

import { V2Icon } from './CardapioV2Icons';

export function StarRatingDisplay({ value, size = 'md', className = '' }) {
  const rounded = Math.round(Number(value) || 0);
  return (
    <span
      className={`cardapio-v2-reviews-stars cardapio-v2-reviews-stars--${size} ${className}`.trim()}
      aria-hidden="true"
    >
      {[1, 2, 3, 4, 5].map((star) => (
        <V2Icon
          key={star}
          name="star"
          fill={star <= rounded}
          className={star <= rounded ? 'is-filled' : 'is-empty'}
        />
      ))}
    </span>
  );
}

export function StarRatingInput({ value = 0, onChange, disabled = false }) {
  return (
    <div className="cardapio-v2-reviews-star-input" role="group" aria-label="Selecione sua nota">
      {[1, 2, 3, 4, 5].map((star) => {
        const active = star <= value;
        return (
          <button
            key={star}
            type="button"
            className={`cardapio-v2-reviews-star-input-btn${active ? ' is-active' : ''}`}
            onClick={() => onChange?.(star)}
            disabled={disabled}
            aria-label={`${star} ${star === 1 ? 'estrela' : 'estrelas'}`}
            aria-pressed={active}
          >
            <V2Icon name="star" fill={active} className={active ? 'is-filled' : 'is-empty'} />
          </button>
        );
      })}
    </div>
  );
}
