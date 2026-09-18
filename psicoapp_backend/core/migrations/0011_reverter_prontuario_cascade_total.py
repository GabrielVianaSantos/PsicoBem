import django.db.models.deletion
from django.db import migrations, models


def excluir_prontuarios_orfaos(apps, schema_editor):
    """
    Reversão de decisão (SPEC_EXCLUSAO_CONTA.md): a exclusão de conta do
    paciente volta a apagar os prontuários em cascata, igual ao psicólogo.
    Nenhum prontuário órfão existia em produção no momento desta migração,
    mas isso protege qualquer ambiente onde a exceção anterior já tenha
    rodado e deixado alguma linha com paciente_id NULL.
    """
    Prontuario = apps.get_model('core', 'Prontuario')
    Prontuario.objects.filter(paciente__isnull=True).delete()


class Migration(migrations.Migration):

    dependencies = [
        ('authentication', '0005_passwordresetcode'),
        ('core', '0010_backfill_prontuario_paciente_nome_snapshot'),
    ]

    operations = [
        migrations.RunPython(excluir_prontuarios_orfaos, migrations.RunPython.noop),
        migrations.RemoveField(
            model_name='prontuario',
            name='paciente_nome_snapshot',
        ),
        migrations.AlterField(
            model_name='prontuario',
            name='paciente',
            field=models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='prontuarios', to='authentication.paciente'),
        ),
    ]
