'use client';

import { useCardapio } from '@/context/CardapioContext';

export default function ProfilePage() {
  const {
    page,
    profileDisplayName,
    profileDisplayPhone,
    profileName,
    setProfileName,
    profilePhone,
    setProfilePhone,
    profileImage,
    setProfileImage,
    saveProfile,
  } = useCardapio();

  function onSelectImage(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setProfileImage(String(reader.result || ''));
    reader.readAsDataURL(file);
  }

  return (
    <div id="profilePage" className={`profile-page ${page === 'profile' ? 'open' : ''}`}>
      <div className="page-wrapper profile-wrapper" style={{ maxWidth: 500 }}>
        <div className="profile-avatar-section">
          <div className={`profile-avatar-big ${profileImage ? 'has-image' : ''}`} style={profileImage ? { backgroundImage: `url(${profileImage})` } : undefined}>
            {!profileImage ? (
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <circle cx="12" cy="8" r="3.6" />
                <path d="M5.5 20a6.5 6.5 0 0 1 13 0" />
              </svg>
            ) : null}
          </div>
          <label className="btn-modal-back" style={{ display: 'inline-flex', marginTop: 10, cursor: 'pointer' }}>
            Adicionar imagem
            <input type="file" accept="image/*" style={{ display: 'none' }} onChange={onSelectImage} />
          </label>
          <div className="profile-name-display">{profileDisplayName}</div>
          <div className="profile-sub-display">{profileDisplayPhone}</div>
        </div>
        <div className="profile-form">
          <div className="profile-form-title">Dados pessoais</div>
          <div className="form-group">
            <label className="form-label">Nome completo</label>
            <input
              className="form-input"
              type="text"
              placeholder="Seu nome"
              value={profileName}
              onChange={(e) => setProfileName(e.target.value)}
            />
          </div>
          <div className="form-group">
            <label className="form-label">Telefone</label>
            <input
              className="form-input"
              type="tel"
              placeholder="(00) 00000-0000"
              value={profilePhone}
              onChange={(e) => setProfilePhone(e.target.value)}
            />
          </div>
        </div>
        <div className="profile-form">
          <div className="profile-form-title">Segurança</div>
          <div className="form-group">
            <label className="form-label">Senha atual</label>
            <input className="form-input" type="password" placeholder="••••••••" />
          </div>
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label">Nova senha</label>
            <input className="form-input" type="password" placeholder="••••••••" />
          </div>
        </div>
        <button type="button" className="btn-salvar" onClick={saveProfile}>
          Salvar alterações
        </button>
      </div>
    </div>
  );
}
