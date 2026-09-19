import random
import unicodedata

from django.db import migrations
from django.db.models import Q

# Mesmo alfabeto de authentication.services.CODIGO_CONVITE_ALFABETO — duplicado
# aqui de propósito: migrações de dados precisam ser auto-contidas e não
# depender de código de app que pode mudar no futuro.
CODIGO_CONVITE_ALFABETO = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789'


def _slugify_ascii(valor):
    """Slugify mínimo e auto-contido: minúsculas, sem acento, espaços/
    underscores viram hífen, caracteres fora de [a-z0-9-] removidos."""
    normalizado = unicodedata.normalize('NFKD', valor or '').encode('ascii', 'ignore').decode('ascii').lower()
    resultado = []
    hifen_pendente = False
    for ch in normalizado:
        if ch.isalnum():
            if hifen_pendente and resultado:
                resultado.append('-')
            resultado.append(ch)
            hifen_pendente = False
        elif ch in (' ', '-', '_'):
            hifen_pendente = True
    return ''.join(resultado)


def _prefixo_seguro(nome, tamanho=3):
    nome_ascii = unicodedata.normalize('NFKD', nome or '').encode('ascii', 'ignore').decode('ascii').upper()
    letras = [c for c in nome_ascii if c in CODIGO_CONVITE_ALFABETO]
    prefixo = ''.join(letras[:tamanho])
    while len(prefixo) < tamanho:
        prefixo += random.choice(CODIGO_CONVITE_ALFABETO)
    return prefixo


def backfill_slug_e_codigo_convite(apps, schema_editor):
    """
    Todo psicólogo cadastrado antes desta feature precisa de `slug` e
    `codigo_convite` — os dois são permanentes e usados no convite de
    divulgação aberta (SPEC_VINCULO_CONVITE_E_SOLICITACAO.md, seção 3.4).
    """
    Psicologo = apps.get_model('authentication', 'Psicologo')

    slugs_existentes = set(
        Psicologo.objects.exclude(slug__isnull=True).exclude(slug='').values_list('slug', flat=True)
    )
    codigos_existentes = set(
        Psicologo.objects.exclude(codigo_convite__isnull=True).exclude(codigo_convite='')
        .values_list('codigo_convite', flat=True)
    )

    pendentes = Psicologo.objects.select_related('user').filter(
        Q(slug__isnull=True) | Q(slug='') | Q(codigo_convite__isnull=True) | Q(codigo_convite='')
    )

    count = 0
    for psicologo in pendentes:
        nome = f'{psicologo.user.first_name} {psicologo.user.last_name}'.strip()

        if not psicologo.slug:
            base = _slugify_ascii(nome) or 'psicologo'
            slug = base
            contador = 2
            while slug in slugs_existentes:
                slug = f'{base}-{contador}'
                contador += 1
            psicologo.slug = slug
            slugs_existentes.add(slug)

        if not psicologo.codigo_convite:
            codigo = None
            for _ in range(20):
                candidato = f'{_prefixo_seguro(psicologo.user.first_name)}-' + ''.join(
                    random.choices(CODIGO_CONVITE_ALFABETO, k=4)
                )
                if candidato not in codigos_existentes:
                    codigo = candidato
                    break
            if codigo is None:
                codigo = f'PSI-{psicologo.pk:04d}'[:9]
            psicologo.codigo_convite = codigo
            codigos_existentes.add(codigo)

        psicologo.save(update_fields=['slug', 'codigo_convite'])
        count += 1

    print(f'[backfill_slug_codigo_convite] {count} psicólogo(s) atualizado(s).')


def noop_reverse(apps, schema_editor):
    pass


class Migration(migrations.Migration):

    dependencies = [
        ('authentication', '0006_psicologo_convite_e_verificacao'),
    ]

    operations = [
        migrations.RunPython(backfill_slug_e_codigo_convite, noop_reverse),
    ]
