-- Numeração operacional de pedidos por ciclo de caixa.
-- O contador é atômico e não reinicia à meia-noite.

CREATE SCHEMA IF NOT EXISTS nimbus_private;
REVOKE ALL ON SCHEMA nimbus_private FROM PUBLIC, anon, authenticated;

CREATE TABLE IF NOT EXISTS nimbus_private.pedido_numero_ciclos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id UUID NOT NULL REFERENCES public.empresas(id) ON DELETE CASCADE,
  caixa_turno_id UUID REFERENCES public.caixa_turnos(id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'aberto' CHECK (status IN ('aberto', 'fechado')),
  ultimo_numero INT NOT NULL DEFAULT 0 CHECK (ultimo_numero >= 0),
  aberto_em TIMESTAMPTZ NOT NULL DEFAULT now(),
  fechado_em TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_pedido_numero_ciclo_ativo_empresa
  ON nimbus_private.pedido_numero_ciclos(empresa_id)
  WHERE status = 'aberto';

CREATE INDEX IF NOT EXISTS idx_pedido_numero_ciclo_turno
  ON nimbus_private.pedido_numero_ciclos(caixa_turno_id)
  WHERE caixa_turno_id IS NOT NULL;

ALTER TABLE public.pedidos
  ADD COLUMN IF NOT EXISTS numero_ciclo_id UUID;

ALTER TABLE public.pedidos
  ADD COLUMN IF NOT EXISTS numero_operacional INT;

CREATE UNIQUE INDEX IF NOT EXISTS idx_pedidos_numero_operacional_ciclo
  ON public.pedidos(empresa_id, numero_ciclo_id, numero_operacional)
  WHERE numero_ciclo_id IS NOT NULL AND numero_operacional IS NOT NULL;

CREATE OR REPLACE FUNCTION nimbus_private.next_pedido_numero()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  ciclo nimbus_private.pedido_numero_ciclos%ROWTYPE;
BEGIN
  PERFORM pg_advisory_xact_lock(hashtextextended(NEW.empresa_id::text, 7401));

  SELECT *
    INTO ciclo
    FROM nimbus_private.pedido_numero_ciclos
   WHERE empresa_id = NEW.empresa_id
     AND status = 'aberto'
   FOR UPDATE;

  IF ciclo.id IS NULL THEN
    INSERT INTO nimbus_private.pedido_numero_ciclos (
      empresa_id,
      caixa_turno_id,
      status,
      ultimo_numero
    )
    VALUES (
      NEW.empresa_id,
      NEW.caixa_turno_id,
      'aberto',
      0
    )
    RETURNING * INTO ciclo;
  ELSIF ciclo.caixa_turno_id IS NULL AND NEW.caixa_turno_id IS NOT NULL THEN
    UPDATE nimbus_private.pedido_numero_ciclos
       SET caixa_turno_id = NEW.caixa_turno_id,
           updated_at = now()
     WHERE id = ciclo.id
    RETURNING * INTO ciclo;
  END IF;

  UPDATE nimbus_private.pedido_numero_ciclos
     SET ultimo_numero = ultimo_numero + 1,
         updated_at = now()
   WHERE id = ciclo.id
  RETURNING * INTO ciclo;

  NEW.numero_ciclo_id := ciclo.id;
  NEW.numero_operacional := ciclo.ultimo_numero;
  NEW.codigo := lpad(ciclo.ultimo_numero::text, 2, '0');
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION nimbus_private.sync_caixa_numero_ciclo()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  ciclo nimbus_private.pedido_numero_ciclos%ROWTYPE;
BEGIN
  PERFORM pg_advisory_xact_lock(hashtextextended(NEW.empresa_id::text, 7401));

  IF (TG_OP = 'INSERT' AND NEW.status = 'aberto')
     OR (TG_OP = 'UPDATE' AND OLD.status = 'fechado' AND NEW.status = 'aberto') THEN
    SELECT *
      INTO ciclo
      FROM nimbus_private.pedido_numero_ciclos
     WHERE empresa_id = NEW.empresa_id
       AND status = 'aberto'
     FOR UPDATE;

    IF ciclo.id IS NULL THEN
      IF TG_OP = 'UPDATE' THEN
        SELECT *
          INTO ciclo
          FROM nimbus_private.pedido_numero_ciclos
         WHERE empresa_id = NEW.empresa_id
           AND caixa_turno_id = NEW.id
         ORDER BY created_at DESC
         LIMIT 1
         FOR UPDATE;
      END IF;

      IF ciclo.id IS NOT NULL THEN
        UPDATE nimbus_private.pedido_numero_ciclos
           SET status = 'aberto',
               fechado_em = NULL,
               updated_at = now()
         WHERE id = ciclo.id;
      ELSE
        INSERT INTO nimbus_private.pedido_numero_ciclos (
          empresa_id,
          caixa_turno_id,
          status
        )
        VALUES (
          NEW.empresa_id,
          NEW.id,
          'aberto'
        );
      END IF;
    ELSIF ciclo.caixa_turno_id IS NULL THEN
      UPDATE nimbus_private.pedido_numero_ciclos
         SET caixa_turno_id = NEW.id,
             updated_at = now()
       WHERE id = ciclo.id;
    END IF;
  ELSIF TG_OP = 'UPDATE' AND OLD.status = 'aberto' AND NEW.status = 'fechado' THEN
    -- Encerra o ciclo ativo da loja neste fechamento (mesmo se ainda não estiver ligado ao turno).
    UPDATE nimbus_private.pedido_numero_ciclos
       SET status = 'fechado',
           fechado_em = COALESCE(NEW.fechado_em, now()),
           caixa_turno_id = COALESCE(caixa_turno_id, NEW.id),
           updated_at = now()
     WHERE empresa_id = NEW.empresa_id
       AND status = 'aberto';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_pedidos_numero_operacional ON public.pedidos;
CREATE TRIGGER trg_pedidos_numero_operacional
  BEFORE INSERT ON public.pedidos
  FOR EACH ROW
  EXECUTE FUNCTION nimbus_private.next_pedido_numero();

DROP TRIGGER IF EXISTS trg_caixa_numero_ciclo ON public.caixa_turnos;
CREATE TRIGGER trg_caixa_numero_ciclo
  AFTER INSERT OR UPDATE OF status ON public.caixa_turnos
  FOR EACH ROW
  EXECUTE FUNCTION nimbus_private.sync_caixa_numero_ciclo();

REVOKE ALL ON FUNCTION nimbus_private.next_pedido_numero() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION nimbus_private.sync_caixa_numero_ciclo() FROM PUBLIC, anon, authenticated;
