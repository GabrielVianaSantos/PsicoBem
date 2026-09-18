from django.db import migrations


def preencher_snapshot(apps, schema_editor):
    """
    Backfill de paciente_nome_snapshot para prontuários criados antes da
    SPEC_EXCLUSAO_CONTA.md — lê o nome enquanto o vínculo com o paciente
    ainda existe (todo prontuário pré-existente ainda tem paciente_id).
    """
    Prontuario = apps.get_model('core', 'Prontuario')
    prontuarios = (
        Prontuario.objects
        .filter(paciente_nome_snapshot='', paciente__isnull=False)
        .select_related('paciente__user')
    )
    for prontuario in prontuarios:
        nome = f"{prontuario.paciente.user.first_name} {prontuario.paciente.user.last_name}".strip()
        if nome:
            prontuario.paciente_nome_snapshot = nome
            prontuario.save(update_fields=['paciente_nome_snapshot'])


def reverter(apps, schema_editor):
    # Não há o que reverter de forma segura (perderíamos a informação de
    # quais snapshots foram preenchidos por esta migration vs. manualmente).
    pass


class Migration(migrations.Migration):

    dependencies = [
        ('core', '0009_prontuario_paciente_nome_snapshot_and_more'),
    ]

    operations = [
        migrations.RunPython(preencher_snapshot, reverter),
    ]
