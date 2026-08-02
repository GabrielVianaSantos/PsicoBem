from django.db import migrations


def normalizar_modalidades(apps, schema_editor):
    TipoSessao = apps.get_model('sessoes', 'TipoSessao')
    for tipo_obj in TipoSessao.objects.all():
        if tipo_obj.tipo != 'presencial':
            tipo_obj.tipo = 'online'
            tipo_obj.save(update_fields=['tipo'])


def reverter_normalizacao(apps, schema_editor):
    pass


class Migration(migrations.Migration):

    dependencies = [
        ('sessoes', '0001_initial'),
    ]

    operations = [
        migrations.RunPython(normalizar_modalidades, reverse_code=reverter_normalizacao),
    ]
