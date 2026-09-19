from datetime import date

from django.db import migrations
from django.db.models import Count


def sanear_vinculos_ativos_duplicados(apps, schema_editor):
    """
    Pré-requisito do constraint 'um vínculo ativo por paciente'
    (SPEC_VINCULO_CONVITE_E_SOLICITACAO.md, seção 3.2).

    `conecta_psicologo_view` (antes desta feature) setava
    `paciente.psicologo = novo` e criava o vínculo novo sem nunca inativar
    o anterior — toda troca de profissional deixava dois vínculos `ativo`
    simultâneos para o mesmo paciente. Para cada paciente nessa situação,
    mantemos ativo apenas o vínculo de `data_vinculo` mais recente; os
    demais viram `finalizado` com `data_fim_tratamento = hoje`.

    Decisão consciente (registrada na SPEC): os psicólogos afetados não são
    notificados e nenhum prontuário é apagado — é saneamento de um estado
    inconsistente antigo, não um encerramento de tratamento iniciado por
    alguém.
    """
    VinculoPacientePsicologo = apps.get_model('core', 'VinculoPacientePsicologo')

    hoje = date.today()
    pacientes_corrigidos = 0
    vinculos_corrigidos = 0

    paciente_ids_duplicados = (
        VinculoPacientePsicologo.objects.filter(status='ativo')
        .values('paciente_id')
        .annotate(total=Count('id'))
        .filter(total__gt=1)
        .values_list('paciente_id', flat=True)
    )

    for paciente_id in paciente_ids_duplicados:
        ativos = list(
            VinculoPacientePsicologo.objects.filter(
                paciente_id=paciente_id, status='ativo'
            ).order_by('-data_vinculo', '-id')
        )
        # O primeiro (data_vinculo mais recente) permanece ativo; os demais
        # são finalizados.
        for vinculo in ativos[1:]:
            vinculo.status = 'finalizado'
            vinculo.data_fim_tratamento = hoje
            vinculo.save(update_fields=['status', 'data_fim_tratamento'])
            vinculos_corrigidos += 1
        pacientes_corrigidos += 1

    print(
        f'[saneamento_vinculos] {vinculos_corrigidos} vínculo(s) duplicado(s) '
        f'finalizado(s) em {pacientes_corrigidos} paciente(s).'
    )


def noop_reverse(apps, schema_editor):
    """
    Não há como reverter com segurança: não sabemos quais vínculos
    finalizados por esta migração estavam ativos antes dela rodar.
    Reverse explicitamente documentado como no-op.
    """
    pass


class Migration(migrations.Migration):

    dependencies = [
        ('core', '0011_reverter_prontuario_cascade_total'),
    ]

    operations = [
        migrations.RunPython(sanear_vinculos_ativos_duplicados, noop_reverse),
    ]
